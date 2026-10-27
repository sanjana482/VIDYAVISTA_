"""
Bulk school import (CSV sheet -> School + gallery photos + class-wise fees).

Used by:
  * the React admin panel  ->  POST /api/admin/schools/import
  * Django admin           ->  Schools > "Import CSV" button
  * command line           ->  python import_schools_csv.py file.csv

The sheet format is the one in `vidyavista_schools_template.csv`.
Only `name` and `city` are compulsory; every other column is optional.
`source_site` / `source_url` columns (if present) are ALWAYS ignored - they are never saved or shown.
"""
import csv
import io
import json
import re
from datetime import date

from django.db import transaction

from .models import FeeComponent, School, SchoolPhoto, GRADE_CHOICES

# columns that must never be stored or displayed
IGNORED_COLUMNS = {'source_site', 'source_url'}

GRADE_ORDER = [g for g, _ in GRADE_CHOICES]

BOARD_ALIASES = {
    'cbse': 'CBSE', 'icse': 'ICSE', 'cisce': 'ICSE', 'isc': 'ICSE', 'ib': 'IB', 'ibo': 'IB',
    'cambridge': 'Cambridge', 'igcse': 'Cambridge', 'caie': 'Cambridge', 'cie': 'Cambridge',
    'state board': 'State Board', 'state': 'State Board', 'nios': 'NIOS', 'no board': 'No Board',
}

# header spellings -> our field names
HEADER_ALIASES = {
    'school name': 'name', 'school': 'name', 'town': 'city', 'board': 'boards', 'school type': 'type',
    'grades': 'classes', 'class': 'classes', 'mobile': 'phone', 'phone number': 'phone', 'image': 'images',
    'photo': 'images', 'photos': 'images', 'logo url': 'logo', 'top rated': 'top_rated', 'toprated': 'top_rated',
    'active': 'is_active', 'isactive': 'is_active', 'live': 'is_active', 'established': 'founded',
    'students': 'student_count', 'teachers': 'teacher_count',
}

FEE_RE = re.compile(r'^(toddler|nursery|lkg|ukg|(?:class\s*)?\d{1,2})\s*[-–:]\s*(monthly|annual|annually|one[\s-]?time|first[\s-]?year)$', re.I)


# ------------------------------------------------------------------ small helpers (pure python)
def _s(v):
    return ('' if v is None else str(v)).strip()


def _bool(v, default=False):
    v = _s(v).lower()
    if not v:
        return default
    return v in {'1', 'true', 'yes', 'y', 't'}


def _int(v):
    v = re.sub(r'[,\s₹]', '', _s(v))
    if not v:
        return None
    try:
        n = int(float(v))
    except ValueError:
        return None
    return n if n >= 0 else None


def _float(v):
    try:
        return float(_s(v))
    except ValueError:
        return None


def norm_header(h):
    h = _s(h).lstrip('\ufeff').lower().replace('_', ' ')
    h = re.sub(r'\s+', ' ', h)
    return h


def canon_header(h):
    """'Class 5 - annual' stays as is (fee column); 'School Name' -> 'name'; 'top_rated' -> 'top_rated'."""
    n = norm_header(h)
    if FEE_RE.match(n):
        return n
    n = HEADER_ALIASES.get(n, n)
    return n.replace(' ', '_')


