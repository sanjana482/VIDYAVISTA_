
import os
from django.conf import settings
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from django.http import JsonResponse
from schools.views import health
from schools.dashboard import dashboard_data
import schools.admin_accounts  # noqa: F401

def home(request):
    return JsonResponse({
        "message": "VidyaVista API is running",
        "status": "success",
    })

urlpatterns = [
    path("", home, name="home"),
    path("admin/dashboard-data/", admin.site.admin_view(dashboard_data), name="vv_dashboard_data"),
    path("admin/", admin.site.urls),   
    path("api/health/", health),
    path("api/", include("schools.urls")),
]

# local /media serving (Cloudinary use ho raha ho to iski zarurat nahi)
if not os.getenv("CLOUDINARY_URL"):
    urlpatterns += [re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT})]
