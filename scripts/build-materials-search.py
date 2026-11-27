"""Generate the public catalogue search index from the published HTML."""

import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import urlsplit


class Catalogue(HTMLParser):
    def __init__(self):
        super().__init__()
        self.entries = []
        self.card = None
        self.title = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "article" and "card" in attrs.get("class", "").split():
            self.card = {"path": None, "text": [], "aliases": attrs.get("data-search-aliases", "")}
        if self.card is not None:
            if tag == "h3" and self.title is None:
                self.title = []
            if tag == "a" and "data-material-id" in attrs and self.card["path"] is None:
                self.card["path"] = attrs.get("href")

    def handle_data(self, text):
        if self.card is not None:
            self.card["text"].append(text)
        if self.title is not None:
            self.title.append(text)

    def handle_endtag(self, tag):
        if tag == "h3" and self.title is not None:
            self.card["title"] = " ".join(" ".join(self.title).split())
            self.title = None
        if tag == "article" and self.card is not None:
            self.entries.append(self.card)
            self.card = None


class LessonHeadings(HTMLParser):
    tags = {"h1", "h2", "h3"}

    def __init__(self):
        super().__init__()
        self.headings = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        if tag in self.tags:
            self.current = []

    def handle_data(self, text):
        if self.current is not None:
            self.current.append(text)

    def handle_endtag(self, tag):
        if tag in self.tags and self.current is not None:
            heading = " ".join(" ".join(self.current).split())
            if heading:
                self.headings.append(heading)
            self.current = None


def build(root):
    catalogue = Catalogue()
    catalogue.feed((root / "materials/all/index.html").read_text(encoding="utf-8"))
    if not catalogue.entries:
        raise ValueError("No material cards were found")

    entries = []
    for card in catalogue.entries:
        path = card["path"] or ""
        if not path.startswith("/materials/") or not path.endswith("/") or urlsplit(path).path != path:
            raise ValueError(f"Invalid lesson URL: {path!r}")
        page = (root / path.lstrip("/") / "index.html").resolve()
        if not page.is_relative_to(root / "materials"):
            raise ValueError(f"Lesson URL points outside the materials directory: {path}")
        lesson = LessonHeadings()
        lesson.feed(page.read_text(encoding="utf-8"))
        search_text = " ".join([*card["text"], *lesson.headings, card["aliases"]])
        entries.append({"path": path, "title": card["title"], "searchText": " ".join(search_text.split())})

    output = root / "assets/materials-search-index.json"
    output.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Indexed {len(entries)} materials")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site", nargs="?", type=Path, default=Path(__file__).resolve().parents[1])
    build(parser.parse_args().site.resolve())
