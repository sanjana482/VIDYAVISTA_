
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from schools.views import health

def home(request):
    return JsonResponse({
        "message": "VidyaVista API is running",
        "status": "success",
    })

urlpatterns = [
    path("", home, name="home"),
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/", include("schools.urls")),
]
