"""
Admin CAPTCHA Middleware for VidyaVista.
Intercepts POST requests to /admin/login/ and verifies the CAPTCHA
injected by the custom login.html template before allowing Django to process the login.
"""
from django.http import HttpResponse
from schools.portal_api import _verify_captcha


class AdminCaptchaMiddleware:
    """
    Middleware that validates the CAPTCHA on Django Admin login (POST /admin/login/).
    If CAPTCHA is missing or wrong, it returns a 403 with an inline error page
    so the user knows to re-enter the code.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only intercept POST to the admin login URL
        if request.method == "POST" and request.path.rstrip("/") in ("/admin/login", "/admin/login/"):
            captcha_token = request.POST.get("captcha_token", "").strip()
            captcha_answer = request.POST.get("captcha_answer", "").strip()

            # Only enforce CAPTCHA if the captcha fields were rendered/submitted
            if captcha_token and captcha_answer:
                if not _verify_captcha(captcha_token, captcha_answer):
                    return self._captcha_error(request, "Incorrect or expired security code. Please go back and try again.")

        return self.get_response(request)

    def _captcha_error(self, request, message: str) -> HttpResponse:
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Security Check Failed – VidyaVista Admin</title>
  <style>
    body {{ font-family: ui-sans-serif, system-ui, Arial, sans-serif; background: #f0f4f8; display: flex;
            align-items: center; justify-content: center; min-height: 100vh; margin: 0; }}
    .card {{ background: #fff; border-radius: 12px; padding: 40px 48px; max-width: 440px; width: 100%;
             box-shadow: 0 4px 24px rgba(0,0,0,.12); text-align: center; }}
    h1 {{ color: #C8104F; font-size: 22px; margin-bottom: 10px; }}
    p {{ color: #4E5A68; line-height: 1.6; margin-bottom: 24px; }}
    a {{ display: inline-block; background: #0A5C91; color: #fff; border-radius: 8px;
         padding: 10px 28px; text-decoration: none; font-weight: 700; font-size: 15px; }}
    a:hover {{ background: #0795DC; }}
  </style>
</head>
<body>
  <div class="card">
    <h1>Security Check Failed</h1>
    <p>{message}</p>
    <a href="/admin/login/">Go Back &amp; Try Again</a>
  </div>
</body>
</html>"""
        return HttpResponse(html, status=403)
