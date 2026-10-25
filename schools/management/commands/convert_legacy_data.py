"""
Purane data ko naye format me badalta hai. Migrate ke baad EK BAAR chalao (dobara chalane se koi nuksan nahi):

    python manage.py convert_legacy_data

- phone: "+91 98765 43210" -> "9876543210"; "A / B" me doosra number landline me
- grades "Nursery – Class 12" -> grade_from / grade_to dropdown
- JSON highlights / faqs / gallery -> naye inline rows (admin me edit ho sakte hain)
- profile JSON ke established / students / campus -> naye fields
"""
import re

from django.core.management.base import BaseCommand

from schools.models import GRADE_CHOICES, School, SchoolFAQ, SchoolHighlight, SchoolPhoto

VALID = {g for g, _ in GRADE_CHOICES}
ALIAS = {'KG': 'LKG', 'PRE-NURSERY': 'Toddler', 'PLAYGROUP': 'Toddler', 'NURSERY': 'Nursery', 'TODDLER': 'Toddler',
         'LKG': 'LKG', 'UKG': 'UKG'}


def norm_grade(raw):
    t = re.sub(r'\b(grade|std|standard)\b', 'class', (raw or '').strip(), flags=re.I).strip()
    if t.upper() in ALIAS:
        return ALIAS[t.upper()]
    m = re.search(r'(\d{1,2})', t)
    if m and 1 <= int(m.group(1)) <= 12:
        return f'Class {int(m.group(1))}'
    return t if t in VALID else ''


def split_phone(raw):
    parts = [re.sub(r'\D', '', p) for p in re.split(r'/|,|;|\bor\b', raw or '')]
    parts = [p for p in parts if p]
    mobile = landline = ''
    for p in parts:
        if len(p) > 10 and p.startswith('91'):
            p = p[2:]
        if len(p) == 11 and p.startswith('0') and p[1] in '6789':
            p = p[1:]
        if len(p) == 10 and p[0] in '6789' and not mobile:
            mobile = p
        elif 6 <= len(p) <= 13 and not landline:
            landline = p
    return mobile, landline


class Command(BaseCommand):
    help = 'Convert old JSON / text data to the new admin fields'

    def handle(self, *args, **opts):
        n = 0
        for s in School.objects.all():
            changed = []
            mobile, landline = split_phone(s.phone)
            if (mobile or landline) and s.phone != mobile:
                s.phone = mobile
                changed.append('phone')
            if landline and not s.landline:
                s.landline = landline
                changed.append('landline')
            if s.grades and not (s.grade_from and s.grade_to):
                parts = [p for p in re.split(r'\s*(?:–|—|-|\bto\b)\s*', s.grades) if p]
                if parts:
                    a, b = norm_grade(parts[0]), norm_grade(parts[-1])
                    if a and b:
                        s.grade_from, s.grade_to = a, b
                        changed.append('grades')
            p = s.profile or {}
            if not s.established and str(p.get('established', '')).isdigit():
                s.established = int(p['established']); changed.append('established')
            if not s.students and str(p.get('students', '')).isdigit():
                s.students = int(p['students']); changed.append('students')
            if not s.campus and p.get('campus'):
                s.campus = str(p['campus'])[:80]; changed.append('campus')
            if not s.address and p.get('address'):
                s.address = str(p['address'])[:400]; changed.append('address')
            if not s.email and p.get('email'):
                s.email = str(p['email']); changed.append('email')
            if not s.website and str(p.get('website', '')).startswith('http'):
                s.website = str(p['website']); changed.append('website')
            if changed:
                s.save()
            if not s.highlight_items.exists():
                for i, t in enumerate(s.highlights or []):
                    SchoolHighlight.objects.create(school=s, text=str(t)[:300], order=i)
            if not s.faq_items.exists():
                for i, f in enumerate(s.faqs or []):
                    if isinstance(f, dict) and f.get('q'):
                        SchoolFAQ.objects.create(school=s, question=f['q'][:300], answer=f.get('a', ''), order=i)
            if not s.photo_items.exists():
                for i, u in enumerate(s.gallery or []):
                    if isinstance(u, str) and u:
                        SchoolPhoto.objects.create(school=s, image_url=u[:1000], order=i)
            s.ensure_locations()  # city + state -> Location pages
            n += 1
        self.stdout.write(self.style.SUCCESS(f'{n} schools converted'))
