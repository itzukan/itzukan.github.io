"""Produce the public free-lesson ranking from a single GA4 report."""

import argparse
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen


class Catalogue(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids_by_path = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a" and attrs.get("data-click-location") in {"material_card", "card_primary"}:
            path = attrs.get("href", "")
            material = attrs.get("data-material-id")
            if path.startswith("/materials/") and path.endswith("/") and material:
                self.ids_by_path[path] = material


def fetch_report(property_id, token, paths):
    if not property_id.isdecimal():
        raise ValueError("GA4_PROPERTY_ID must be a numeric property ID")
    request = Request(
        f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport",
        data=json.dumps({
            "dateRanges": [{"startDate": "30daysAgo", "endDate": "yesterday"}],
            "dimensions": [{"name": "pagePath"}],
            "metrics": [{"name": "activeUsers"}],
            "dimensionFilter": {"andGroup": {"expressions": [
                {"filter": {"fieldName": "hostName", "stringFilter": {
                    "matchType": "EXACT", "value": "free.itzukan.com"
                }}},
                {"filter": {"fieldName": "pagePath", "inListFilter": {
                    "values": sorted(paths), "caseSensitive": True
                }}},
            ]}},
            "limit": len(paths),
        }).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def make_ranking(report, ids_by_path, now):
    counts = {}
    for row in report.get("rows", []):
        path = row["dimensionValues"][0]["value"]
        users = int(row["metricValues"][0]["value"])
        if path in ids_by_path and users >= 3:
            counts[ids_by_path[path]] = users
    ordered = sorted(counts, key=lambda material: (-counts[material], material))
    popular = []
    previous_count = None
    rank = 0
    for index, material in enumerate(ordered[:3], start=1):
        if counts[material] != previous_count:
            rank = index
            previous_count = counts[material]
        popular.append({"id": material, "rank": rank})
    return {"generatedAt": now.isoformat(timespec="seconds"), "popular": popular}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--report", type=Path, help="Read a saved GA4 response for local verification")
    args = parser.parse_args()
    site = Path(__file__).resolve().parents[1]
    catalogue = Catalogue()
    catalogue.feed((site / "materials/index.html").read_text(encoding="utf-8"))
    if not catalogue.ids_by_path:
        raise ValueError("No published material cards found")
    if args.report:
        report = json.loads(args.report.read_text(encoding="utf-8"))
    else:
        report = fetch_report(os.environ["GA4_PROPERTY_ID"], os.environ["GA4_ACCESS_TOKEN"], catalogue.ids_by_path)
    ranking = make_ranking(report, catalogue.ids_by_path, datetime.now(timezone.utc))
    args.output.write_text(json.dumps(ranking, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated ranking for {len(ranking['popular'])} materials")


if __name__ == "__main__":
    main()