def grade_token(tok):
    t = _s(tok).lower().replace('class', '').strip(' .')
    if t in {'toddler', 'playgroup', 'play group', 'pre-nursery', 'pre nursery', 'prenursery'}:
        return 'Toddler'
    if t == 'nursery':
        return 'Nursery'
    if t in {'lkg', 'ukg'}:
        return t.upper()
    if t == 'kg':
        return 'LKG'
    if t.isdigit() and 1 <= int(t) <= 12:
        return f'Class {int(t)}'
    roman = {'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10, 'xi': 11, 'xii': 12}
    if t in roman:
        return f'Class {roman[t]}'
    return None


def parse_classes(raw):
    """'5 - 12' / 'Nursery - 12' / 'LKG - Class 10'  ->  ('Class 5', 'Class 12') ; unknown -> ('', '')"""
    parts = [p for p in re.split(r'\s*(?:-|–|—|\bto\b)\s*', _s(raw), maxsplit=1) if p]
    if len(parts) == 2:
        a, b = grade_token(parts[0]), grade_token(parts[1])
        if a and b and GRADE_ORDER.index(a) <= GRADE_ORDER.index(b):
            return a, b
    elif len(parts) == 1:
        a = grade_token(parts[0])
        if a:
            return a, a
    return '', ''


def parse_boards(raw):
    """'CBSE, Cambridge' -> ('CBSE', 'Cambridge')"""
    found, unknown = [], []
    for part in re.split(r'[,/&|;]| and ', _s(raw), flags=re.I):
        key = part.strip().lower()
        if not key:
            continue
        canon = BOARD_ALIASES.get(key)
        if canon:
            if canon not in found:
                found.append(canon)
        else:
            unknown.append(part.strip())
    if found:
        return found[0], ', '.join(found[1:] + unknown)
    return 'No Board', ', '.join(unknown)


def parse_type(raw, boarding_type):
    t = _s(raw).lower()
    if 'board' in t or (not t and _s(boarding_type)):
        return 'Boarding School'
    if 'play' in t or 'pre' in t:
        return 'Play School'
    return 'Day'


def parse_gender(raw):
    t = _s(raw).lower().replace(' ', '')
    if t.startswith('girl'):
        return 'Girls'
    if t.startswith('boy'):
        return 'Boys'
    return 'Co-ed'


def parse_phones(raw):
    """Return (mobile10, landline). '+91-9954620600' -> ('9954620600', '')"""
    mobile, landline = '', ''
    for chunk in re.split(r'[,/;|]| or ', _s(raw)):
        d = re.sub(r'\D', '', chunk)
        if len(d) == 12 and d.startswith('91'):
            d = d[2:]
        if len(d) == 11 and d.startswith('0') and d[1] in '6789':
            d = d[1:]
        if len(d) == 10 and d[0] in '6789':
            mobile = mobile or d
        elif 6 <= len(d) <= 13 and d and not landline:
            landline = d
    return mobile, landline


def norm_session(raw):
    m = re.search(r'(\d{4})\s*[-–/]\s*(\d{2,4})', _s(raw))
    return f'{m.group(1)}-{m.group(2)[-2:]}' if m else _s(raw)[:10]


def split_urls(raw):
    return [u.strip() for u in re.split(r',\s*(?=https?://)|\n|\|', _s(raw)) if u.strip().lower().startswith('http')]


def clean_url(u, limit=300):
    u = _s(u)
    if not u:
        return ''
    if not re.match(r'^https?://', u, re.I):
        u = 'https://' + u
    return u if len(u) <= limit else ''


def parse_social(raw):
    out = {'youtube_url': '', 'facebook_url': '', 'instagram_url': '', 'x_url': '', 'linkedin_url': '', 'other_url': ''}
    raw = _s(raw)
    if not raw:
        return out
    try:
        data = json.loads(raw)
    except ValueError:
        data = {}
    if isinstance(data, dict):
        for k, v in data.items():
            link = clean_url(v if isinstance(v, str) else '')
            if not link:
                continue
            k = str(k).lower()
            field = ('youtube_url' if 'youtube' in k else 'facebook_url' if 'facebook' in k or k == 'fb' else
                     'instagram_url' if 'insta' in k else 'x_url' if k in {'x', 'twitter'} else
                     'linkedin_url' if 'linkedin' in k else 'other_url')
            out[field] = out[field] or link
    return out


def parse_fees(row):
    """row (canonical headers) -> [{'class_name', 'name', 'frequency', 'amount'}].  'first year' is a total, so it is skipped."""
    out = []
    for key, val in row.items():
        m = FEE_RE.match(key)
        if not m:
            continue
        amount = _int(val)
        if not amount:
            continue
        cls = grade_token(m.group(1))
        kind = re.sub(r'[\s-]', '', m.group(2).lower())
        if kind.startswith('first') or not cls:
            continue
        name, freq = {
            'monthly': ('Tuition fee (monthly)', 'Monthly'),
            'annual': ('Annual fee', 'Annually'),
            'annually': ('Annual fee', 'Annually'),
            'onetime': ('One-time fee (admission etc.)', 'One-time'),
        }[kind]
        out.append({'class_name': cls, 'name': name, 'frequency': freq, 'amount': amount})
    out.sort(key=lambda f: (GRADE_ORDER.index(f['class_name']), f['frequency']))
    return out


def clean_row(raw_row):
    """Re-key a raw CSV row with canonical headers and drop the ignored columns."""
    row = {}
    for k, v in (raw_row or {}).items():
        if k is None:
            continue
        key = canon_header(k)
        if key in IGNORED_COLUMNS:
            continue
        row[key] = v
    return row


def parse_row(raw_row):
    """Pure function. Returns (data_dict, errors_list). `data_dict` has School field values + 'photos_list' + 'fees'."""
    row = clean_row(raw_row)
    errors = []
    name, city = _s(row.get('name')), _s(row.get('city'))
    if not name:
        errors.append('name is empty')
    if not city:
        errors.append('city is empty')
    if errors:
        return None, errors

    board, extra_boards = parse_boards(row.get('boards'))
    boarding_type = _s(row.get('boarding_type'))[:40]
    grade_from, grade_to = parse_classes(row.get('classes'))
    mobile, landline = parse_phones(row.get('phone'))
    state = _s(row.get('state'))
    area = _s(row.get('area')) or _s(row.get('locality')) or city
    images = split_urls(row.get('images'))
    images = [u for u in images if len(u) <= 1000]
    pincode = re.sub(r'\D', '', _s(row.get('pincode')))[:10]
    if pincode and len(set(pincode)) == 1:      # 999999 / 000000 = placeholder, not a real pincode
        pincode = ''
    founded = _int(row.get('founded'))
    email = _s(row.get('email'))
    page_date = None
    try:
        page_date = date.fromisoformat(_s(row.get('page_last_updated'))[:10]) if _s(row.get('page_last_updated')) else None
    except ValueError:
        page_date = None
    fac_groups = {}
    try:
        fg = json.loads(_s(row.get('facility_groups')) or '{}')
        fac_groups = fg if isinstance(fg, dict) else {}
    except ValueError:
        pass
    facilities = [f.strip() for f in re.split(r'[,|]', _s(row.get('facilities'))) if f.strip()]
    about = _s(row.get('about')) or _s(row.get('description'))
    rating = _float(row.get('rating'))
    fee_min, fee_max = _int(row.get('fee_min')) or 0, _int(row.get('fee_max')) or 0
    if not fee_min and not fee_max:
        fee_min = fee_max = _int(row.get('fee')) or 0
    if fee_min and fee_max and fee_max < fee_min:
        fee_min, fee_max = fee_max, fee_min

    data = {
        'name': name[:240], 'city': city[:120], 'state': state[:120], 'area': area[:180],
        'locality': _s(row.get('locality'))[:180], 'pincode': pincode,
        'address': _s(row.get('address'))[:400],
        'board': board, 'extra_boards': extra_boards[:120],
        'type': parse_type(row.get('type'), boarding_type), 'boarding_type': boarding_type,
        'gender': parse_gender(row.get('gender')),
        'grade_from': grade_from, 'grade_to': grade_to, 'grades_raw': _s(row.get('classes'))[:80],
        'medium': _s(row.get('medium'))[:80], 'academic_session': _s(row.get('academic_session'))[:60],
        'student_teacher_ratio': _s(row.get('student_teacher_ratio'))[:20],
        'campus': _s(row.get('campus_size'))[:80],
        'established': founded if founded and 1800 <= founded <= 2100 else None,
        'feeMin': fee_min, 'feeMax': fee_max,
        'latest_fee_session': norm_session(row.get('latest_fee_session')),
        'current_admission_session': norm_session(row.get('current_admission_session')),
        'lat': _float(row.get('lat')), 'lng': _float(row.get('lng')),
        'phone': mobile, 'landline': landline,
        'email': email if '@' in email and len(email) <= 254 else '',
        'website': clean_url(row.get('website')),
        'logo_url': clean_url(row.get('logo'), 1000),
        'facilities': facilities, 'facility_groups': fac_groups,
        'hostel': _bool(row.get('hostel')), 'verified': _bool(row.get('verified')),
        'languages': _s(row.get('languages'))[:200], 'food_options': _s(row.get('food_options'))[:200],
        'affiliation_no': _s(row.get('affiliation_no'))[:60], 'school_timing': _s(row.get('school_timing'))[:80],
        'students': _int(row.get('student_count')), 'teachers': _int(row.get('teacher_count')),
        'page_last_updated': page_date,
        'about': about,
        'isActive': _bool(row.get('is_active'), default=True),
        'topRated': _bool(row.get('top_rated')),
        'image': images[0] if images else '',
        'photos': len(images),
        'photos_list': images[1:],
        'rating': rating if rating is not None and 0 <= rating <= 5 else 0,
        'review_count': _int(row.get('reviews')) or 0,
        'fees': parse_fees(row),
    }
    data.update(parse_social(row.get('social')))
    return data, []


# ------------------------------------------------------------------ database part
def save_school(data):
    """Create one school (+ gallery photos + fee rows). Returns the School."""
    d = dict(data)
    photos_list = d.pop('photos_list')
    fees = d.pop('fees')
    rating = d.pop('rating')
    review_count = d.pop('review_count')
    grades_raw = d.pop('grades_raw')
    fee_session = d.get('latest_fee_session') or ''

    with transaction.atomic():
        school = School(**d)
        if not (school.grade_from and school.grade_to):
            school.grade_from = school.grade_to = ''
        school.save()
        if not school.grades and grades_raw:           # classes text we could not understand: keep it as typed
            School.objects.filter(pk=school.pk).update(grades=grades_raw)
        if rating or review_count:                      # rating/reviews are read-only fields, so set them directly
            School.objects.filter(pk=school.pk).update(rating=rating, reviews=review_count)
        SchoolPhoto.objects.bulk_create(
            [SchoolPhoto(school=school, image_url=u, order=i) for i, u in enumerate(photos_list)])
        FeeComponent.objects.bulk_create(
            [FeeComponent(school=school, session=fee_session or '2027-28', **f) for f in fees])
        if fee_session:
            School.objects.filter(pk=school.pk).update(feeUpdated=fee_session)
    return school


def import_rows(rows, max_rows=500):
    """rows: list of dicts (CSV rows). Returns {'created': n, 'skipped': [...], 'errors': [...]}  (row numbers start at 2)."""
    result = {'created': 0, 'skipped': [], 'errors': []}
    seen = set()
    for i, raw in enumerate(rows[:max_rows], start=2):
        data, errs = parse_row(raw)
        if errs:
            result['errors'].append({'row': i, 'message': '; '.join(errs)})
            continue
        key = (data['name'].lower(), data['city'].lower())
        if key in seen or School.objects.filter(name__iexact=data['name'], city__iexact=data['city']).exists():
            result['skipped'].append({'row': i, 'message': f"{data['name']} ({data['city']}) already exists"})
            continue
        try:
            save_school(data)
            seen.add(key)
            result['created'] += 1
        except Exception as exc:  # one bad row must not stop the rest
            result['errors'].append({'row': i, 'message': f'could not save: {exc}'})
    if len(rows) > max_rows:
        result['errors'].append({'row': max_rows + 2, 'message': f'only the first {max_rows} rows are imported at a time'})
    return result


def import_csv_text(text, max_rows=500):
    reader = csv.DictReader(io.StringIO(text.lstrip('\ufeff')))
    return import_rows(list(reader), max_rows=max_rows)


# ------------------------------------------------------------------ template
TEMPLATE_COLUMNS = [
    'name', 'type', 'boarding_type', 'city', 'state', 'area', 'locality', 'pincode', 'boards', 'classes', 'gender',
    'medium', 'academic_session', 'student_teacher_ratio', 'campus_size', 'founded', 'fee_min', 'fee_max',
    'latest_fee_session', 'current_admission_session', 'address', 'lat', 'lng', 'phone', 'email', 'website', 'social',
    'logo', 'images', 'facilities', 'facility_groups', 'hostel', 'languages', 'food_options', 'verified',
    'page_last_updated', 'affiliation_no', 'school_timing', 'student_count', 'teacher_count', 'rating', 'reviews',
    'description', 'about',
] + [f'{c} - {k}' for c in ['LKG', 'UKG'] + [f'Class {n}' for n in range(1, 13)]
     for k in ('monthly', 'annual', 'one-time', 'first year')]
