import os
import threading

import requests
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import School


def _ping_frontend():
    url = os.environ.get("FRONTEND_REVALIDATE_URL")
    secret = os.environ.get("REVALIDATE_SECRET")
    if not url or not secret:
        print("[revalidate] env vars missing", flush=True)
        return
    try:
        r = requests.post(url, headers={"x-revalidate-secret": secret}, timeout=15)
        print(f"[revalidate] status {r.status_code}", flush=True)
    except Exception as e:
        print(f"[revalidate] failed: {e}", flush=True)


def _trigger():
    # ping only after the DB commit, so Vercel reads the new data
    transaction.on_commit(lambda: threading.Thread(target=_ping_frontend, daemon=True).start())


@receiver(post_save, sender=School)
def school_saved(sender, **kwargs):
    _trigger()


@receiver(post_delete, sender=School)
def school_deleted(sender, **kwargs):
    _trigger()