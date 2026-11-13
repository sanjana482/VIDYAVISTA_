import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'dev-only-change-this-secret-before-deploying')
DEBUG = (os.getenv('DJANGO_DEBUG') or os.getenv('DEBUG') or 'False').lower() == 'true'
ALLOWED_HOSTS = [
    "vv-backend-xcpp.onrender.com",
    "vidyavista-be.onrender.com",
    "vidyavista.vercel.app",
    "localhost",
    "127.0.0.1",
]
_extra_hosts = os.getenv("ALLOWED_HOSTS") or os.getenv("DJANGO_ALLOWED_HOSTS")
if _extra_hosts:
    for h in _extra_hosts.split(","):
        h = h.strip()
        if h and h not in ALLOWED_HOSTS:
            ALLOWED_HOSTS.append(h)
_render_host = os.getenv("RENDER_EXTERNAL_HOSTNAME")
if _render_host and _render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(_render_host)
    
print("DEBUG:", DEBUG)
print("ALLOWED_HOSTS:", ALLOWED_HOSTS)
INSTALLED_APPS = [
    'jazzmin','django.contrib.admin','django.contrib.auth','django.contrib.contenttypes','django.contrib.sessions',
    'django.contrib.messages','django.contrib.staticfiles','rest_framework','rest_framework_simplejwt.token_blacklist','corsheaders','schools',
]
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware','whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware','django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware','django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware','django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'schools.admin_captcha_middleware.AdminCaptchaMiddleware',
]
DEBUG_PROPAGATE_EXCEPTIONS = False
ROOT_URLCONF = 'config.urls'
TEMPLATES = [{'BACKEND':'django.template.backends.django.DjangoTemplates','DIRS': [BASE_DIR / 'templates'],'APP_DIRS':True,'OPTIONS':{'context_processors':['django.template.context_processors.debug','django.template.context_processors.request','django.contrib.auth.context_processors.auth','django.contrib.messages.context_processors.messages']}}]
WSGI_APPLICATION = 'config.wsgi.application'
DATABASES = {'default': dj_database_url.config(default=os.getenv('DATABASE_URL','sqlite:///' + str(BASE_DIR / 'db.sqlite3')), conn_max_age=600, ssl_require=not DEBUG and os.getenv('DATABASE_URL','').startswith('postgres'))}
AUTH_PASSWORD_VALIDATORS = [
 {'NAME':'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
 {'NAME':'django.contrib.auth.password_validation.MinimumLengthValidator'},
 {'NAME':'django.contrib.auth.password_validation.CommonPasswordValidator'},
 {'NAME':'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
LANGUAGE_CODE='en-us'; TIME_ZONE='Asia/Kolkata'; USE_I18N=True; USE_TZ=True
STATIC_URL='static/'; STATIC_ROOT=BASE_DIR/'staticfiles'; DEFAULT_AUTO_FIELD='django.db.models.BigAutoField'
LOGIN_REDIRECT_URL = '/admin/'
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://vidyavista.vercel.app",
]
_extra_cors = os.getenv("CORS_ALLOWED_ORIGINS")
if _extra_cors:
    for c in _extra_cors.split(","):
        c = c.strip()
        if c and c not in CORS_ALLOWED_ORIGINS:
            CORS_ALLOWED_ORIGINS.append(c)
CORS_ALLOW_ALL_ORIGINS = DEBUG
REST_FRAMEWORK={
 'DEFAULT_AUTHENTICATION_CLASSES':('rest_framework_simplejwt.authentication.JWTAuthentication',),
 'DEFAULT_PERMISSION_CLASSES':('rest_framework.permissions.AllowAny',),
 'DEFAULT_PAGINATION_CLASS':'rest_framework.pagination.PageNumberPagination','PAGE_SIZE':50,
}
SIMPLE_JWT={'ACCESS_TOKEN_LIFETIME':timedelta(days=7),'REFRESH_TOKEN_LIFETIME':timedelta(days=30),'ROTATE_REFRESH_TOKENS':True,'BLACKLIST_AFTER_ROTATION':True}

JAZZMIN_SETTINGS = {
    "site_title": "VidyaVista Admin Portal",
    "site_header": "VidyaVista",
    "site_brand": "VidyaVista Admin",
    "welcome_sign": "Welcome to VidyaVista Administration Portal",
    "copyright": "VidyaVista",
    "site_logo": "schools/img/logo.png",
    "login_logo": "schools/img/logo.png",
    "site_logo_classes": "img-fluid",
    "site_icon": "schools/img/logo.png",
    "show_ui_builder": False,
    "custom_css": "schools/css/custom_admin.css",
    "navigation_expanded": True,
    "order_with_respect_to": [
        "schools",
        "schools.schoolaccount",
        "schools.owner",
        "schools.parentprofile",
        "schools.enquiry",
        "schools.plan",
        "schools.schoolmembership",
        "schools.invoice",
        "schools.school",
        "schools.review",
        "schools.locationpage",
        "schools.coupon",
        "auth",
    ],
    "hide_apps": ["token_blacklist"],
    "usermenu_links": [
        {"name": "Change My Password", "url": "admin:password_change", "icon": "fas fa-key"},
    ],
    "topmenu_links": [
        {"name": "Dashboard", "url": "admin:index"},
        {"name": "School Owners & Approvals", "model": "schools.SchoolAccount"},
        {"name": "Parent Accounts", "model": "schools.ParentProfile"},
        {"name": "Plans & Subscriptions", "model": "schools.SchoolMembership"},
        {"name": "Enquiries & Leads", "model": "schools.Enquiry"},
        {"name": "View Website", "url": "https://vidyavista.vercel.app", "new_window": True},
    ],
    "icons": {
        "schools": "fas fa-university",
        "schools.school": "fas fa-school",
        "schools.schoolaccount": "fas fa-user-check",
        "schools.owner": "fas fa-user-tie",
        "schools.parentprofile": "fas fa-user-graduate",
        "schools.enquiry": "fas fa-envelope-open-text",
        "schools.plan": "fas fa-layer-group",
        "schools.schoolmembership": "fas fa-credit-card",
        "schools.invoice": "fas fa-file-invoice",
        "schools.coupon": "fas fa-tag",
        "schools.shortlist": "fas fa-bookmark",
        "schools.leadmessage": "fas fa-comments",
        "schools.review": "fas fa-star",
        "schools.locationpage": "fas fa-map-marker-alt",
        "schools.emailotp": "fas fa-shield-alt",
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user-shield",
        "auth.group": "fas fa-users",
        "token_blacklist": "fas fa-key",
    },
}
JAZZMIN_UI_TWEAKS = {
    "theme": "flatly",
    "navbar": "navbar-white navbar-light",
    "no_navbar_border": True,
    "sidebar": "sidebar-dark-primary",
    "brand_colour": "navbar-primary",
    "accent": "accent-primary",
    "sidebar_nav_flat_style": True,
    "navbar_fixed": True,
    "sidebar_fixed": True,
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{asctime} {levelname} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
if os.getenv('CLOUDINARY_URL'):
    INSTALLED_APPS += ['cloudinary_storage', 'cloudinary']
    STORAGES = {
        'default': {'BACKEND': 'cloudinary_storage.storage.MediaCloudinaryStorage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    }
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {'reviews': '10/hour', 'admin_login': '10/min'}
REST_FRAMEWORK['EXCEPTION_HANDLER'] = 'schools.admin_api.api_exception_handler'
DATA_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024

# ---- Email / Gmail SMTP Configuration for Registration OTP Verification ----
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() == "true"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "").strip()
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "").replace(" ", "").strip()
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    f"VidyaVista <{EMAIL_HOST_USER}>" if EMAIL_HOST_USER else "VidyaVista <noreply@vidyavista.in>",
)
EMAIL_TIMEOUT = 15
