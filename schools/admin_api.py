"""
API for the React (Next.js) admin panel  ->  /api/admin/...

Same URLs / JSON shapes the panel was written for, now backed by Django.
Login = any Django user with "Staff status" ticked (create one with `python manage.py createsuperuser`).
"""
import csv
import re
from datetime import timedelta

from django.contrib.auth import authenticate, get_user_model
from django.core.files.storage import default_storage
from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework_simplejwt.tokens import AccessToken

from . import importer
from .models import (
    BOARDS, Enquiry, FeeComponent, LocationFAQ, LocationPage, School, SchoolFAQ, SchoolHighlight, SchoolPhoto,
)
from .serializers import file_or_url

ADMIN = [IsAdminUser]
TYPE_TO_DB = {'Day School': 'Day', 'Boarding School': 'Boarding School', 'Play School': 'Play School'}
TYPE_TO_UI = {v: k for k, v in TYPE_TO_DB.items()}
BOARD_VALUES = [b for b, _ in BOARDS]


def bad(message, status=400, errors=None):
    return Response({'message': message, 'errors': errors or {}}, status=status)


def _page(request, default_limit=10, max_limit=100):
    try:
        limit = max(1, min(int(request.query_params.get('limit', default_limit)), max_limit))
        page = max(1, int(request.query_params.get('page', 1)))
    except ValueError:
        limit, page = default_limit, 1
    return page, limit


