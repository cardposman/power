import argparse
import json
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.nodes = []
        self.stack = []
        self.ids = {}
        self.title = []
        self.text = {}
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        self.nodes.append((tag, attrs))
        if "id" in attrs:
            if attrs["id"] in self.ids:
                raise AssertionError(f"Duplicate id {attrs['id']} in {self.path}")
            self.ids[attrs["id"]] = attrs
            self.text[attrs["id"]] = []
        if tag not in VOID:
            self.stack.append((tag, attrs.get("id")))

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        if any(tag == "title" for tag, _ in self.stack):
            self.title.append(data)
        for _, identifier in self.stack:
            if identifier:
                self.text[identifier].append(data)

    def select(self, tag, attr=None):
        return [attrs for node_tag, attrs in self.nodes if node_tag == tag and (attr is None or attr in attrs)]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", type=Path, default=ROOT)
    args = parser.parse_args()
    directory = args.directory.resolve()
    manifest_path = directory / "data" / "generated-pages.json"
    if not manifest_path.is_file():
        manifest_path = ROOT / "data" / "generated-pages.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    mode = manifest["mode"]
    assert mode in {"source", "deployment"}, mode
    deployment = mode == "deployment"
    cache = {}

    def load(path):
        if path not in cache:
            cache[path] = Page(path)
        return cache[path]

    titles = set()
    thumbnails = Counter()
    station_thumbnails = Counter()
    station_ids = set()
    station_source = json.loads((ROOT / "data" / "stations.json").read_text(encoding="utf-8"))
    stations_by_id = {station["id"]: station for station in station_source["stations"]}
    checked_links = 0
    canonical_files = {entry["file"] for entry in manifest["pages"]}
    canonical_urls = {entry["url"] for entry in manifest["pages"]}
    assert len(canonical_files) == len(canonical_urls) == 500
    for entry in manifest["pages"]:
        assert entry["file"] == entry["deployFile" if deployment else "sourceFile"], entry
        path = directory / entry["file"]
        page = load(path)
        title = "".join(page.title)
        assert title == entry["title"], path
        assert title not in titles, f"Duplicate page title: {title}"
        titles.add(title)
        assert "{{" not in path.read_text(encoding="utf-8"), path
        assert not [attrs for attrs in page.select("input") if attrs.get("type") == "search"], path
        assert not page.select("input", "data-region-search"), path
        assert not [attrs for attrs in page.select("script") if attrs.get("src", "").endswith("js/regions.js")], path
        assert "역별 상담" not in [text.strip() for text in page.text["main-nav"]], path
        expected_robots = "noindex,nofollow" if not manifest["origin"] else "index,follow"
        robots = next(attrs["content"] for attrs in page.select("meta") if attrs.get("name") == "robots")
        assert robots == expected_robots, path
        canonical = [attrs["href"] for attrs in page.select("link") if attrs.get("rel") == "canonical"]
        expected_url = manifest["origin"] + manifest["basePath"] + entry["url"]
        assert canonical == ([expected_url] if manifest["origin"] else []), path
        if manifest["origin"]:
            assert next(attrs["content"] for attrs in page.select("meta") if attrs.get("property") == "og:url") == expected_url, path
        if entry["kind"] == "home":
            assert "홍은동" not in path.read_text(encoding="utf-8"), path
            assert "TS재팬" not in path.read_text(encoding="utf-8"), path
            assert "맨투맨 일본어과외" in "".join(page.text["hero-title"]), path
            assert not entry["schools"], path
        if entry["kind"] == "district":
            assert entry["sourceFile"].startswith("region/") and entry["sourceFile"].count("/") == 3, path
            assert entry["deployFile"].startswith("reg-") and entry["deployFile"].count("/") == 1, path
            assert len(entry["schools"]) == 5, path
            paragraph = "".join(page.text["local-guide"])
            assert len(set(entry["schools"])) == 5, path
            assert paragraph.count("·".join(entry["schools"])) == 1, path
            assert "홍은동" not in "".join(page.text["hero-title"]) + paragraph, path
            assert entry["label"] in "".join(page.text["hero-title"]), path
            thumbnail = next(attrs for attrs in page.select("img") if "data-regional-thumbnail" in attrs)
            assert thumbnail["src"].endswith(f"thumbnail-{entry['thumbnail']}.webp"), path
            assert thumbnail.get("loading") == "eager", path
            thumbnails[entry["thumbnail"]] += 1
        if entry["kind"] == "station":
            assert entry["sourceFile"].startswith("station/") and entry["sourceFile"].count("/") == 3, path
            assert entry["deployFile"].startswith("st-") and entry["deployFile"].count("/") == 1, path
            station = stations_by_id[entry["stationId"]]
            assert entry["stationId"] not in station_ids, path
            station_ids.add(entry["stationId"])
            assert entry["regionSlug"] == station["regionSlug"], path
            assert entry["guide"] == station["guide"], path
            assert entry["screeningDecision"] == station["screeningDecision"], path
            assert not entry["schools"], path
            assert entry["variant"] is None, path
            assert entry["label"] in "".join(page.text["hero-title"]), path
            assert "역역" not in entry["label"], path
            assert title == f"{entry['label']} 맨투맨 일본어회화 일대일 과외수업 | TS재팬", path
            assert "해당 역 주변의 오프라인 교실 안내가 아닙니다." in "".join(page.text["main"]), path
            paragraph = "".join(page.text["local-guide"])
            assert "학년" not in paragraph and "학교 일정" not in paragraph, path
            assert paragraph.count(entry["label"]) == 1, path
            assert len([attrs for attrs in page.select("div", "class") if attrs["class"] == "station-guide"]) == 1, path
            thumbnail = next(attrs for attrs in page.select("img") if "data-regional-thumbnail" in attrs)
            assert thumbnail["src"].endswith(f"thumbnail-{entry['thumbnail']}.webp"), path
            station_thumbnails[entry["thumbnail"]] += 1
        if entry["kind"] in {"station-directory", "station-province", "directory", "province"}:
            expected_count = entry.get("stationCount", entry.get("districtCount"))
            assert len(page.select("li", "data-region-item")) == expected_count, path
        for tag, attrs in page.nodes:
            for attribute in ("src", "href"):
                value = attrs.get(attribute)
                if not value:
                    continue
                parts = urlsplit(value)
                if parts.scheme or parts.netloc:
                    if tag == "a" and parts.scheme in {"http", "https"}:
                        assert value == "https://naver.me/52c74Jj4", (path, value)
                        assert attrs.get("target") == "_blank" and "noopener" in attrs.get("rel", ""), path
                    continue
                target = (path.parent / unquote(parts.path)).resolve() if parts.path else path
                target.relative_to(directory)
                if target.is_dir():
                    target /= "index.html"
                assert target.is_file(), f"Missing link or asset: {path} -> {value}"
                if tag == "a" and target.suffix == ".html":
                    assert target.relative_to(directory).as_posix() in canonical_files, f"Internal link still points to a legacy route: {path} -> {value}"
                if parts.fragment:
                    assert parts.fragment in load(target).ids, f"Missing fragment: {path} -> {value}"
                checked_links += 1
    redirects = manifest["redirects"]
    expected_redirects = 469 if deployment else 0
    assert len(redirects) == manifest["redirectCount"] == expected_redirects
    assert len({entry["file"] for entry in redirects}) == expected_redirects
    assert len({entry["targetFile"] for entry in redirects}) == expected_redirects
    for entry in redirects:
        path = directory / entry["file"]
        page = load(path)
        assert entry["file"] not in canonical_files, path
        assert entry["targetFile"] in canonical_files, path
        assert entry["targetUrl"] in canonical_urls, path
        link = next(attrs for attrs in page.select("a") if "data-redirect-target" in attrs)
        target = (path.parent / link["href"]).resolve()
        assert target == (directory / entry["targetFile"]).resolve(), path
        assert target.is_file(), path
        assert next(attrs["content"] for attrs in page.select("meta") if attrs.get("name") == "robots") == "noindex,follow", path
        canonical = [attrs["href"] for attrs in page.select("link") if attrs.get("rel") == "canonical"]
        expected_url = manifest["origin"] + manifest["basePath"] + entry["targetUrl"]
        assert canonical == ([expected_url] if manifest["origin"] else []), path
        script = next(attrs for attrs in page.select("script"))
        assert (path.parent / script["src"]).resolve().is_file(), path
    assert (directory / ".nojekyll").is_file()
    for filename in manifest["publicFiles"]:
        assert Path(filename).name == filename, filename
        assert (directory / filename).is_file(), filename
        if filename.startswith("naver"):
            expected = f"naver-site-verification: {filename}"
            assert (directory / filename).read_text(encoding="utf-8").strip() == expected, filename
            assert (directory / filename).read_bytes() == (ROOT / filename).read_bytes(), filename
    sitemap = ElementTree.parse(directory / "sitemap.xml")
    locations = [node.text for node in sitemap.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
    expected_locations = [manifest["origin"] + manifest["basePath"] + entry["url"] for entry in manifest["pages"]] if manifest["origin"] else []
    assert locations == expected_locations, "Sitemap must list canonical pages only"
    robots = (directory / "robots.txt").read_text(encoding="utf-8")
    if manifest["origin"]:
        assert "Disallow: /" not in robots
        assert "Allow: /" in robots
        assert f"Sitemap: {manifest['origin']}{manifest['basePath']}/sitemap.xml" in robots
        assert (directory / "CNAME").read_text(encoding="utf-8").strip() == urlsplit(manifest["origin"]).hostname
    else:
        assert "Disallow: /" in robots
    assert len(thumbnails) == 4
    assert len(station_thumbnails) == 4
    assert station_ids == set(range(1, 201))
    assert manifest["stationCount"] == 200
    assert manifest["stationGroupCount"] == 12
    assert manifest["districtCount"] == 269
    actual_region_pages = list((directory / "region").rglob("index.html"))
    assert len(actual_region_pages) == 286
    assert len(list((directory / "station").rglob("index.html"))) == 213
    assert len(manifest["pages"]) == 500
    assert len(list(directory.glob("reg-*/index.html"))) == (269 if deployment else 0)
    assert len(list(directory.glob("st-*/index.html"))) == (200 if deployment else 0)
    print(json.dumps({"mode": mode, "directory": str(directory), "htmlPages": len(manifest["pages"]), "legacyRedirects": len(redirects), "districtPages": 269, "stationPages": len(station_ids), "stationDirectories": 13, "schoolsPerDistrict": 5, "linksAndAssetsChecked": checked_links, "thumbnails": dict(thumbnails), "stationThumbnails": dict(station_thumbnails), "brokenLinks": 0}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
