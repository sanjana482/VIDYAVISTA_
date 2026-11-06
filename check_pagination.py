import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from django.test import Client

c = Client(HTTP_HOST="localhost")
ids, page = [], 1
while True:
    d = c.get(f"/api/schools/?limit=300&page={page}", secure=True).json()
    ids += [x["schoolId"] for x in d["data"]]
    if page >= d["meta"]["pages"]:
        break
    page += 1
print("rows:", len(ids), "unique:", len(set(ids)))