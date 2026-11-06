import csv

with open("media_image_matches.csv", encoding="utf-8-sig") as fh:
    rows = list(csv.DictReader(fh))

low = [r for r in rows if float(r["score"]) < 0.95]
low.sort(key=lambda r: (r["school_name"], -float(r["score"])))

with open("media_review.csv", "w", newline="", encoding="utf-8-sig") as fh:
    w = csv.writer(fh)
    w.writerow(["school_name", "city", "url", "score", "cloudinary_file"])
    for r in low:
        w.writerow([r["school_name"], r["city"], r["url"], r["score"], r["cloudinary_file"]])
print("Done:", len(low), "rows -> media_review.csv")