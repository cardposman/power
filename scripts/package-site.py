from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist-netlify"
ARCHIVE = ROOT / "dist-netlify.zip"


def main():
    if not (DIST / "region" / "index.html").is_file():
        raise RuntimeError("Build the site before packaging it.")
    paths = sorted(path for path in DIST.rglob("*") if path.is_file())
    with ZipFile(ARCHIVE, "w", compression=ZIP_DEFLATED, compresslevel=6) as archive:
        for path in paths:
            archive.write(path, path.relative_to(DIST).as_posix())
    with ZipFile(ARCHIVE) as archive:
        if archive.testzip() is not None:
            raise RuntimeError("ZIP integrity verification failed.")
        if set(archive.namelist()) != {path.relative_to(DIST).as_posix() for path in paths}:
            raise RuntimeError("ZIP file list does not match the distribution directory.")
    print(f"Packaged {len(paths)} files: {ARCHIVE.name} ({ARCHIVE.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
