"""
Custom Django Admin Site that adds CAPTCHA verification to the login form.
Uses the same CAPTCHA_SIGNER approach already in portal_api.py.
"""
from django.contrib.admin import AdminSite
from django.contrib.auth import REDIRECT_FIELD_NAME
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from django.contrib import admin as _default_admin

# Reuse CAPTCHA logic from portal_api
from schools.portal_api import CAPTCHA_SIGNER, _verify_captcha


class VidyaVistaAdminSite(AdminSite):
    """
    Admin site with CAPTCHA enforcement on the login page.
    The login.html template injects captcha_token + captcha_answer
    via hidden fields on form submit (populated by JS that calls /api/captcha/).
    """

    @method_decorator(never_cache)
    @method_decorator(csrf_protect)
    def login(self, request, extra_context=None):
        """
        Intercept POST login requests to verify CAPTCHA before
        delegating to the standard Django/Jazzmin login logic.
        """
        if request.method == "POST":
            captcha_token = request.POST.get("captcha_token", "").strip()
            captcha_answer = request.POST.get("captcha_answer", "").strip()

            if not captcha_token or not captcha_answer:
                # No CAPTCHA submitted — re-render login with error
                extra_context = extra_context or {}
                extra_context["captcha_error"] = "Please complete the security code."
            elif not _verify_captcha(captcha_token, captcha_answer):
                extra_context = extra_context or {}
                extra_context["captcha_error"] = "Incorrect security code. Please try again."

            if extra_context and extra_context.get("captcha_error"):
                # Re-render the login form with the error message
                # (don't proceed to credential check)
                # We call super().login but trick it into thinking it's a GET
                # by temporarily making a copy with method=GET
                request.method = "GET"
                response = super().login(request, extra_context=extra_context)
                request.method = "POST"  # restore
                return response

        return super().login(request, extra_context=extra_context)


# Replace the default admin site with our custom one
vv_admin_site = VidyaVistaAdminSite(name="admin")
