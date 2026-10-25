
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SchoolViewSet, EnquiryViewSet, LocationViewSet, ReviewViewSet, location_detail, location_index

router = DefaultRouter()
router.register("schools", SchoolViewSet, basename="school")
router.register("enquiries", EnquiryViewSet, basename="enquiry")
router.register("locations", LocationViewSet, basename="location")
router.register("reviews", ReviewViewSet, basename="review")

urlpatterns = [
    # these two must come before the router (its <slug> would swallow "index")
    path("locations/index", location_index),
    path("locations/<str:kind>/<slug:slug>", location_detail),
    path("", include(router.urls)),
]
