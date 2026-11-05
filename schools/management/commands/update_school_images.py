import json
import re

from django.core.management.base import BaseCommand
from django.db import transaction

from schools.models import School, SchoolPhoto


def norm(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


class Command(BaseCommand):
    help = "Cloudinary image links se school ki cover / logo / gallery badalta hai"

    def add_arguments(self, parser):
        parser.add_argument("json_path")
        parser.add_argument("--state", default="Telangana")
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument(
            "--clear-missing", action="store_true",
            help="Jin schools ki nayi cover nahi mili, unki purani image / logo / gallery hata do",
        )

    def handle(self, *args, **o):
        data = json.load(open(o["json_path"], encoding="utf-8"))
        lookup = {}
        for folder, d in data.items():
            lookup.setdefault(norm(folder), []).append((folder, d))

        # School.name ke hisaab se group (ek hi naam ke do school ho sakte hain)
        schools = list(School.objects.filter(state__iexact=o["state"]))
        by_name = {}
        for s in schools:
            by_name.setdefault(norm(s.name), []).append(s)

        updated = skipped = cleared = 0
        used = set()
        for s in schools:
            key = norm(s.name)
            matches = lookup.get(key)
            if not matches:
                # lamba naam: folder ka naam 80 akshar par kata hota hai
                matches = [m for k, v in lookup.items() if len(k) >= 60 and key.startswith(k) for m in v]
            d = None
            if matches and len(by_name.get(key, [])) == 1 and len(matches) == 1:
                d = matches[0][1]
                used.add(matches[0][0])
            elif matches:
                self.stdout.write(f"AMBIGUOUS (check manually): {s.name} / {s.city}")

            if d and d.get("cover"):
                self.stdout.write(f"UPDATE: {s.name} | gallery {len(d.get('gallery', []))}")
                if not o["dry_run"]:
                    with transaction.atomic():
                        s.image = d["cover"]
                        s.cover_image = ""          # file hatao, taaki URL use ho
                        if d.get("logo"):
                            s.logo_url = d["logo"]
                        gal = d.get("gallery", [])
                        s.gallery = gal
                        s.photos = len(gal)
                        s.save()
                        # sirf URL wali purani photos hatao; admin se upload ki hui file photos rahengi
                        s.photo_items.filter(image="").delete()
                        SchoolPhoto.objects.bulk_create(
                            [SchoolPhoto(school=s, image_url=u, order=i) for i, u in enumerate(gal)]
                        )
                updated += 1
            else:
                skipped += 1
                self.stdout.write(f"NO NEW IMAGE: {s.name} / {s.city}")
                if o["clear_missing"]:
                    cleared += 1
                    if not o["dry_run"]:
                        with transaction.atomic():
                            s.image = ""
                            s.cover_image = ""
                            s.logo_url = ""
                            s.gallery = []
                            s.photos = 0
                            s.save()
                            s.photo_items.filter(image="").delete()

        for folder in data:
            if folder not in used and data[folder].get("cover"):
                self.stdout.write(f"FOLDER is could: {folder}")
        self.stdout.write(f"updated {updated}, no new image {skipped}, cleared {cleared}")