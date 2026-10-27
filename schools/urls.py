
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import admin_api as A
from .views import SchoolViewSet, EnquiryViewSet, LocationViewSet, ReviewViewSet, location_detail, location_index

router = DefaultRouter()
router.register("schools", SchoolViewSet, basename="school")
router.register("enquiries", EnquiryViewSet, basename="enquiry")
router.register("locations", LocationViewSet, basename="location")
router.register("reviews", ReviewViewSet, basename="review")

urlpatterns = [
    # ---- React admin panel API (/api/admin/...)
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
    # ---- public API
    # these two must come before the router (its <slug> would swallow "index")
    path("locations/index", location_index),
    path("locations/<str:kind>/<slug:slug>", location_detail),
    path("", include(router.urls)),
]
