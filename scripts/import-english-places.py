"""Build offline place references from official legal-code, railway and school data."""
import argparse
import csv
import hashlib
import io
import json
import math
import re
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]


def xlsx_rows(filename):
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    with ZipFile(filename) as archive:
        strings = ["".join(node.itertext()) for node in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("m:si", ns)]
        result = []
        for row in ET.fromstring(archive.read("xl/worksheets/sheet1.xml")).findall("m:sheetData/m:row", ns)[1:]:
            item = {}
            for cell in row.findall("m:c", ns):
                value = cell.findtext("m:v", "", ns)
                item[re.sub(r"\d", "", cell.attrib["r"])] = strings[int(value)] if cell.get("t") == "s" else value
            result.append(item)
        return result


def normalize_name(name):
    return re.sub(r"[·ㆍ.\s]", "", re.sub(r"역$", "", re.sub(r"\([^)]*\)", "", name)))


def distance(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2-p1)/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(math.radians(lon2-lon1)/2)**2
    return 6371 * 2 * math.asin(min(1, math.sqrt(a)))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--legal-zip", type=Path, required=True)
    parser.add_argument("--stations-xlsx", type=Path, required=True)
    parser.add_argument("--schools-csv", type=Path, required=True)
    parser.add_argument("--rail-legacy", type=Path, required=True)
    args = parser.parse_args()
    with ZipFile(args.legal_zip) as archive:
        raw = archive.read(archive.namelist()[0]).decode("cp949")
    legal = {row["법정동코드"]: row["법정동명"] for row in csv.DictReader(io.StringIO(raw), delimiter="\t") if row["폐지여부"] == "존재"}
    legal = {code: name.strip() for code, name in legal.items()}
    areas = {code: name for code, name in legal.items() if code.endswith("00") and not code.endswith("00000")}
    area_by_name = {name: code for code, name in areas.items()}
    area_by_suffix = defaultdict(list)
    for code, name in areas.items():
        area_by_suffix[(code[:2], name.split()[-1])].append(code)

    aliases = {"서울": "서울특별시", "부산": "부산광역시", "대구": "대구광역시", "인천": "인천광역시", "대전": "대전광역시", "울산": "울산광역시", "경기": "경기도", "경남": "경상남도", "경북": "경상북도", "충남": "충청남도", "충북": "충청북도", "강원": "강원특별자치도", "강원도": "강원특별자치도", "전라북도": "전북특별자치도", "전북": "전북특별자치도", "전라남도": "전남광주통합특별시", "전남": "전남광주통합특별시", "광주": "전남광주통합특별시", "광주광역시": "전남광주통합특별시"}
    province_codes = {name: code[:2] for code, name in legal.items() if code.endswith("00000000")}

    def canonical_address(address, operator=""):
        address = " ".join(address.split())
        if "대전" in operator and not address.startswith("대전"):
            address = "대전광역시 " + address
        if address.startswith("춘천시 "):
            address = "강원특별자치도 " + address
        tokens = address.split()
        if tokens:
            if tokens[0] == '서울시':
                tokens[0] = '서울특별시'
            for city in ['부산', '대구', '인천', '대전', '울산']:
                if tokens[0] == city + '시':
                    tokens[0] = city + '광역시'
            tokens[0] = aliases.get(tokens[0], tokens[0])
        return " ".join(tokens)

    points = []
    unmatched_schools = 0
    with args.schools_csv.open(encoding="utf-8-sig", newline="") as handle:
        for school in csv.DictReader(handle):
            if school["운영상태"] != "운영":
                continue
            address = canonical_address(school["소재지지번주소"])
            code = None
            for count in [4, 3]:
                code = area_by_name.get(" ".join(address.split()[:count]))
                if code:
                    break
            if not code and address:
                province = province_codes.get(address.split()[0])
                tokens = address.split()
                for count in [3, 2]:
                    if len(tokens) > count:
                        matches = area_by_suffix.get((province, tokens[count]), [])
                        if len(matches) == 1:
                            code = matches[0]
                            break
            try:
                lat, lon = float(school["위도"]), float(school["경도"])
                if not (32 < lat < 39 and 124 < lon < 132) or not code:
                    raise ValueError()
            except ValueError:
                unmatched_schools += 1
                continue
            points.append({"code": code, "lat": lat, "lon": lon, "referenceId": school["학교ID"]})

    districts = json.loads((ROOT / "data/official-sigungu.json").read_text(encoding="utf-8"))["districts"]
    sample = json.loads((ROOT / "data/english.json").read_text(encoding="utf-8"))
    district_refs = {}
    for district in districts:
        full = district["officialName"].strip()
        assert legal[district["code"]] == full, full
        candidates = [(code, name) for code, name in areas.items() if name.startswith(full + " ")]
        counts = defaultdict(int)
        for point in points:
            counts[point["code"]] += 1
        candidates.sort(key=lambda item: (-counts[item[0]], item[0]))
        # Broad reference coverage based on public address records, not search demand.
        selected = []
        for candidate in candidates:
            if candidate[1].split()[-1] not in [name.split()[-1] for _, name in selected]:
                selected.append(candidate)
            if len(selected) == 3:
                break
        if district["pathCode"] == sample["sampleDistrictCode"]:
            selected = [(next(code for code, name in candidates if name.split()[-1] == short), full + " " + short) for short in sample["sampleNeighborhoods"]]
        if len(selected) < 2:
            raise ValueError(f"Insufficient legal areas: {full}")
        district_refs[district["pathCode"]] = {"officialCode": district["code"], "officialName": full, "availableAreas": len(candidates), "neighborhoods": [{"code": code, "name": name.split()[-1], "fullName": name} for code, name in selected]}

    rows = xlsx_rows(args.stations_xlsx)
    legacy = json.loads(args.rail_legacy.read_text(encoding="utf-8"))
    stations = json.loads((ROOT / "data/stations.json").read_text(encoding="utf-8"))["stations"]
    station_refs, discrepancies = {}, []
    for station in stations:
        province = aliases.get(station["regionLabel"], station["regionLabel"])
        matches = [row for row in rows if normalize_name(row.get("E", "")) == normalize_name(station["name"]) and canonical_address(row.get("V") or row.get("U", ""), row.get("A", "")).startswith(province)]
        if not matches:
            raise ValueError(f"Unmatched station: {station['id']} {station['name']}")
        matches.sort(key=lambda row: (station["representativeLine"] not in row.get("B", ""), row.get("D", "")))
        row = matches[0]
        lat, lon = float(row["T"]), float(row["S"])
        coordinate_source = 'rail'
        source_coordinate = {'latitude': lat, 'longitude': lon}
        address = canonical_address(row.get("V") or row.get("U", ""), row.get("A", ""))
        old = [item for item in legacy if normalize_name(item["STATN_NM"]) == normalize_name(station["name"]) and canonical_address(item.get("RDNMADR", "")).startswith(province)]
        if old:
            distances = [distance(lat, lon, float(item["LATITUDE"]), float(item["LONGITUDE"])) for item in old if item.get("LATITUDE") and item.get("LONGITUDE")]
            if distances and min(distances) > .8:
                discrepancies.append({"id": station["id"], "name": station["name"], "differenceKm": round(min(distances), 3), "address": address})
                # Preserve the discrepancy and use the separate national-standard
                # reference for approximate place selection, never for navigation.
                if station['id'] != 191:
                    reference = old[0]
                    lat, lon = float(reference['LATITUDE']), float(reference['LONGITUDE'])
                    coordinate_source = 'railNationalStandard'
                discrepancies[-1]['selectedSource'] = coordinate_source
                discrepancies[-1]['resolution'] = 'Approximate reference uses national standard for discrepant coordinates; Namgwangju retains current coordinate at Hak-dong. Not suitable for navigation.'
        nearest = {}
        for point in points:
            if not areas[point["code"]].startswith(province + " "):
                continue
            km = distance(lat, lon, point["lat"], point["lon"])
            if point["code"] not in nearest or km < nearest[point["code"]][0]:
                nearest[point["code"]] = (km, point)
        selected = []
        for item in sorted(nearest.items(), key=lambda item: item[1][0]):
            if areas[item[0]].split()[-1] not in [areas[code].split()[-1] for code, _ in selected]:
                selected.append(item)
            if len(selected) == 3:
                break
        if len(selected) != 3 or selected[-1][1][0] > 8:
            raise ValueError(f"Station area review needed: {station['name']} {selected}")
        station_refs[str(station["id"])] = {"name": station["name"], "operator": row.get("A", ""), "sourceLine": row.get("B", ""), "sourceStationCode": row.get("D", ""), "address": address, "latitude": lat, "longitude": lon, "dataDate": row.get("AB", ""), "neighborhoods": [{"code": code, "name": areas[code].split()[-1], "fullName": areas[code], "referenceDistanceKm": round(km, 3), "referencePoint": point} for code, (km, point) in selected]}

        station_refs[str(station['id'])]['coordinateSource'] = coordinate_source
        station_refs[str(station['id'])]['originalCoordinate'] = source_coordinate

    sources = {
        "railNationalStandard": {"url": "https://www.data.go.kr/data/15013205/standard.do", "sha256": hashlib.sha256(args.rail_legacy.read_bytes()).hexdigest()},
        "legal": {"url": "https://www.code.go.kr/stdcode/regCodeL.do", "downloadUrl": "https://www.code.go.kr/etc/codeFullDown.do", "sha256": hashlib.sha256(args.legal_zip.read_bytes()).hexdigest()},
        "rail": {"url": "https://data.kric.go.kr/rips/M_01_01/detail.do?id=1294", "downloadUrl": "https://data.kric.go.kr/rips/dataset/download.file?type=filedata&id=1294&operation=1", "sha256": hashlib.sha256(args.stations_xlsx.read_bytes()).hexdigest()},
        "schoolAddressPoints": {"url": "https://schoolzone.emac.kr/publicData/publicDataList.do", "dataDate": "2026-03-20", "sha256": hashlib.sha256(args.schools_csv.read_bytes()).hexdigest(), "matchedPoints": len(points), "skippedRows": unmatched_schools}
    }
    output = {"verifiedAt": "2026-11-09", "sources": sources, "selectionPolicy": {"district": "Three current legal eup/myeon/dong examples selected by public school address record counts; Yongsan preserves the approved three names. Not a population or search-demand ranking.", "station": "Three nearest distinct legal areas using school address reference points and official station coordinates within the same province. Straight-line reference distances are not walking distances or administrative boundaries."}, "districts": district_refs, "stations": station_refs, "crossSourceCoordinateReviews": discrepancies}
    (ROOT / "data/english-places.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "data/english-area-codes.json").write_text(json.dumps({"source": sources["legal"], "areas": areas}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"districts": len(district_refs), "stations": len(station_refs), "points": len(points), "coordinateReviews": discrepancies}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
