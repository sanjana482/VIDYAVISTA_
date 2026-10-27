"""
Import schools from a CSV file (same format as the admin panel "Import" page).

Run from the backend folder with the virtual environment active:
    python import_schools_csv.py my_schools.csv

- Only `name` and `city` columns are compulsory.
- `source_site` / `source_url` columns are ignored (never saved).
- A school with the same name + city is skipped (no duplicates).
"""
import os
import sys
from pathlib import Path

import django

sys.path.insert(0, str(Path(__file__).resolve().parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from schools.importer import import_csv_text  # noqa: E402
from schools.models import School  # noqa: E402


def main():
    if len(sys.argv) < 2:
        print("Usage: python import_schools_csv.py <csv-file>")
        raise SystemExit(1)
    path = Path(sys.argv[1]).resolve()
    if not path.is_file():
        print(f"CSV file not found: {path}")
        raise SystemExit(1)

    result = import_csv_text(path.read_text(encoding="utf-8-sig"), max_rows=100000)
    for item in result["errors"]:
        print(f"Row {item['row']} failed: {item['message']}")
    for item in result["skipped"]:
        print(f"Row {item['row']} skipped: {item['message']}")
    print(f"Import complete. Added: {result['created']}; skipped: {len(result['skipped'])}; failed: {len(result['errors'])}")
    print(f"Total schools in database: {School.objects.count()}")


if __name__ == "__main__":
    main()