def _meta(total, page, limit):
    return {'total': total, 'page': page, 'limit': limit, 'pages': max(1, -(-total // limit))}


# ------------------------------------------------------------------ auth
def _admin_json(u):
    return {
        '_id': str(u.pk), 'name': (u.get_full_name() or u.username), 'email': u.email or u.username,
        'role': 'superadmin' if u.is_superuser else 'admin',
        'lastLoginAt': u.last_login.isoformat() if u.last_login else None,
    }


def _token(user):
    t = AccessToken.for_user(user)
    t.set_exp(lifetime=timedelta(hours=12))   # admin panel session: 12 hours
    return str(t)


class LoginThrottle(SimpleRateThrottle):
    """Max 10 login tries per minute from one IP (rate set in settings: admin_login)."""
    scope = 'admin_login'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def login(request):
    ident = (request.data.get('email') or request.data.get('username') or '').strip()
    password = request.data.get('password') or ''
    User = get_user_model()
    user = User.objects.filter(email__iexact=ident).first() if '@' in ident else User.objects.filter(username__iexact=ident).first()
    user = authenticate(request, username=user.get_username(), password=password) if user else None
    if not user or not user.is_staff:
        return bad('Wrong email or password', 401)
    from django.contrib.auth.models import update_last_login
    update_last_login(None, user)
    return Response({'token': _token(user), 'admin': _admin_json(user)})


@api_view(['GET'])
@permission_classes(ADMIN)
def me(request):
    return Response({'admin': _admin_json(request.user)})


@api_view(['POST'])
@permission_classes(ADMIN)
def change_password(request):
    cur, new = request.data.get('currentPassword') or '', request.data.get('newPassword') or ''
    if not request.user.check_password(cur):
        return bad('Current password is wrong', 400, {'currentPassword': 'Current password is wrong'})
    if len(new) < 8 or not re.search(r'[A-Za-z]', new) or not re.search(r'\d', new):
        return bad('New password is too weak', 400, {'newPassword': 'At least 8 characters, with letters and numbers'})
    request.user.set_password(new)
    request.user.save()
    return Response({'token': _token(request.user)})


# ------------------------------------------------------------------ schools: JSON <-> model
def _grades_text(s):
    return s.grades or ''


def _phone(s):
    return s.phone or s.landline or ''


def school_json(s, request=None):
    prof = dict(s.profile or {})
    prof.update({k: v for k, v in {
        'established': s.established, 'students': s.students, 'teachers': s.teachers, 'campus': s.campus,
        'address': s.address, 'email': s.email, 'website': s.website,
    }.items() if v not in (None, '')})
    ratio = re.match(r'\s*(\d+)', s.student_teacher_ratio or '')
    if ratio and 'ratio' not in prof:
        prof['ratio'] = int(ratio.group(1))
    slabs = {}
    for c in s.fee_components.all():
        slabs.setdefault((c.session, c.class_name or 'All classes'), []).append(
            {'label': c.name, 'freq': c.frequency, 'amount': c.amount})
    fee_slabs = [{'session': a, 'cls': b, 'rows': rows} for (a, b), rows in slabs.items()] or (s.feeSlabs or [])
    gallery = [u for u in (file_or_url(request, p.image, p.image_url) for p in s.photo_items.all()) if u]
    return {
        '_id': str(s.school_id), 'schoolId': s.school_id, 'slug': s.slug, 'name': s.name, 'area': s.area,
        'city': s.city, 'state': s.state, 'board': s.board, 'grades': _grades_text(s),
        'type': TYPE_TO_UI.get(s.type, s.type), 'gender': s.gender, 'rating': float(s.rating), 'reviews': s.reviews,
        'fee': s.fee, 'facilities': s.facilities or [], 'photos': s.photos, 'topRated': s.topRated,
        'phone': _phone(s), 'image': file_or_url(request, s.cover_image, s.image), 'isActive': s.isActive,
        'createdAt': s.created_at.isoformat(), 'updatedAt': s.updated_at.isoformat(),
        'about': s.about,
        'highlights': [h.text for h in s.highlight_items.all()] or (s.highlights or []),
        'faqs': [{'q': f.question, 'a': f.answer} for f in s.faq_items.all()] or (s.faqs or []),
        'gallery': gallery or (s.gallery or []),
        'feeSlabs': fee_slabs, 'feeNote': s.feeNote, 'feeUpdated': s.feeUpdated, 'profile': prof,
    }


def _qs():
    return School.objects.prefetch_related('fee_components', 'highlight_items', 'faq_items', 'photo_items')


def _intval(v):
    try:
        return int(float(str(v).replace(',', '').strip()))
    except (TypeError, ValueError):
        return None


def apply_payload(s, d):
    """Copy the React form data onto a School (validated first by `validate_payload`)."""
    s.name, s.area, s.city, s.state = d['name'].strip(), d['area'].strip(), d['city'].strip(), (d.get('state') or '').strip()
    s.board = d.get('board') or s.board or 'CBSE'
    s.type = TYPE_TO_DB.get(d.get('type'), d.get('type') or s.type or 'Day')
    s.gender = d.get('gender') or s.gender or 'Co-ed'
    s.facilities = [str(x).strip() for x in (d.get('facilities') or []) if str(x).strip()][:30]
    s.topRated, s.isActive = bool(d.get('topRated')), bool(d.get('isActive', True))
    s.about = d.get('about') or ''
    s.feeNote, s.feeUpdated = d.get('feeNote') or '', (d.get('feeUpdated') or '')[:40]
    s.photos = _intval(d.get('photos')) or 0

    fee = _intval(d.get('fee')) or 0
    if fee != (s.feeMin or s.fee):
        s.feeMin = fee
        s.feeMax = max(s.feeMax or 0, fee)

    a, b = importer.parse_classes(d.get('grades'))
    s.grade_from, s.grade_to = a, b

    mobile, landline = importer.parse_phones(d.get('phone'))
    s.phone, s.landline = mobile, landline

    image = (d.get('image') or '').strip()
    if image != (s.image or ''):
        s.image = image[:1000]
        s.cover_image = ''     # a link typed/uploaded here must win over an old uploaded file

    p = d.get('profile') or {}
    est, stu = _intval(p.get('established')), _intval(p.get('students'))
    s.established = est if est and 1800 <= est <= 2100 else None
    s.students = stu
    s.campus = (p.get('campus') or '')[:80]
    s.address = (p.get('address') or '')[:400]
    s.email = (p.get('email') or '')[:254]
    s.website = importer.clean_url(p.get('website'))
    prof = dict(s.profile or {})
    for k in ('established', 'students', 'teachers', 'campus', 'address', 'email', 'website'):
        prof.pop(k, None)            # these live in real columns now
    for k in ('ratio', 'admissionStatus', 'admissionSummary', 'documents'):
        if str(p.get(k) or '').strip():
            prof[k] = p[k]
        else:
            prof.pop(k, None)
    s.profile = prof


def apply_children(s, d, grades_raw):
    if 'highlights' in d:
        s.highlight_items.all().delete()
        SchoolHighlight.objects.bulk_create(
            [SchoolHighlight(school=s, text=str(t).strip()[:300], order=i) for i, t in enumerate(d['highlights'] or []) if str(t).strip()])
    if 'faqs' in d:
        s.faq_items.all().delete()
        SchoolFAQ.objects.bulk_create(
            [SchoolFAQ(school=s, question=str(f.get('q', '')).strip()[:300], answer=str(f.get('a', '')).strip(), order=i)
             for i, f in enumerate(d['faqs'] or []) if str(f.get('q', '')).strip() and str(f.get('a', '')).strip()])
    if 'gallery' in d:
        s.photo_items.all().delete()
        SchoolPhoto.objects.bulk_create(
            [SchoolPhoto(school=s, image_url=str(u)[:1000], order=i) for i, u in enumerate(d['gallery'] or []) if str(u).strip()])
    if 'feeSlabs' in d:
        s.fee_components.all().delete()
        rows = []
        for slab in d['feeSlabs'] or []:
            cls = slab.get('cls') or ''
            cls = '' if cls in ('All classes', 'All') else cls
            for r in slab.get('rows') or []:
                amt = _intval(r.get('amount'))
                if amt is None or not str(r.get('label', '')).strip():
                    continue
                freq = r.get('freq') if r.get('freq') in ('One-time', 'Monthly', 'Annually') else 'Annually'
                rows.append(FeeComponent(school=s, session=str(slab.get('session') or '2027-28')[:10], class_name=cls[:20],
                                         name=str(r['label']).strip()[:120], frequency=freq, amount=amt))
        FeeComponent.objects.bulk_create(rows)
    if not (s.grade_from and s.grade_to) and grades_raw:    # classes text we could not understand: keep it as typed
        School.objects.filter(pk=s.pk).update(grades=str(grades_raw)[:80])
    # rating / reviews are computed from parent reviews; the panel may still set them by hand
    r, n = d.get('rating'), _intval(d.get('reviews'))
    try:
        r = round(float(r), 1) if r not in (None, '') else None
    except ValueError:
        r = None
    if r is not None or n is not None:
        School.objects.filter(pk=s.pk).update(**({'rating': r} if r is not None else {}), **({'reviews': n} if n is not None else {}))


def validate_payload(d):
    err = {}
    for k, label in (('name', 'School name'), ('area', 'Area'), ('city', 'City')):
        if not str(d.get(k) or '').strip():
            err[k] = f'{label} is required'
    if d.get('board') and d['board'] not in BOARD_VALUES:
        err['board'] = 'Unknown board'
    if d.get('type') and TYPE_TO_DB.get(d['type'], d['type']) not in ('Day', 'Boarding School', 'Play School'):
        err['type'] = 'Unknown school type'
    if d.get('gender') and d['gender'] not in ('Co-ed', 'Girls', 'Boys'):
        err['gender'] = 'Unknown gender'
    try:
        if d.get('rating') not in (None, '') and not 0 <= float(d['rating']) <= 5:
            err['rating'] = 'Rating must be between 0 and 5'
    except ValueError:
        err['rating'] = 'Rating must be a number'
    if str(d.get('phone') or '').strip() and not any(importer.parse_phones(d['phone'])):
        err['phone'] = 'Enter a valid phone number'
    return err


# ------------------------------------------------------------------ schools: endpoints
@api_view(['GET'])
@permission_classes(ADMIN)
def schools_meta(request):
    cities = School.objects.exclude(city='').order_by('city').values_list('city', flat=True).distinct()
    return Response({'cities': list(cities)})


@api_view(['GET', 'POST'])
@permission_classes(ADMIN)
def schools(request):
    if request.method == 'POST':
        d = request.data
        err = validate_payload(d)
        if err:
            return bad('Please fix the highlighted fields', 400, err)
        s = School()
        apply_payload(s, d)
        s.save()
        apply_children(s, d, d.get('grades'))
        return Response({'data': school_json(_qs().get(pk=s.pk), request)}, status=201)

    p = request.query_params
    qs = School.objects.all()
    if p.get('q'):
        q = p['q'].strip()
        cond = Q(name__icontains=q) | Q(area__icontains=q) | Q(city__icontains=q) | Q(phone__icontains=q) | Q(landline__icontains=q)
        if q.lstrip('#').isdigit():
            cond |= Q(school_id=int(q.lstrip('#')))
        qs = qs.filter(cond)
    if p.get('status') == 'active':
        qs = qs.filter(isActive=True)
    elif p.get('status') == 'inactive':
        qs = qs.filter(isActive=False)
    if p.get('board'):
        qs = qs.filter(board=p['board'])
    if p.get('type'):
        qs = qs.filter(type=TYPE_TO_DB.get(p['type'], p['type']))
    if p.get('city'):
        qs = qs.filter(city__iexact=p['city'])
    issue = p.get('issue')
    if issue == 'noImage':
        qs = qs.filter(image='', cover_image='')
    elif issue == 'noPhone':
        qs = qs.filter(phone='', landline='')
    elif issue == 'unrated':
        qs = qs.filter(reviews=0)
    qs = qs.order_by({'oldest': 'id', 'name': 'name', 'rating': '-rating', 'fee-low': 'fee', 'fee-high': '-fee'}.get(p.get('sort'), '-id'))
    page, limit = _page(request)
    total = qs.count()
    ids = list(qs.values_list('pk', flat=True)[(page - 1) * limit: page * limit])
    by_pk = {x.pk: x for x in _qs().filter(pk__in=ids)}
    data = [school_json(by_pk[i], request) for i in ids if i in by_pk]
    return Response({'data': data, 'meta': _meta(total, page, limit)})


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes(ADMIN)
def school_detail(request, sid):
    s = _qs().filter(school_id=sid).first()
    if not s:
        return bad('School not found', 404)
    if request.method == 'GET':
        return Response({'data': school_json(s, request)})
    if request.method == 'DELETE':
        s.delete()
        return Response({'ok': True})
    d = request.data
    err = validate_payload(d)
    if err:
        return bad('Please fix the highlighted fields', 400, err)
    apply_payload(s, d)
    s.save()
    apply_children(s, d, d.get('grades'))
    return Response({'data': school_json(_qs().get(pk=s.pk), request)})


@api_view(['PATCH'])
@permission_classes(ADMIN)
def school_flags(request, sid):
    updates = {k: bool(request.data[k]) for k in ('isActive', 'topRated') if k in request.data}
    n = School.objects.filter(school_id=sid).update(**updates) if updates else 0
    return Response({'ok': bool(n)}) if n else bad('School not found', 404)


@api_view(['POST'])
@permission_classes(ADMIN)
def schools_bulk(request):
    ids = [i for i in (request.data.get('ids') or []) if isinstance(i, int)]
    action = request.data.get('action')
    qs = School.objects.filter(school_id__in=ids)
    if action == 'delete':
        n = qs.count()
        qs.delete()
    else:
        change = {'activate': {'isActive': True}, 'deactivate': {'isActive': False},
                  'top': {'topRated': True}, 'untop': {'topRated': False}}.get(action)
        if not change:
            return bad('Unknown action')
        n = qs.update(**change)
    return Response({'affected': n})


@api_view(['POST'])
@permission_classes(ADMIN)
def schools_import(request):
    rows = request.data.get('rows')
    if not isinstance(rows, list) or not rows:
        return bad('No rows to import')
    if len(rows) > 500:
        return bad('Please split the file: maximum 500 rows at a time.')
    return Response(importer.import_rows([r for r in rows if isinstance(r, dict)]))


# ------------------------------------------------------------------ enquiries
def enquiry_json(e):
    return {
        '_id': str(e.pk), 'schoolName': e.schoolName, 'schoolId': e.schoolId, 'childName': e.childName,
        'className': e.className, 'session': e.session, 'parentName': e.parentName, 'relation': e.relation,
        'mobile': e.mobile, 'email': e.email, 'city': e.city, 'note': e.note, 'adminNote': e.adminNote,
        'source': e.source, 'preference': e.preference or {}, 'status': e.status, 'createdAt': e.created_at.isoformat(),
    }


def _enquiry_filter(p, with_status=True):
    qs = Enquiry.objects.all()
    if p.get('q'):
        q = p['q'].strip()
        qs = qs.filter(Q(parentName__icontains=q) | Q(schoolName__icontains=q) | Q(mobile__icontains=q) | Q(email__icontains=q) | Q(city__icontains=q))
    if p.get('from'):
        qs = qs.filter(created_at__date__gte=p['from'])
    if p.get('to'):
        qs = qs.filter(created_at__date__lte=p['to'])
    if with_status and p.get('status'):
        qs = qs.filter(status=p['status'])
    return qs


@api_view(['GET'])
@permission_classes(ADMIN)
def enquiries(request):
    p = request.query_params
    try:
        base = _enquiry_filter(p, with_status=False)
        qs = base.filter(status=p['status']) if p.get('status') else base
        page, limit = _page(request, default_limit=20)
        counts = {r['status']: r['n'] for r in base.values('status').annotate(n=Count('id'))}
        full = {k: counts.get(k, 0) for k in ('new', 'contacted', 'converted', 'closed')}
        full['all'] = sum(full.values())
        total = qs.count()
        data = [enquiry_json(e) for e in qs[(page - 1) * limit: page * limit]]
    except Exception:
        return bad('Invalid filter (dates must look like 2026-10-27)')
    return Response({'data': data, 'meta': {**_meta(total, page, limit), 'counts': full}})


@api_view(['GET'])
@permission_classes(ADMIN)
def enquiries_export(request):
    resp = HttpResponse(content_type='text/csv; charset=utf-8')
    resp.write('\ufeff')
    w = csv.writer(resp)
    w.writerow(['Date', 'Status', 'Parent', 'Mobile', 'Email', 'School', 'Child', 'Class', 'Session', 'City', 'Note', 'Admin note'])
    for e in _enquiry_filter(request.query_params):
        w.writerow([timezone.localtime(e.created_at).strftime('%Y-%m-%d %H:%M'), e.status, e.parentName, e.mobile, e.email,
                    e.schoolName, e.childName, e.className, e.session, e.city, e.note, e.adminNote])
    return resp


@api_view(['PATCH', 'DELETE'])
@permission_classes(ADMIN)
def enquiry_detail(request, pk):
    e = Enquiry.objects.filter(pk=pk).first()
    if not e:
        return bad('Enquiry not found', 404)
    if request.method == 'DELETE':
        e.delete()
        return Response({'ok': True})
    if 'status' in request.data:
        if request.data['status'] not in ('new', 'contacted', 'converted', 'closed'):
            return bad('Unknown status')
        e.status = request.data['status']
    if 'adminNote' in request.data:
        e.adminNote = str(request.data['adminNote'] or '')[:1000]
    e.save()
    return Response({'data': enquiry_json(e)})


@api_view(['POST'])
@permission_classes(ADMIN)
def enquiries_bulk(request):
    ids = [i for i in (request.data.get('ids') or []) if str(i).isdigit()]
    qs = Enquiry.objects.filter(pk__in=ids)
    if request.data.get('action') == 'delete':
        n = qs.count()
        qs.delete()
    elif request.data.get('action') == 'status' and request.data.get('status') in ('new', 'contacted', 'converted', 'closed'):
        n = qs.update(status=request.data['status'])
    else:
        return bad('Unknown action')
    return Response({'affected': n})


# ------------------------------------------------------------------ dashboard
def _pairs(qs, field, limit=8):
    rows = qs.values(field).annotate(n=Count('id')).order_by('-n')[:limit]
    return [{'label': r[field] or 'Unknown', 'value': r['n']} for r in rows]


@api_view(['GET'])
@permission_classes(ADMIN)
def stats(request):
    now = timezone.now()
    today = timezone.localtime(now).date()
    sc = School.objects
    en = Enquiry.objects
    by_status = {r['status']: r['n'] for r in en.values('status').annotate(n=Count('id'))}
    status = {k: by_status.get(k, 0) for k in ('new', 'contacted', 'converted', 'closed')}
    total = sum(status.values())
    daily = []
    for i in range(13, -1, -1):
        day = today - timedelta(days=i)
        daily.append({'date': day.isoformat(), 'value': en.filter(created_at__date=day).count()})
    last7 = sum(d['value'] for d in daily[-7:])
    prev7 = sum(d['value'] for d in daily[:7])
    top_schools = en.exclude(schoolName='').values('schoolName').annotate(n=Count('id')).order_by('-n')[:5]
    return Response({
        'schools': {'total': sc.count(), 'active': sc.filter(isActive=True).count(), 'inactive': sc.filter(isActive=False).count(),
                    'topRated': sc.filter(topRated=True).count()},
        'enquiries': {
            'total': total, 'today': daily[-1]['value'], 'last7': last7, 'prev7': prev7, 'status': status,
            'conversion': round(status['converted'] * 100 / total) if total else 0, 'daily': daily,
            'topSchools': [{'label': r['schoolName'], 'value': r['n']} for r in top_schools],
            'topCities': _pairs(en.exclude(city=''), 'city', 5),
        },
        'schoolsByCity': _pairs(sc.all(), 'city'),
        'schoolsByBoard': _pairs(sc.all(), 'board'),
        'schoolsByType': [{'label': TYPE_TO_UI.get(r['label'], r['label']), 'value': r['value']} for r in _pairs(sc.all(), 'type')],
        'attention': {
            'noImage': sc.filter(image='', cover_image='').count(), 'noPhone': sc.filter(phone='', landline='').count(),
            'unrated': sc.filter(reviews=0).count(), 'inactive': sc.filter(isActive=False).count(),
        },
        'recentEnquiries': [enquiry_json(e) for e in en.all()[:6]],
    })


# ------------------------------------------------------------------ states & cities
def _ensure_locations():
    for st, ct in School.objects.order_by().values_list('state', 'city').distinct():
        for kind, name, state in (('state', st, ''), ('city', ct, st)):
            if name and slugify(name):
                LocationPage.objects.get_or_create(kind=kind, slug=slugify(name), defaults={'name': name, 'state': state})


def _loc_has_content(loc):
    return bool(loc.title or loc.metaTitle or loc.description or loc.photos or loc.faq_items.exists() or loc.faqs)


def _loc_json(loc, request=None):
    faqs = [{'q': f.question, 'a': f.answer} for f in loc.faq_items.all()] or loc.faqs or []
    photos = list(loc.photos or [])
    return {'kind': loc.kind, 'name': loc.name, 'slug': loc.slug, 'state': loc.state, 'title': loc.title, 'metaTitle': loc.metaTitle,
            'description': loc.description, 'photos': photos, 'faqs': faqs, 'isActive': loc.isActive}


@api_view(['GET'])
@permission_classes(ADMIN)
def locations(request):
    _ensure_locations()
    states = {slugify(s): n for s, n in School.objects.exclude(state='').values_list('state').annotate(n=Count('id'))}
    cities = {slugify(c): n for c, n in School.objects.exclude(city='').values_list('city').annotate(n=Count('id'))}
    rows = []
    for loc in LocationPage.objects.prefetch_related('faq_items').order_by('kind', 'name'):
        rows.append({
            'kind': loc.kind, 'name': loc.name, 'slug': loc.slug, 'state': loc.state,
            'schools': (states if loc.kind == 'state' else cities).get(loc.slug, 0),
            'hasContent': _loc_has_content(loc), 'title': loc.title, 'photos': len(loc.photos or []),
            'faqs': len(loc.faq_items.all()) or len(loc.faqs or []), 'isActive': loc.isActive, 'updatedAt': loc.updated_at.isoformat(),
        })
    return Response({'data': rows})


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes(ADMIN)
def location_detail(request, kind, slug):
    loc = LocationPage.objects.filter(kind=kind, slug=slug).first()
    if not loc:
        return bad('Place not found', 404)
    if request.method == 'GET':
        return Response({'data': _loc_json(loc), 'saved': _loc_has_content(loc)})
    if request.method == 'DELETE':
        loc.title = loc.metaTitle = loc.description = ''
        loc.photos, loc.faqs = [], []
        loc.save()
        loc.faq_items.all().delete()
        return Response({'ok': True})
    d = request.data
    loc.title, loc.metaTitle = str(d.get('title') or '')[:240], str(d.get('metaTitle') or '')[:240]
    loc.description = str(d.get('description') or '')
    loc.isActive = bool(d.get('isActive', True))
    loc.photos = [str(u) for u in (d.get('photos') or []) if str(u).strip()][:12]
    if loc.photos and not loc.image_url and not loc.image:
        loc.image_url = loc.photos[0][:1000]
    loc.faqs = []
    loc.save()
    loc.faq_items.all().delete()
    LocationFAQ.objects.bulk_create([
        LocationFAQ(location=loc, question=str(f.get('q', '')).strip()[:300], answer=str(f.get('a', '')).strip(), order=i)
        for i, f in enumerate(d.get('faqs') or []) if str(f.get('q', '')).strip() and str(f.get('a', '')).strip()])
    return Response({'data': _loc_json(loc), 'saved': _loc_has_content(loc)})


# ------------------------------------------------------------------ image upload
@api_view(['POST'])
@permission_classes(ADMIN)
def upload(request):
    f = request.FILES.get('image')
    if not f:
        return bad('Choose an image')
    ext = (f.name.rsplit('.', 1)[-1] if '.' in f.name else '').lower()
    if ext not in ('jpg', 'jpeg', 'png', 'webp', 'gif') or not (f.content_type or '').startswith('image/'):
        return bad('Only JPG, PNG, WEBP or GIF images are allowed')
    if f.size > 5 * 1024 * 1024:
        return bad('Image is larger than 5 MB')
    name = default_storage.save(f'uploads/{slugify(f.name.rsplit(".", 1)[0])[:60] or "image"}.{ext}', f)
    url = default_storage.url(name)
    return Response({'url': request.build_absolute_uri(url) if url.startswith('/') else url})


# ------------------------------------------------------------------ error format for the React panel
def api_exception_handler(exc, context):
    """DRF errors come as {"detail": ...}; the React panel reads {"message": ...}. Send both."""
    from rest_framework.views import exception_handler
    resp = exception_handler(exc, context)
    if resp is not None and isinstance(resp.data, dict) and 'message' not in resp.data:
        detail = resp.data.get('detail')
        resp.data['message'] = str(detail) if detail else 'Please check the form and try again'
    return resp
