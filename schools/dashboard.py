"""JSON data for the admin dashboard (staff only, wired in config/urls.py)."""
from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.http import JsonResponse
from django.urls import reverse
from django.utils import timezone

from .models import ADMISSION_STATUS, BOARDS, Enquiry, LocationPage, Review, School

BOARD_LABEL = dict(BOARDS)
ADMISSION_LABEL = dict(ADMISSION_STATUS)
TYPE_LABEL = {"Day": "Day School"}
STATUS_LABEL = {"new": "New", "contacted": "Contacted", "converted": "Converted", "closed": "Closed"}


def _pairs(qs, key, labels=None, limit=None):
    rows = [(labels.get(r[key], r[key]) if labels else r[key], r["n"]) for r in qs if r[key]]
    rows = rows[:limit] if limit else rows
    return {"labels": [r[0] for r in rows], "values": [r[1] for r in rows]}


def dashboard_data(request):
    today = timezone.localdate()
    start30 = today - timedelta(days=29)
    schools = School.objects.all()

    # enquiries per day (last 30 days, zero-filled)
    per_day = {
        r["d"]: r["n"]
        for r in Enquiry.objects.filter(created_at__date__gte=start30)
        .order_by().annotate(d=TruncDate("created_at")).values("d").annotate(n=Count("id"))
    }
    days = [start30 + timedelta(days=i) for i in range(30)]
    daily = {"labels": [d.strftime("%d %b") for d in days], "values": [per_day.get(d, 0) for d in days]}

    last7 = Enquiry.objects.filter(created_at__date__gte=today - timedelta(days=6)).count()
    prev7 = Enquiry.objects.filter(
        created_at__date__gte=today - timedelta(days=13), created_at__date__lt=today - timedelta(days=6)
    ).count()

    recent_enquiries = [
        {
            "name": e.parentName, "school": e.schoolName, "mobile": e.mobile, "cls": e.className,
            "status": STATUS_LABEL.get(e.status, e.status), "statusKey": e.status,
            "date": timezone.localtime(e.created_at).strftime("%d %b, %I:%M %p"),
            "url": reverse("admin:schools_enquiry_change", args=[e.pk]),
        }
        for e in Enquiry.objects.order_by("-created_at")[:8]
    ]
    recent_schools = [
        {
            "name": s.name, "place": ", ".join(x for x in (s.city, s.state) if x),
            "board": BOARD_LABEL.get(s.board, s.board),
            "date": timezone.localtime(s.created_at).strftime("%d %b %Y"),
            "url": reverse("admin:schools_school_change", args=[s.pk]),
        }
        for s in schools.order_by("-created_at")[:6]
    ]
    pending = [
        {
            "who": r.name, "school": r.school.name, "rating": r.rating, "text": r.text[:110],
            "url": reverse("admin:schools_review_change", args=[r.pk]),
        }
        for r in Review.objects.filter(is_approved=False).select_related("school").order_by("-created_at")[:5]
    ]

    data = {
        "kpis": {
            "schools": schools.count(),
            "active": schools.filter(isActive=True).count(),
            "featured": schools.filter(isFeatured=True).count(),
            "recommended": schools.filter(isRecommended=True).count(),
            "newSchools30": schools.filter(created_at__date__gte=start30).count(),
            "enquiries": Enquiry.objects.count(),
            "newEnquiries": Enquiry.objects.filter(status="new").count(),
            "enquiries7": last7,
            "enquiriesPrev7": prev7,
            "pendingReviews": Review.objects.filter(is_approved=False).count(),
            "approvedReviews": Review.objects.filter(is_approved=True).count(),
            "locations": LocationPage.objects.count(),
        },
        "enquiriesDaily": daily,
        "enquiryStatus": _pairs(Enquiry.objects.values("status").annotate(n=Count("id")).order_by("-n"), "status", STATUS_LABEL),
        "byState": _pairs(schools.values("state").annotate(n=Count("id")).order_by("-n"), "state", limit=8),
        "byBoard": _pairs(schools.values("board").annotate(n=Count("id")).order_by("-n"), "board", BOARD_LABEL),
        "byType": _pairs(schools.values("type").annotate(n=Count("id")).order_by("-n"), "type", TYPE_LABEL),
        "byAdmission": _pairs(schools.values("admission_status").annotate(n=Count("id")).order_by("-n"), "admission_status", ADMISSION_LABEL),
        "recentEnquiries": recent_enquiries,
        "recentSchools": recent_schools,
        "pendingReviews": pending,
        "links": {
            "addSchool": reverse("admin:schools_school_add"),
            "schools": reverse("admin:schools_school_changelist"),
            "enquiries": reverse("admin:schools_enquiry_changelist"),
            "reviews": reverse("admin:schools_review_changelist"),
            "locations": reverse("admin:schools_locationpage_changelist"),
            "importCsv": "/admin/schools/school/import-csv/",
        },
        "user": request.user.get_short_name() or request.user.get_username(),
    }
    return JsonResponse(data)
