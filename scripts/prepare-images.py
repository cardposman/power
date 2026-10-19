from pathlib import Path
from zipfile import ZipFile

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Preserve source PNGs and prepare web images.")
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()
    originals = ROOT / "assets" / "originals"
    images = ROOT / "assets" / "images"
    originals.mkdir(parents=True, exist_ok=True)
    images.mkdir(parents=True, exist_ok=True)
    names = {f"썸네일{i}.png": f"thumbnail-{i}" for i in range(1, 5)}
    names["파워본문1.png"] = "product-detail"
    found = set()
    with ZipFile(args.archive, metadata_encoding="cp949") as archive:
        for entry in archive.infolist():
            name = Path(entry.filename).name
            if name not in names:
                continue
            stem = names[name]
            source = originals / f"{stem}.png"
            source.write_bytes(archive.read(entry))
            with Image.open(source) as image:
                target = images / f"{stem}.webp"
                image.convert("RGB").save(target, "WEBP", quality=88, method=6)
                print(f"{stem}: {image.width}x{image.height}, {source.stat().st_size:,} -> {target.stat().st_size:,} bytes")
            found.add(name)
    missing = names.keys() - found
    if missing:
        raise RuntimeError(f"Missing images: {sorted(missing)}")


if __name__ == "__main__":
    main()
