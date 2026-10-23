
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SchoolViewSet, EnquiryViewSet, LocationViewSet

router = DefaultRouter()
router.register("schools", SchoolViewSet, basename="school")
router.register("enquiries", EnquiryViewSet, basename="enquiry")
router.register("locations", LocationViewSet, basename="location")

urlpatterns = [
    path("", include(router.urls)),
]
