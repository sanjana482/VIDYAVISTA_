import os, csv
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from schools.models import School

# media_image_matches.csv se har school ka best suggestion (agar file hai)
sugg = {}
if os.path.exists("media_image_matches.csv"):
    with open("media_image_matches.csv", encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            sid = int(r["school_id"])
            if sid not in sugg or float(r["score"]) > float(sugg[sid]["score"]):
                sugg[sid] = r

rows = []
qs = School.objects.exclude(image__contains="res.cloudinary.com").order_by("state", "name")
for s in qs:
    r = sugg.get(s.id)
    rows.append([s.name, s.city, "", r["url"] if r else "", r["score"] if r else ""])

with open("manual_images.csv", "w", newline="", encoding="utf-8-sig") as fh:
    w = csv.writer(fh)
    w.writerow(["school_name", "city", "url", "suggested_url", "suggested_score"])
    w.writerows(rows)
print("Done:", len(rows), "schools -> manual_images.csv")