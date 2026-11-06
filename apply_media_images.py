import os, csv, sys
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from schools.models import School

APPLY = "--apply" in sys.argv
OVERWRITE = "--overwrite" in sys.argv

with open("media_image_matches.csv", encoding="utf-8-sig") as fh:
    rows = list(csv.DictReader(fh))

best = {}
for r in rows:
    if r["status"] != "OK" or float(r["score"]) < 0.95:
        continue
    sid = int(r["school_id"])
    if sid not in best or float(r["score"]) > float(best[sid]["score"]):
        best[sid] = r

changed = skipped = 0
for sid, r in best.items():
    s = School.objects.filter(id=sid).first()
    if not s:
        continue
    if "res.cloudinary.com" in (s.image or "") and not OVERWRITE:
        skipped += 1
        continue
    print(f"{'SET' if APPLY else 'WILL SET'} | {s.name} ({s.city}) <- {r['cloudinary_file'].split('/')[-1]}")
    if APPLY:
        School.objects.filter(id=sid).update(image=r["url"])
    changed += 1
print(f"\n{'Applied' if APPLY else 'Dry run'}: {changed} schools; skipped (already Cloudinary): {skipped}")