import os, csv, sys
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from schools.models import School

args = [a for a in sys.argv[1:] if not a.startswith("--")]
path = args[0] if args else "media_fixed.csv"
APPLY = "--apply" in sys.argv

with open(path, encoding="utf-8-sig") as fh:
    rows = list(csv.DictReader(fh))

ok = bad = 0
for r in rows:
    name = (r.get("school_name") or "").strip()
    city = (r.get("city") or "").strip()
    url = (r.get("url") or "").strip()
    if not name or not url:
        continue
    qs = School.objects.filter(name__iexact=name, city__iexact=city)
    if qs.count() != 1:
        print(f"NOT FOUND/MULTIPLE ({qs.count()}): {name} | {city}")
        bad += 1
        continue
    print(f"{'SET' if APPLY else 'WILL SET'} | {name} ({city})")
    if APPLY:
        qs.update(image=url)
    ok += 1

print(f"\n{'Applied' if APPLY else 'Dry run'}: {ok} ok, {bad} problem")
if not APPLY:
    print("Kuch save nahi hua. Sahi lage to: python apply_edited_csv.py media_fixed.csv --apply")