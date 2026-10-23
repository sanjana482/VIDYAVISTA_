# VidyaVista Django API

Django 5 + Django REST Framework + Neon PostgreSQL. This backend includes school, enquiry and location models, public read endpoints, admin-protected write endpoints, JWT access/refresh endpoints, and Django Admin.

## Local setup (Windows PowerShell)

From the `backend` folder:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` and set `DATABASE_URL` to the Neon connection string. Do not commit `.env` or share it publicly. Keep `sslmode=require` in the Neon URL. Generate a Django secret key, for example:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Paste that output into `DJANGO_SECRET_KEY` in `.env`. For local development set `DJANGO_DEBUG=True`, `DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1`, and `CORS_ALLOWED_ORIGINS=http://localhost:3000`.

Then run:

```powershell
python manage.py check
python manage.py makemigrations schools
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

- Django Admin: http://127.0.0.1:8000/admin/
- Health check: http://127.0.0.1:8000/api/health/
- Schools: http://127.0.0.1:8000/api/schools/
- Enquiries: `POST http://127.0.0.1:8000/api/enquiries/`
- JWT login: `POST http://127.0.0.1:8000/api/auth/token/` with `{"username":"...","password":"..."}`
- JWT refresh: `POST http://127.0.0.1:8000/api/auth/token/refresh/` with `{"refresh":"..."}`

## School types

Use exactly `Day`, `Day Boarding`, or `Full Boarding` for the `type` field. Supported boards are CBSE, ICSE, IB, Cambridge and State Board.

## Render deployment (temporary backend host)

Create a new **Web Service** connected to the repository and set Root Directory to `backend`.

- Build Command: `./build.sh`
- Start Command: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
- Environment variables:
  - `DATABASE_URL` = Neon PostgreSQL connection string (with SSL)
  - `DJANGO_SECRET_KEY` = generated random secret
  - `DJANGO_DEBUG` = `False`
  - `DJANGO_ALLOWED_HOSTS` = your Render hostname, e.g. `your-api.onrender.com`
  - `CORS_ALLOWED_ORIGINS` = your Vercel frontend origin, e.g. `https://your-site.vercel.app`

After the first deploy, create the admin user using Render Shell:

```bash
python manage.py createsuperuser
```

Check `https://YOUR-API.onrender.com/api/health/` before connecting the frontend. Never paste database passwords or secret keys into source code.

## Vercel frontend

Set `NEXT_PUBLIC_API_URL` to `https://YOUR-API.onrender.com/api` (no trailing slash) in Vercel project Environment Variables, then redeploy the frontend.

## Important integration note

The included frontend was originally written for an Express/Mongo API and its existing custom admin dashboard uses Express-specific admin routes and response shapes. This Django API is a PostgreSQL/Django migration foundation with compatible public school list/detail response envelopes and public enquiry submission, but the custom frontend admin dashboard's login, CRUD, image-upload and location routes still need to be adapted to Django endpoints before the full custom dashboard is considered integrated. Django's built-in `/admin/` is available immediately for basic school/enquiry/location data entry. Do not assume the complete site is production-ready until frontend build, API integration, migrations and a real deployment smoke test pass.

Redis/Celery and Meilisearch are listed in the target architecture but are not enabled by default in this starter; add provider URLs and configure them only when those services are provisioned.
