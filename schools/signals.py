import os
import threading

import requests
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import School


def _ping_frontend():
    url = os.environ.get("FRONTEND_REVALIDATE_URL")
    secret = os.environ.get("REVALIDATE_SECRET")
    if not url or not secret:
        return
    try:
        requests.post(url, headers={"x-revalidate-secret": secret}, timeout=10)
    except Exception:
        pass  # admin save kabhi fail nahi hona chahiye


def _trigger(**kwargs):
    # background thread: admin save slow nahi hoga
    threading.Thread(target=_ping_frontend, daemon=True).start()


@receiver(post_save, sender=School)
def school_saved(sender, **kwargs):
    _trigger()


@receiver(post_delete, sender=School)
def school_deleted(sender, **kwargs):
    _trigger()