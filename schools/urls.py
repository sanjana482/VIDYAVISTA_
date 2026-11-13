from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import admin_api as A
from . import portal_api as P
from .views import SchoolViewSet, EnquiryViewSet, LocationViewSet, ReviewViewSet, location_detail, location_index

router = DefaultRouter()
router.register("schools", SchoolViewSet, basename="school")
router.register("enquiries", EnquiryViewSet, basename="enquiry")
router.register("locations", LocationViewSet, basename="location")
router.register("reviews", ReviewViewSet, basename="review")

urlpatterns = [
    # ---- Portal API: School Panel, Parent Panel & Auth (/api/portal/...)
    path("portal/schools-search", P.schools_claim_search),
    path("portal/plans", P.public_plans),
    path("portal/coupons/check", P.check_coupon),
    path("portal/auth/captcha", P.get_captcha),
    path("portal/auth/send-otp", P.send_email_otp),
    path("portal/auth/verify-otp", P.verify_email_otp),
    path("portal/auth/parent/register", P.register_parent),
    path("portal/auth/school/register", P.register_school),
    path("portal/auth/login", P.portal_login),
    path("portal/auth/me", P.portal_me),
    path("portal/auth/change-password", P.portal_change_password),
    path("portal/auth/reset-password", P.portal_reset_password),

    # School Panel endpoints
    path("portal/school/dashboard", P.school_dashboard),
    path("portal/school/request-school", P.school_request_claim_or_new),
    path("portal/school/leads", P.school_leads_list),
    path("portal/school/leads/<int:lead_id>/unlock", P.school_unlock_lead),
    path("portal/school/leads/<int:lead_id>/update", P.school_update_lead),
    path("portal/school/profile", P.school_save_profile),
    path("portal/school/subscribe", P.school_subscribe_plan),
    path("portal/school/claim-branch", P.school_claim_branch),
    path("portal/school/switch-branch", P.school_switch_branch),
    path("portal/school/reviews/<int:review_id>/reply", P.school_reply_review),
    path("portal/school/upload", P.school_upload_file),

    # Parent Panel endpoints
    path("portal/parent/dashboard", P.parent_dashboard),
    path("portal/parent/shortlist/toggle", P.parent_toggle_shortlist),

    # Shared Admission Chat messages
    path("portal/messages/<int:lead_id>", P.enquiry_messages),

    # ---- Legacy Admin API (kept for compatibility)
    path("admin/auth/login", A.login),
    path("admin/auth/me", A.me),
    path("admin/auth/change-password", A.change_password),
    path("admin/stats", A.stats),
    path("admin/schools/meta", A.schools_meta),
    path("admin/schools/import", A.schools_import),
    path("admin/schools/bulk-action", A.schools_bulk),
    path("admin/schools", A.schools),
    path("admin/schools/<int:sid>", A.school_detail),
    path("admin/schools/<int:sid>/flags", A.school_flags),
    path("admin/enquiries", A.enquiries),
    path("admin/enquiries/export", A.enquiries_export),
    path("admin/enquiries/bulk", A.enquiries_bulk),
    path("admin/enquiries/<int:pk>", A.enquiry_detail),
    path("admin/locations", A.locations),
    path("admin/locations/<str:kind>/<slug:slug>", A.location_detail),
    path("admin/upload", A.upload),

    # ---- Public API
    path("locations/index", location_index),
    path("locations/<str:kind>/<slug:slug>", location_detail),
    path("", include(router.urls)),
]
