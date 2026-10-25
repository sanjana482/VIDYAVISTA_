import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'dev-only-change-this-secret-before-deploying')
DEBUG = os.getenv('DJANGO_DEBUG', 'False').lower() == 'true'
ALLOWED_HOSTS = [
    "vidyavista-be.onrender.com",
    "vidyavista.vercel.app",
    "localhost",
    "127.0.0.1",
]
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
]
DEBUG_PROPAGATE_EXCEPTIONS = False
ROOT_URLCONF = 'config.urls'
TEMPLATES = [{'BACKEND':'django.template.backends.django.DjangoTemplates','DIRS':[],'APP_DIRS':True,'OPTIONS':{'context_processors':['django.template.context_processors.debug','django.template.context_processors.request','django.contrib.auth.context_processors.auth','django.contrib.messages.context_processors.messages']}}]
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
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://vidyavista.vercel.app",
]
REST_FRAMEWORK={
 'DEFAULT_AUTHENTICATION_CLASSES':('rest_framework_simplejwt.authentication.JWTAuthentication',),
 'DEFAULT_PERMISSION_CLASSES':('rest_framework.permissions.AllowAny',),
 'DEFAULT_PAGINATION_CLASS':'rest_framework.pagination.PageNumberPagination','PAGE_SIZE':50,
}
SIMPLE_JWT={'ACCESS_TOKEN_LIFETIME':timedelta(minutes=15),'REFRESH_TOKEN_LIFETIME':timedelta(days=7),'ROTATE_REFRESH_TOKENS':True,'BLACKLIST_AFTER_ROTATION':True}

JAZZMIN_SETTINGS = {
    "site_title": "VidyaVista Admin",
    "site_header": "VidyaVista",
    "site_brand": "VidyaVista",
    "welcome_sign": "Welcome to VidyaVista Dashboard",
    "copyright": "VidyaVista",
    "show_ui_builder": False,
    "navigation_expanded": True,

    "order_with_respect_to": [
        "schools",
        "auth",
    ],

    "icons": {
        "schools": "fas fa-school",
        "schools.school": "fas fa-building",
        "schools.enquiry": "fas fa-envelope",
        "schools.owner": "fas fa-user-tie",
        "schools.review": "fas fa-star",
        "schools.locationpage": "fas fa-map-marker-alt",
        "auth.user": "fas fa-users",
        "auth.group": "fas fa-user-shield",
        "token_blacklist": "fas fa-key",
    },
}


# Temporary logging to diagnose production admin errors

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


# ---------------------------------------------------------------------------
# Uploaded files (cover image, gallery, owner photo ...)
# Render ki disk temporary hoti hai: redeploy par uploaded files ud jati hain.
# Isliye Cloudinary (free) use karo: Render me env var CLOUDINARY_URL daalo
# (cloudinary://API_KEY:API_SECRET@CLOUD_NAME). Bina uske local /media folder use hota hai (sirf testing ke liye).
# ---------------------------------------------------------------------------
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
if os.getenv('CLOUDINARY_URL'):
    INSTALLED_APPS += ['cloudinary_storage', 'cloudinary']
    STORAGES = {
        'default': {'BACKEND': 'cloudinary_storage.storage.MediaCloudinaryStorage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    }
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {'reviews': '10/hour'}
DATA_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024
