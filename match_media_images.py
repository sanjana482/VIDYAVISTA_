import os, re, csv, difflib
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

import cloudinary.api
from schools.models import School

def norm(s):
    s = re.sub(r"[_\-]+", " ", s.lower())
    return re.sub(r"[^a-z0-9 ]", "", s).strip()

schools = [(s.id, s.name, s.city, s.image or "") for s in School.objects.all()]
names = [(i, n, c, img, norm(n)) for i, n, c, img in schools]

files, cursor = [], None
while True:
    r = cloudinary.api.resources(type="upload", prefix="media/schools/cover/",
                                 max_results=500, next_cursor=cursor)
    files += r["resources"]
    cursor = r.get("next_cursor")
    if not cursor:
        break

rows = []
for f in files:
    base = f["public_id"].split("/")[-1]
    base = re.sub(r"_[a-z0-9]{6}$", "", base)   # random suffix hatao
    key = norm(base)
    best = max(names, key=lambda x: difflib.SequenceMatcher(None, key, x[4]).ratio())
    score = difflib.SequenceMatcher(None, key, best[4]).ratio()
    rows.append([f["public_id"], f["secure_url"], best[0], best[1], best[2],
                 round(score, 2), "OK" if score >= 0.85 else "CHECK",
                 "yes" if "res.cloudinary.com" in best[3] else "no"])

rows.sort(key=lambda r: r[5])
with open("media_image_matches.csv", "w", newline="", encoding="utf-8-sig") as fh:
    w = csv.writer(fh)
    w.writerow(["cloudinary_file", "url", "school_id", "school_name", "city",
                "score", "status", "school_already_has_cloudinary_image"])
    w.writerows(rows)
print("Done:", len(rows), "images ->", "media_image_matches.csv")