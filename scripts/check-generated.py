import argparse
import json
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


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
    manifest = json.loads((ROOT / "data" / "generated-pages.json").read_text(encoding="utf-8"))
    cache = {}

    def load(path):
        if path not in cache:
            cache[path] = Page(path)
        return cache[path]

    titles = set()
    thumbnails = Counter()
    checked_links = 0
    for entry in manifest["pages"]:
        path = directory / entry["file"]
        page = load(path)
        title = "".join(page.title)
        assert title == entry["title"], path
        assert title not in titles, f"Duplicate page title: {title}"
        titles.add(title)
        assert "{{" not in path.read_text(encoding="utf-8"), path
        expected_robots = "noindex,nofollow" if entry["kind"] == "sample" or not manifest["origin"] else "index,follow"
        robots = next(attrs["content"] for attrs in page.select("meta") if attrs.get("name") == "robots")
        assert robots == expected_robots, path
        if entry["kind"] == "district":
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
                if parts.fragment:
                    assert parts.fragment in load(target).ids, f"Missing fragment: {path} -> {value}"
                checked_links += 1
    assert len(thumbnails) == 4
    assert manifest["districtCount"] == 269
    actual_region_pages = list((directory / "region").rglob("index.html"))
    assert len(actual_region_pages) == 286
    print(json.dumps({"directory": str(directory), "htmlPages": len(manifest["pages"]), "districtPages": 269, "schoolsPerDistrict": 5, "linksAndAssetsChecked": checked_links, "thumbnails": dict(thumbnails), "brokenLinks": 0}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
