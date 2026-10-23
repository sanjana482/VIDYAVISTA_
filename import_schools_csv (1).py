"""Import VidyaVista school records from CSV.
Run from the backend folder with .venv active:
  python import_schools_csv.py vidyavista_100_schools_review.csv --dry-run
  python import_schools_csv.py vidyavista_100_schools_review.csv

The supplied review CSV keeps is_active=False until details are verified.
fee=0/rating=0.0 mean unknown, not free/zero-star. Image URLs are blank intentionally.
"""
import argparse, csv, os, sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()
from django.db import transaction
from schools.models import School

REQUIRED = {
    "name","area","city","state","board","grades","type","gender","fee",
    "rating","reviews","photos","facilities","phone","image","top_rated","is_active"
}
def as_bool(v):
    return str(v or "").strip().lower() in {"1","true","yes","y"}
def intval(v):
    return int(str(v or "0").strip() or "0")
def floatval(v):
    return float(str(v or "0").strip() or "0")

def main():
    p = argparse.ArgumentParser()
    p.add_argument("csv_file")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()
    path = Path(args.csv_file).resolve()
    if not path.is_file():
        raise SystemExit(f"CSV file not found: {path}")
    added = skipped = failed = 0
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        missing = REQUIRED - set(reader.fieldnames or [])
        if missing:
            raise SystemExit("Missing CSV columns: " + ", ".join(sorted(missing)))
        for n, row in enumerate(reader, start=2):
            try:
                name, city = (row.get("name") or "").strip(), (row.get("city") or "").strip()
                if not name or not city:
                    raise ValueError("name and city are required")
                defaults = {
                    "area": (row.get("area") or "").strip(),
                    "state": (row.get("state") or "").strip(),
                    "board": (row.get("board") or "").strip(),
                    "grades": (row.get("grades") or "").strip(),
                    "type": (row.get("type") or "").strip(),
                    "gender": (row.get("gender") or "").strip(),
                    "fee": intval(row.get("fee")), "rating": floatval(row.get("rating")),
                    "reviews": intval(row.get("reviews")), "photos": intval(row.get("photos")),
                    "facilities": [x.strip() for x in (row.get("facilities") or "").split("|") if x.strip()],
                    "phone": (row.get("phone") or "").strip(),
                    "image": (row.get("image") or "").strip(),
                    "top_rated": as_bool(row.get("top_rated")),
                    "is_active": as_bool(row.get("is_active")),
                }
                if args.dry_run:
                    added += 1
                    continue
                with transaction.atomic():
                    _, created = School.objects.get_or_create(name=name, city=city, defaults=defaults)
                if created: added += 1
                else: skipped += 1
            except Exception as e:
                failed += 1
                print(f"Row {n} failed: {e}")
    if args.dry_run:
        print(f"Dry run complete. Valid rows: {added}; failed: {failed}. No database changes made.")
    else:
        print(f"Import complete. Added: {added}; skipped existing: {skipped}; failed: {failed}.")
        print(f"Total schools in database: {School.objects.count()}")
if __name__ == "__main__":
    main()
