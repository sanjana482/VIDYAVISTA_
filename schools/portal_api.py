"""
Portal API for VidyaVista:
- School / Institution Panel (/api/portal/school/...)
- Parent / Student Panel (/api/portal/parent/...)
- Unified Auth & Claim School (/api/portal/auth/...)
- Plans, Lead Top-up Recharges, GST Invoices & Coupons (/api/portal/plans, ...)
"""
import os
import random
import re
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.mail import send_mail
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify
from django.core.files.storage import default_storage
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import AccessToken

from .models import (
    BranchClaim,
    BOARDS, Coupon, EmailOTP, Enquiry, FeeComponent, Invoice, LeadMessage, Owner,
    ParentProfile, Plan, Review, School, SchoolAccount, SchoolAward, SchoolFAQ,
    SchoolHighlight, SchoolMembership, SchoolPhoto, SchoolVideo, Shortlist,
)
from .serializers import SchoolListSerializer, file_or_url

User = get_user_model()
CAPTCHA_SIGNER = TimestampSigner(salt="vidyavista-portal-captcha-v1")


def _generate_captcha():
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    code = "".join(random.choice(chars) for _ in range(5))
    token = CAPTCHA_SIGNER.sign(code)
    return {"captchaToken": token, "captchaCode": code}


def _verify_captcha(token: str, answer: str) -> bool:
    if not token or not answer:
        return False
    try:
        expected = CAPTCHA_SIGNER.unsign(str(token).strip(), max_age=900)
        return str(answer).strip().upper() == str(expected).strip().upper()
    except (BadSignature, SignatureExpired):
        return False


def _token_for(user):
    t = AccessToken.for_user(user)
    t.set_exp(lifetime=timedelta(days=7))
    return str(t)


def _err(msg, status=400, code="ERROR"):
    return Response({"ok": False, "message": msg, "code": code}, status=status)


def ensure_default_plans():
    """Seeds default Yearly Plans (Featured / Recommended / Top Rated + 100 Leads) and Mobile-Data Style Top-up Packs if none exist."""
    if Plan.objects.exists():
        return
    defaults = [
        {
            "name": "Free Starter Listing (Trial)",
            "code": "free-starter",
            "plan_type": "free",
            "price": 0,
            "gst_percent": 18,
            "validity_days": 365,
            "leads_included": 2,
            "grants_featured": False,
            "grants_recommended": False,
            "grants_top_rated": False,
            "grants_verified": False,
            "description": "Basic school profile listing with 2 complimentary trial lead unlocks.",
            "features": [
                "Public School Listing for 1 Year",
                "2 Free Trial Lead Unlocks",
                "Full 10-Step School Profile Editor",
                "Masked Parent Leads Inbox",
            ],
            "is_popular": False,
            "order": 1,
        },
        {
            "name": "Verified School Yearly Plan (100 Leads)",
            "code": "yearly-verified-100",
            "plan_type": "yearly",
            "price": 9999,
            "gst_percent": 18,
            "validity_days": 365,
            "leads_included": 100,
            "grants_featured": False,
            "grants_recommended": False,
            "grants_top_rated": False,
            "grants_verified": True,
            "description": "1 Year membership with 100 verified parent leads & Verified Institution badge.",
            "features": [
                "100 Verified Parent Admission Leads",
                "1 Year Full Validity (365 Days)",
                "Verified School Badge on Listing",
                "Direct Parent Mobile, Email & WhatsApp Unlock",
                "Admission Chat with Parents",
                "GST Tax Invoice Included",
            ],
            "is_popular": False,
            "order": 2,
        },
        {
            "name": "Recommended School Yearly Plan (100 Leads)",
            "code": "yearly-recommended-100",
            "plan_type": "yearly",
            "price": 14999,
            "gst_percent": 18,
            "validity_days": 365,
            "leads_included": 100,
            "grants_featured": False,
            "grants_recommended": True,
            "grants_top_rated": False,
            "grants_verified": True,
            "description": "Show your school in 'Recommended Schools' on Homepage + 100 Parent Leads for 1 Year.",
            "features": [
                "100 Verified Parent Admission Leads",
                "1 Year Full Validity (365 Days)",
                "Homepage 'Recommended Schools' Placement",
                "Verified Institution Badge",
                "Direct Parent Call, Email & WhatsApp Unlock",
                "Priority Support & GST Invoice",
            ],
            "is_popular": True,
            "order": 3,
        },
        {
            "name": "Featured + Top Rated Elite Plan (100 Leads)",
            "code": "yearly-featured-toprated-100",
            "plan_type": "yearly",
            "price": 24999,
            "gst_percent": 18,
            "validity_days": 365,
            "leads_included": 100,
            "grants_featured": True,
            "grants_recommended": True,
            "grants_top_rated": True,
            "grants_verified": True,
            "description": "Maximum visibility: Featured School + Recommended + Top Rated Badge + 100 Leads for 1 Year.",
            "features": [
                "100 Verified Parent Admission Leads",
                "1 Year Full Validity (365 Days)",
                "Homepage 'Featured Schools' Spotlight",
                "'Top Rated' & 'Recommended' Ribbons",
                "Verified Institution Badge",
                "Dedicated Account Manager & GST Invoice",
            ],
            "is_popular": False,
            "order": 4,
        },
        {
            "name": "Lead Booster Add-on Pack (+50 Leads)",
            "code": "topup-50-leads",
            "plan_type": "topup",
            "price": 3999,
            "gst_percent": 18,
            "validity_days": 365,
            "leads_included": 50,
            "grants_featured": False,
            "grants_recommended": False,
            "grants_top_rated": False,
            "grants_verified": True,
            "description": "Like a mobile data top-up! Instant +50 extra lead credits when your 100 leads finish.",
            "features": [
                "+50 Instant Parent Lead Unlocks",
                "Works as Top-up on Any Yearly Plan",
                "Full Parent Mobile & Email Access",
                "Instant GST Tax Invoice",
            ],
            "is_popular": False,
            "order": 5,
        },
        {
            "name": "Mega Lead Booster Recharge (+100 Leads)",
            "code": "topup-100-leads",
            "plan_type": "topup",
            "price": 6999,
            "gst_percent": 18,
            "validity_days": 365,
            "leads_included": 100,
            "grants_featured": False,
            "grants_recommended": False,
            "grants_top_rated": False,
            "grants_verified": True,
            "description": "Best-value recharge when your 100 leads are over! Adds +100 fresh parent lead credits.",
            "features": [
                "+100 Instant Parent Lead Unlocks",
                "Best Value Per-Lead Top-up Recharge",
                "Full Parent Mobile, Email & WhatsApp Access",
                "Instant GST Tax Invoice",
            ],
            "is_popular": True,
            "order": 6,
        },
    ]
    for d in defaults:
        Plan.objects.get_or_create(code=d["code"], defaults=d)


def plan_json(p: Plan):
    return {
        "id": p.pk,
        "name": p.name,
        "code": p.code,
        "planType": p.plan_type,
        "price": p.price,
        "gstPercent": p.gst_percent,
        "gstAmount": p.gst_amount,
        "totalPrice": p.total_price_with_gst,
        "validityDays": p.validity_days,
        "leadsIncluded": p.leads_included,
        "grantsFeatured": p.grants_featured,
        "grantsRecommended": p.grants_recommended,
        "grantsTopRated": p.grants_top_rated,
        "grantsVerified": p.grants_verified,
        "description": p.description,
        "features": p.features or [],
        "isPopular": p.is_popular,
    }


def invoice_json(inv: Invoice):
    return {
        "id": inv.pk,
        "invoiceNumber": inv.invoice_number,
        "recipientName": inv.recipient_name,
        "recipientAddress": inv.recipient_address,
        "recipientGstin": inv.recipient_gstin,
        "planDescription": inv.plan_description,
        "subtotal": inv.subtotal,
        "discount": inv.discount,
        "gstPercent": inv.gst_percent,
        "gstAmount": inv.gst_amount,
        "totalAmount": inv.total_amount,
        "paymentMode": inv.payment_mode,
        "status": inv.status,
        "issuedDate": inv.issued_date.isoformat() if inv.issued_date else "",
    }


def membership_json(m: SchoolMembership):
    inv = getattr(m, "invoice", None)
    return {
        "id": m.pk,
        "planName": m.plan_name,
        "planType": m.plan_type,
        "startDate": m.start_date.isoformat() if m.start_date else "",
        "endDate": m.end_date.isoformat() if m.end_date else "",
        "daysRemaining": m.days_remaining,
        "leadsTotal": m.leads_total,
        "leadsUsed": m.leads_used,
        "leadsRemaining": m.leads_remaining,
        "amount": m.amount,
        "discount": m.discount,
        "gstPercent": m.gst_percent,
        "gstAmount": m.gst_amount,
        "totalPaid": m.total_paid,
        "paymentMode": m.get_payment_mode_display(),
        "paymentNote": m.payment_note,
        "status": m.status,
        "invoice": invoice_json(inv) if inv else None,
    }


def lead_for_school_json(e: Enquiry):
    """
    CRITICAL BUSINESS RULE:
    If `e.is_unlocked` is False, mobile and email are strictly masked in the API response
    so the school only sees the student/parent name, class, city, and enquiry details
    until they unlock the lead with an active plan credit.
    """
    unlocked = bool(e.is_unlocked)
    return {
        "id": e.pk,
        "schoolId": e.schoolId,
        "schoolName": e.schoolName,
        "childName": e.childName or "Student",
        "className": e.className or "All Classes",
        "session": e.session or "2027-28",
        "parentName": e.parentName,
        "relation": e.relation or "Parent",
        "mobile": e.mobile if unlocked else e.masked_mobile,
        "email": (e.email or "Not provided") if unlocked else e.masked_email,
        "canCall": unlocked,
        "isUnlocked": unlocked,
        "unlockedAt": e.unlocked_at.isoformat() if e.unlocked_at else None,
        "creditUsed": e.credit_used,
        "city": e.city or "India",
        "preferredLocation": (e.preference or {}).get("preferredLocation") or e.city or "Same City",
        "institutionType": (e.preference or {}).get("institutionType") or "Day / Boarding",
        "note": e.note,
        "leadSourceTag": e.lead_source_tag or "Direct Inquiry",
        "schoolStatus": e.school_status,
        "schoolNote": e.school_note,
        "rejectionReason": e.rejection_reason,
        "reviewReason": e.review_reason,
        "followupDate": e.followup_date.isoformat() if e.followup_date else "",
        "createdAt": e.created_at.isoformat(),
        "messagesCount": e.messages.count(),
    }


def _user_role_payload(user):
    if hasattr(user, "school_account"):
        sa = user.school_account
        return {
            "role": "school",
            "id": user.pk,
            "name": sa.contact_person or user.get_full_name() or user.username,
            "institutionName": sa.school.name if sa.school else (sa.institution_name or "School Owner Account"),
            "schoolId": sa.school.school_id if sa.school else None,
            "schoolSlug": sa.school.slug if sa.school else None,
            "email": sa.email or user.email,
            "mobile": sa.mobile,
            "status": sa.status,
            "schoolLinkStatus": sa.school_link_status,
            "editApprovalStatus": sa.edit_approval_status,
            "leadsRemaining": sa.total_leads_remaining(),
        }
    if hasattr(user, "parent_profile"):
        pp = user.parent_profile
        return {
            "role": "parent",
            "id": user.pk,
            "name": pp.parent_name or user.get_full_name() or user.username,
            "studentName": pp.student_name,
            "email": pp.email or user.email,
            "mobile": pp.mobile,
            "profileCompletion": pp.profile_completion,
        }
    if user.is_staff or user.is_superuser:
        return {
            "role": "admin",
            "id": user.pk,
            "name": user.get_full_name() or user.username,
            "email": user.email or user.username,
        }
    return {
        "role": "parent",
        "id": user.pk,
        "name": user.get_full_name() or user.username,
        "email": user.email,
    }


# ============================================================================
# 1. PUBLIC ENDPOINTS (School Claim Search, Plans List, Coupon Check)
# ============================================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def schools_claim_search(request):
    """Search among the 10,000+ schools so a school owner can claim their existing school listing."""
    q = (request.query_params.get("q") or "").strip()
    city = (request.query_params.get("city") or "").strip()
    qs = School.objects.all()
    if q:
        cond = Q(name__icontains=q) | Q(city__icontains=q) | Q(area__icontains=q)
        if q.isdigit():
            cond |= Q(school_id=int(q))
        qs = qs.filter(cond)
    if city:
        qs = qs.filter(city__iexact=city)
    rows = []
    for s in qs.order_by("name")[:25]:
        claimed = s.school_accounts.filter(status="approved", school_link_status="approved").exists()
        enq_count = Enquiry.objects.filter(Q(school=s) | Q(schoolId=s.school_id) | Q(schoolName__iexact=s.name)).count()
        rows.append({
            "schoolId": s.school_id,
            "slug": s.slug,
            "name": s.name,
            "area": s.area,
            "city": s.city,
            "state": s.state,
            "board": s.board,
            "type": s.type,
            "claimed": claimed,
            "leadsWaiting": enq_count,
        })
    return Response({"ok": True, "data": rows})


@api_view(["GET"])
@permission_classes([AllowAny])
def public_plans(request):
    ensure_default_plans()
    plans = [plan_json(p) for p in Plan.objects.filter(is_active=True)]
    return Response({"ok": True, "data": plans})


@api_view(["POST"])
@permission_classes([AllowAny])
def check_coupon(request):
    code = (request.data.get("code") or "").strip().upper()
    amount = int(request.data.get("amount") or 0)
    if not code:
        return _err("Enter a coupon code")
    c = Coupon.objects.filter(code=code, is_active=True).first()
    if not c:
        return _err("Invalid or expired coupon code")
    if c.expiry_date and c.expiry_date < timezone.localdate():
        return _err("This coupon has expired")
    if c.used_count >= c.usage_limit:
        return _err("Coupon usage limit reached")
    discount = c.discount_value if c.discount_type == "flat" else round((amount * c.discount_value) / 100)
    discount = min(amount, discount)
    return Response({
        "ok": True,
        "code": c.code,
        "discountType": c.discount_type,
        "discountValue": c.discount_value,
        "discountAmount": discount,
        "finalSubtotal": max(0, amount - discount),
    })


# ============================================================================
# 2. CAPTCHA & EMAIL OTP VERIFICATION + UNIFIED AUTH
# ============================================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def get_captcha(request):
    """Generates a signed security CAPTCHA challenge for Login and Registration."""
    c = _generate_captcha()
    return Response({"ok": True, **c})


@api_view(["POST"])
@permission_classes([AllowAny])
def send_email_otp(request):
    """
    Verifies CAPTCHA first, then generates a 6-digit OTP and sends it to the user's email
    via Gmail SMTP (`EMAIL_HOST_USER` & `EMAIL_HOST_PASSWORD` in `backend/.env`).
    """
    d = request.data
    email = str(d.get("email") or "").strip().lower()
    purpose = str(d.get("purpose") or "parent_register").strip()
    captcha_token = str(d.get("captchaToken") or "").strip()
    captcha_answer = str(d.get("captchaAnswer") or "").strip()

    if not _verify_captcha(captcha_token, captcha_answer):
        return _err("Invalid or expired security code (CAPTCHA). Please refresh and try again.", code="INVALID_CAPTCHA")

    if not email or "@" not in email or "." not in email.split("@")[-1]:
        return _err("Please enter a valid email address.")

    if purpose in ("parent_register", "school_register"):
        if User.objects.filter(email__iexact=email).exists() or SchoolAccount.objects.filter(email__iexact=email).exists():
            return _err("This email address is already registered. Please sign in instead.")
    elif purpose == "forgot_password":
        user_exists = User.objects.filter(email__iexact=email).exists() or SchoolAccount.objects.filter(email__iexact=email).exists()
        if not user_exists:
            return _err("No registered account found with this email address. Please check your email or sign up.")

    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = timezone.now() + timedelta(minutes=10)
    EmailOTP.objects.filter(email__iexact=email, is_verified=False).delete()
    EmailOTP.objects.create(
        email=email,
        otp_code=otp_code,
        purpose=purpose if purpose in ("school_register", "parent_register", "forgot_password") else "parent_register",
        expires_at=expires_at,
    )

    if purpose == "forgot_password":
        subject = f"{otp_code} is your VidyaVista Password Reset Code"
        role_label = "Password Reset"
        text_body = (
            f"Hello,\n\n"
            f"Your 6-digit verification code to reset your VidyaVista account password is: {otp_code}\n\n"
            f"This code is valid for 10 minutes. If you did not request a password reset, please ignore this email.\n\n"
            f"Regards,\nVidyaVista Team"
        )
    else:
        subject = f"{otp_code} is your VidyaVista Email Verification Code"
        role_label = "School Owner / Institution" if purpose == "school_register" else "Parent / Student"
        text_body = (
            f"Hello,\n\n"
            f"Your 6-digit verification code for {role_label} registration on VidyaVista is: {otp_code}\n\n"
            f"This code is valid for 10 minutes. Please do not share this code with anyone.\n\n"
            f"Regards,\nVidyaVista Team"
        )
    html_body = f"""
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:540px;margin:0 auto;padding:28px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;color:#0f172a;">
      <div style="border-bottom:2px solid #0A5C91;padding-bottom:14px;margin-bottom:20px;">
        <h2 style="margin:0;color:#0A5C91;font-size:22px;">VidyaVista Verification</h2>
        <p style="margin:4px 0 0;color:#64748b;font-size:13px;">{role_label} Account Registration</p>
      </div>
      <p style="font-size:14px;line-height:1.6;color:#334155;">Please use the following 6-digit verification code to verify your email address on VidyaVista:</p>
      <div style="margin:24px 0;padding:18px;background:#f0f8ff;border:1px dashed #0795DC;border-radius:12px;text-align:center;">
        <span style="font-size:30px;font-weight:800;letter-spacing:8px;color:#0A5C91;">{otp_code}</span>
      </div>
      <p style="font-size:12px;color:#64748b;">This code will expire in 10 minutes. If you did not request this verification, you can safely ignore this email.</p>
    </div>
    """

    smtp_user = getattr(settings, "EMAIL_HOST_USER", "")
    smtp_pass = getattr(settings, "EMAIL_HOST_PASSWORD", "")
    email_sent = False
    smtp_error = ""

    if smtp_user and smtp_pass and "your-" not in smtp_user and "example" not in smtp_user:
        try:
            send_mail(
                subject=subject,
                message=text_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                html_message=html_body,
                fail_silently=False,
            )
            email_sent = True
        except Exception as exc:
            smtp_error = str(exc)

    if email_sent:
        return Response({
            "ok": True,
            "emailSent": True,
            "message": f"A 6-digit verification code has been sent to {email}.",
        })

    # If SMTP is not yet configured in .env or failed, return clear guidance
    if smtp_error:
        return _err(f"Could not send verification email via Gmail SMTP: {smtp_error}. Please verify EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in backend/.env.")

    return Response({
        "ok": True,
        "emailSent": False,
        "devOtpPreview": otp_code,
        "message": f"Verification code generated for {email}. (Add EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in backend/.env to send via Gmail; temporary test code: {otp_code})",
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_email_otp(request):
    """Checks the 6-digit OTP entered by the user before completing registration."""
    email = str(request.data.get("email") or "").strip().lower()
    otp_code = str(request.data.get("otpCode") or "").strip()
    if not email or not otp_code:
        return _err("Please enter both email address and 6-digit verification code.")

    record = EmailOTP.objects.filter(email__iexact=email, otp_code=otp_code).order_by("-created_at").first()
    if not record:
        return _err("Invalid verification code. Please check the 6-digit code sent to your email.")
    if record.is_expired:
        return _err("This verification code has expired. Please click 'Send OTP' again.")

    record.is_verified = True
    record.save(update_fields=["is_verified"])
    return Response({"ok": True, "verified": True, "message": "Email address verified successfully."})


@api_view(["POST"])
@permission_classes([AllowAny])
def register_parent(request):
    d = request.data
    parent_name = (d.get("parentName") or d.get("name") or "").strip()
    student_name = (d.get("studentName") or "").strip()
    mobile = re.sub(r"\D", "", str(d.get("mobile") or ""))[-10:]
    email = (d.get("email") or "").strip().lower()
    otp_code = str(d.get("otpCode") or "").strip()
    captcha_token = str(d.get("captchaToken") or "").strip()
    captcha_answer = str(d.get("captchaAnswer") or "").strip()
    password = str(d.get("password") or "").strip()
    looking_for_class = (d.get("lookingForClass") or d.get("className") or "Class 1").strip()
    admission_type = (d.get("admissionType") or "Boarding School").strip()
    preferred_city = (d.get("preferredCity") or d.get("city") or "").strip()
    preferred_board = (d.get("preferredBoard") or "CBSE").strip()

    if not _verify_captcha(captcha_token, captcha_answer):
        return _err("Invalid or expired security code (CAPTCHA). Please refresh and try again.", code="INVALID_CAPTCHA")
    if len(parent_name) < 2:
        return _err("Please enter your full name.")
    if not re.match(r"^[6-9]\d{9}$", mobile):
        return _err("Please enter a valid 10-digit mobile number.")
    if not email or "@" not in email:
        return _err("Please enter a valid email address.")
    if len(password) < 6:
        return _err("Password must be at least 6 characters.")

    otp_rec = EmailOTP.objects.filter(email__iexact=email, otp_code=otp_code).order_by("-created_at").first()
    if not otp_rec or otp_rec.is_expired:
        return _err("Please verify your email address with a valid 6-digit OTP first.")
    otp_rec.is_verified = True
    otp_rec.save(update_fields=["is_verified"])

    if ParentProfile.objects.filter(mobile=mobile).exists():
        return _err("This mobile number is already registered. Please sign in instead.")
    if User.objects.filter(email__iexact=email).exists():
        return _err("This email is already registered. Please sign in instead.")

    username = f"parent_{mobile}"
    if User.objects.filter(username=username).exists():
        username = f"parent_{mobile}_{User.objects.count() + 1}"

    with transaction.atomic():
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=parent_name[:30],
        )
        ParentProfile.objects.create(
            user=user,
            parent_name=parent_name,
            student_name=student_name,
            mobile=mobile,
            email=email,
            looking_for_class=looking_for_class,
            admission_type=admission_type if admission_type in ("Day", "Boarding School", "Play School") else "Boarding School",
            preferred_city=preferred_city,
            preferred_board=preferred_board if preferred_board in dict(BOARDS) else "CBSE",
        )
        Enquiry.objects.filter(mobile=mobile, parent_user__isnull=True).update(parent_user=user)

    return Response({
        "ok": True,
        "token": _token_for(user),
        "user": _user_role_payload(user),
    }, status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def register_school(request):
    """
    Stage 1 of School Owner Onboarding:
    - Verifies Email OTP and CAPTCHA.
    - Creates the School Owner Profile (`SchoolAccount` + `Owner`) with `status='pending'` (Pending Admin Approval).
    - Once the Admin approves the Owner Profile, the owner can Claim an Existing School or Add a New School from their panel.
    """
    ensure_default_plans()
    d = request.data
    contact_person = (d.get("contactPerson") or d.get("name") or "").strip()
    designation = (d.get("designation") or "Founder / Principal").strip()
    institution_name = (d.get("institutionName") or d.get("schoolName") or "").strip()
    mobile = re.sub(r"\D", "", str(d.get("mobile") or ""))[-10:]
    email = (d.get("email") or "").strip().lower()
    otp_code = str(d.get("otpCode") or "").strip()
    captcha_token = str(d.get("captchaToken") or "").strip()
    captcha_answer = str(d.get("captchaAnswer") or "").strip()
    password = str(d.get("password") or "").strip()
    city = (d.get("city") or "").strip()
    state = (d.get("state") or "").strip()
    claim_proof = (d.get("claimProof") or d.get("affiliationNo") or "").strip()

    if not _verify_captcha(captcha_token, captcha_answer):
        return _err("Invalid or expired security code (CAPTCHA). Please refresh and try again.", code="INVALID_CAPTCHA")
    if len(contact_person) < 2:
        return _err("Please enter the owner / contact person's full name.")
    if not re.match(r"^[6-9]\d{9}$", mobile):
        return _err("Please enter a valid 10-digit mobile number.")
    if not email or "@" not in email:
        return _err("Please enter a valid official email address.")
    if len(password) < 6:
        return _err("Password must be at least 6 characters.")

    otp_rec = EmailOTP.objects.filter(email__iexact=email, otp_code=otp_code).order_by("-created_at").first()
    if not otp_rec or otp_rec.is_expired:
        return _err("Please verify your email address with a valid 6-digit OTP first.")
    otp_rec.is_verified = True
    otp_rec.save(update_fields=["is_verified"])

    if SchoolAccount.objects.filter(Q(mobile=mobile) | Q(email__iexact=email)).exists():
        return _err("A school owner account with this mobile or email already exists. Please sign in.")
    if User.objects.filter(email__iexact=email).exists():
        return _err("This email is already registered. Please sign in.")

    username = f"school_{mobile}"
    if User.objects.filter(username=username).exists():
        username = f"school_{mobile}_{User.objects.count() + 1}"

    with transaction.atomic():
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=contact_person[:30],
        )
        owner_rec = Owner.objects.create(
            name=contact_person,
            designation=designation,
            phone=mobile,
            email=email,
            city=city,
            state=state,
            bio=f"Organization: {institution_name}" if institution_name else "",
            approval_status="pending",
        )
        claim_school = None
        s_id = d.get("schoolId") or d.get("claimSchoolId")
        if s_id:
            try:
                s_id_int = int(s_id)
                claim_school = School.objects.filter(Q(school_id=s_id_int) | Q(pk=s_id_int)).first()
            except (ValueError, TypeError):
                pass
        if not claim_school and institution_name:
            claim_school = School.objects.filter(name__iexact=institution_name).first()

        school_link_status = "pending_claim" if claim_school else "none"
        final_inst_name = claim_school.name if claim_school else (institution_name or f"{contact_person}'s Institution")
        final_city = (city or (claim_school.city if claim_school else "")).strip()
        final_state = (state or (claim_school.state if claim_school else "")).strip()

        SchoolAccount.objects.create(
            user=user,
            owner_record=owner_rec,
            school=None,
            requested_school=claim_school,
            school_link_status=school_link_status,
            institution_name=final_inst_name,
            contact_person=contact_person,
            designation=designation,
            mobile=mobile,
            email=email,
            city=final_city,
            state=final_state,
            claim_proof=claim_proof,
            status="pending",  # Stage 1: Pending Admin Approval for Owner Profile
        )

    return Response({
        "ok": True,
        "token": _token_for(user),
        "user": _user_role_payload(user),
        "message": "Your Owner Profile has been created and submitted for Admin approval.",
    }, status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def portal_login(request):
    """
    Unified login for School Owners, Parents/Students, and Admin.
    Requires valid CAPTCHA + Mobile (10 digits) or Email + Password.
    """
    ident = str(request.data.get("identifier") or request.data.get("email") or request.data.get("mobile") or "").strip()
    password = str(request.data.get("password") or "")
    role_hint = (request.data.get("role") or "").strip()
    captcha_token = str(request.data.get("captchaToken") or "").strip()
    captcha_answer = str(request.data.get("captchaAnswer") or "").strip()

    if not _verify_captcha(captcha_token, captcha_answer):
        return _err("Invalid or expired security code (CAPTCHA). Please refresh and try again.", code="INVALID_CAPTCHA")

    if not ident or not password:
        return _err("Please enter your registered mobile/email and password.")

    digits = re.sub(r"\D", "", ident)
    candidate_users = []

    if role_hint == "school":
        qs = SchoolAccount.objects.select_related("user").filter(
            Q(email__iexact=ident) | (Q(mobile=digits[-10:]) if len(digits) >= 10 else Q(pk=-1))
        )
        candidate_users.extend([sa.user for sa in qs])
    elif role_hint == "parent":
        qs = ParentProfile.objects.select_related("user").filter(
            Q(email__iexact=ident) | (Q(mobile=digits[-10:]) if len(digits) >= 10 else Q(pk=-1))
        )
        candidate_users.extend([pp.user for pp in qs])

    if len(digits) >= 10:
        mob = digits[-10:]
        for sa in SchoolAccount.objects.select_related("user").filter(mobile=mob):
            if sa.user not in candidate_users:
                candidate_users.append(sa.user)
        for pp in ParentProfile.objects.select_related("user").filter(mobile=mob):
            if pp.user not in candidate_users:
                candidate_users.append(pp.user)

    for u in User.objects.filter(Q(email__iexact=ident) | Q(username__iexact=ident)):
        if u not in candidate_users:
            candidate_users.append(u)

    authed_user = None
    for u in candidate_users:
        check = authenticate(request, username=u.get_username(), password=password)
        if check:
            authed_user = check
            break

    if not authed_user:
        return _err("Invalid mobile/email or password. Please try again.", status=401)

    if hasattr(authed_user, "school_account") and authed_user.school_account.status == "suspended":
        return _err("Your institution account is currently suspended. Please contact VidyaVista administration.", status=403)

    from django.contrib.auth.models import update_last_login
    update_last_login(None, authed_user)

    return Response({
        "ok": True,
        "token": _token_for(authed_user),
        "user": _user_role_payload(authed_user),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def portal_me(request):
    return Response({
        "ok": True,
        "user": _user_role_payload(request.user),
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def portal_change_password(request):
    cur = str(request.data.get("currentPassword") or "")
    new = str(request.data.get("newPassword") or "")
    if not request.user.check_password(cur):
        return _err("Current password is incorrect.")
    if len(new) < 6:
        return _err("New password must be at least 6 characters.")
    request.user.set_password(new)
    request.user.save()
    return Response({"ok": True, "token": _token_for(request.user), "message": "Password updated successfully."})


@api_view(["POST"])
@permission_classes([AllowAny])
def portal_reset_password(request):
    """
    Resets user password after verifying 6-digit OTP sent to their email.
    Works for both School Owners and Parents.
    """
    d = request.data
    email = str(d.get("email") or "").strip().lower()
    otp_code = str(d.get("otpCode") or "").strip()
    new_password = str(d.get("newPassword") or "").strip()

    if not email or not otp_code or not new_password:
        return _err("Email, 6-digit verification code, and new password are required.")

    if len(new_password) < 6:
        return _err("New password must be at least 6 characters.")

    # 1. Verify OTP in EmailOTP table
    otp = EmailOTP.objects.filter(
        email__iexact=email,
        otp_code=otp_code,
        purpose="forgot_password",
        is_verified=False,
    ).order_by("-created_at").first()

    if not otp:
        return _err("Invalid verification code. Please check your code or request a new one.")

    if otp.is_expired:
        return _err("Verification code has expired (valid for 10 minutes). Please request a new one.")

    # 2. Find User (Parent or School Account)
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        sa = SchoolAccount.objects.filter(email__iexact=email).select_related("user").first()
        if sa and sa.user:
            user = sa.user

    if not user:
        return _err("No user account associated with this email address.")

    # 3. Update Password
    user.set_password(new_password)
    user.save()

    # 4. Mark OTP as verified
    otp.is_verified = True
    otp.save(update_fields=["is_verified"])

    return Response({
        "ok": True,
        "message": "Your password has been reset successfully! You can now sign in with your new password.",
    })



# ============================================================================
# 3. SCHOOL / INSTITUTION PANEL ENDPOINTS & 3-STAGE ADMIN APPROVAL HELPERS
# ============================================================================

def _get_school_account(request):
    if hasattr(request.user, "school_account"):
        return request.user.school_account
    return None


def approve_owner_profile(sa: SchoolAccount, admin_user=None):
    """Stage 1 Approval: Admin approves the School Owner's Profile."""
    sa.status = "approved"
    sa.rejection_reason = ""
    if admin_user and getattr(admin_user, "pk", None):
        sa.approved_by = admin_user
    sa.approved_at = timezone.now()
    sa.save()
    if sa.school:
        School.objects.filter(pk=sa.school.pk).update(verified=True)
    if sa.owner_record:
        School.objects.filter(owner=sa.owner_record).update(verified=True)
    return sa


def approve_school_link(sa: SchoolAccount, admin_user=None):
    """
    Stage 2 Approval: Admin approves the Owner's request to Claim an Existing School
    OR Add a New School.
    """
    with transaction.atomic():
        if sa.status != "approved":
            sa.status = "approved"
        if sa.school_link_status == "pending_claim" and sa.requested_school:
            target = sa.requested_school
            sa.school = target
            sa.institution_name = target.name
            sa.city = target.city or sa.city
            sa.state = target.state or sa.state
            sa.school_link_status = "approved"
            sa.sync_owner_record()
            if sa.owner_record_id:
                School.objects.filter(pk=target.pk).update(owner_id=sa.owner_record_id, isActive=True, verified=True)
                target.owner_id = sa.owner_record_id
        elif sa.school_link_status == "pending_new" or (not sa.school and sa.pending_new_school_data):
            nd = sa.pending_new_school_data or {}
            name = (nd.get("name") or sa.institution_name or f"{sa.contact_person} School").strip()
            city = (nd.get("city") or sa.city or "Delhi").strip()
            state = (nd.get("state") or sa.state or "").strip()
            board = (nd.get("board") or "CBSE").strip()
            stype = (nd.get("type") or "Day").strip()
            target = School.objects.create(
                name=name[:240],
                owner=sa.owner_record,
                area=(nd.get("area") or city or "Main Campus")[:180],
                city=city[:120],
                state=state[:120],
                address=(nd.get("address") or sa.address or "")[:400],
                pincode=(nd.get("pincode") or "")[:10],
                board=board if board in dict(BOARDS) else "CBSE",
                type=stype if stype in ("Day", "Boarding School", "Play School") else "Day",
                phone=(nd.get("phone") or sa.mobile)[:10],
                email=(nd.get("email") or sa.email),
                affiliation_no=(nd.get("affiliationNo") or sa.claim_proof or "")[:60],
                isActive=True,
            )
            sa.school = target
            sa.institution_name = target.name
            sa.city = target.city
            sa.state = target.state
            sa.school_link_status = "approved"
        elif sa.school:
            sa.school_link_status = "approved"

        if admin_user and getattr(admin_user, "pk", None):
            sa.approved_by = admin_user
        sa.approved_at = timezone.now()
        sa.save()

        if sa.school:
            Enquiry.objects.filter(
                Q(schoolId=sa.school.school_id) | Q(schoolName__iexact=sa.school.name),
                school__isnull=True,
            ).update(school=sa.school, schoolId=sa.school.school_id)
    return sa


def approve_school_edits(sa: SchoolAccount, admin_user=None):
    """
    Stage 3 Approval: Admin approves the School Owner's staged profile edits (`pending_edit_data`)
    and publishes them to the live `School` listing on the public website.
    """
    if not sa.school:
        if sa.school_link_status in ("pending_claim", "pending_new"):
            approve_school_link(sa, admin_user=admin_user)
        if not sa.school:
            return sa

    d = sa.pending_edit_data or {}
    if not d:
        sa.edit_approval_status = "approved"
        sa.save(update_fields=["edit_approval_status"])
        return sa

    s = sa.school
    with transaction.atomic():
        if "name" in d and str(d["name"]).strip():
            s.name = str(d["name"]).strip()[:240]
            sa.institution_name = s.name
        for field, key in (
            ("area", "area"), ("city", "city"), ("state", "state"),
            ("address", "address"), ("pincode", "pincode"),
            ("board", "board"), ("type", "type"), ("gender", "gender"),
            ("grade_from", "gradeFrom"), ("grade_to", "gradeTo"),
            ("admission_status", "admissionStatus"),
            ("current_admission_session", "admissionSession"),
        ):
            if key in d and d[key] is not None:
                setattr(s, field, str(d[key]).strip())

        if "contactPerson" in d and str(d["contactPerson"]).strip():
            sa.contact_person = str(d["contactPerson"]).strip()[:120]
        if "designation" in d:
            sa.designation = str(d["designation"] or "")[:80]
        for field, key in (
            ("phone", "phone"), ("landline", "landline"), ("email", "email"),
            ("website", "website"), ("youtube_url", "youtubeUrl"),
            ("facebook_url", "facebookUrl"), ("instagram_url", "instagramUrl"),
            ("linkedin_url", "linkedinUrl"),
        ):
            if key in d and d[key] is not None:
                val = str(d[key]).strip()
                if field == "phone":
                    val = re.sub(r"\D", "", val)[-10:]
                elif field == "landline":
                    val = re.sub(r"\D", "", val)[:13]
                setattr(s, field, val)

        for field, key in (
            ("medium", "medium"), ("student_teacher_ratio", "studentTeacherRatio"),
            ("school_timing", "schoolTiming"), ("affiliation_no", "affiliationNo"),
            ("campus", "campus"), ("about", "about"), ("feeNote", "feeNote"),
        ):
            if key in d and d[key] is not None:
                setattr(s, field, str(d[key]).strip())

        for int_field, key in (("established", "established"), ("students", "students"), ("teachers", "teachers"), ("feeMin", "feeMin"), ("feeMax", "feeMax")):
            if key in d:
                try:
                    v = int(str(d[key]).replace(",", "").strip()) if str(d[key] or "").strip() else None
                except ValueError:
                    v = None
                if int_field in ("feeMin", "feeMax"):
                    setattr(s, int_field, v or 0)
                else:
                    setattr(s, int_field, v)

        if "facilities" in d and isinstance(d["facilities"], list):
            s.facilities = [str(x).strip() for x in d["facilities"] if str(x).strip()]

        if "image" in d and d["image"] is not None:
            s.image = str(d["image"]).strip()[:1000]
        if "logoUrl" in d and d["logoUrl"] is not None:
            s.logo_url = str(d["logoUrl"]).strip()[:1000]
        if "brochureUrl" in d and d["brochureUrl"] is not None:
            sa.brochure_url = str(d["brochureUrl"]).strip()[:1000]

        s.page_last_updated = timezone.localdate()
        s.save()

        if "feeComponents" in d and isinstance(d["feeComponents"], list):
            s.fee_components.all().delete()
            rows = []
            for fc in d["feeComponents"]:
                name = str(fc.get("name") or "").strip()
                try:
                    amt = int(str(fc.get("amount") or 0).replace(",", ""))
                except ValueError:
                    amt = 0
                if name and amt > 0:
                    rows.append(FeeComponent(
                        school=s,
                        session=str(fc.get("session") or "2027-28")[:10],
                        class_name=str(fc.get("className") or "")[:20],
                        name=name[:120],
                        frequency=fc.get("frequency") if fc.get("frequency") in ("One-time", "Monthly", "Annually") else "Annually",
                        amount=amt,
                    ))
            FeeComponent.objects.bulk_create(rows)

        if "awards" in d and isinstance(d["awards"], list):
            s.award_items.all().delete()
            SchoolAward.objects.bulk_create([
                SchoolAward(
                    school=s,
                    name=str(a.get("name") or "").strip()[:240],
                    position=str(a.get("position") or "").strip()[:120],
                    year=str(a.get("year") or "").strip()[:10],
                    order=i,
                )
                for i, a in enumerate(d["awards"]) if str(a.get("name") or "").strip()
            ])

        if "videos" in d and isinstance(d["videos"], list):
            s.video_items.all().delete()
            SchoolVideo.objects.bulk_create([
                SchoolVideo(
                    school=s,
                    title=str(v.get("title") or "Campus Video").strip()[:200],
                    youtube_url=str(v.get("youtubeUrl") or "").strip()[:500],
                    is_approved=True,
                )
                for v in d["videos"] if str(v.get("youtubeUrl") or "").strip()
            ])

        if "photos" in d and isinstance(d["photos"], list):
            s.photo_items.all().delete()
            SchoolPhoto.objects.bulk_create([
                SchoolPhoto(
                    school=s,
                    image_url=str(p.get("url") or "").strip()[:1000],
                    caption=str(p.get("caption") or "").strip()[:160],
                    order=i,
                    is_approved=True,
                )
                for i, p in enumerate(d["photos"]) if str(p.get("url") or "").strip()
            ])

        sa.city = s.city
        sa.state = s.state
        sa.edit_approval_status = "approved"
        sa.edit_rejection_reason = ""
        sa.pending_edit_data = {}
        if admin_user and getattr(admin_user, "pk", None):
            sa.approved_by = admin_user
        sa.approved_at = timezone.now()
        sa.save()
    return sa


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def school_request_claim_or_new(request):
    """
    Stage 2: Once the Owner Profile is approved by Admin (`sa.status == 'approved'`),
    the owner can either:
    - `mode == 'claim'`: Request to claim an existing school from the 10,000+ schools (`schoolId`, `claimProof`).
    - `mode == 'new'`: Submit a new school (`name`, `board`, `type`, `city`, `state`, `area`, `address`, `phone`, `email`, `affiliationNo`).
    Both requests go to Admin Panel for approval before going live!
    """
    sa = _get_school_account(request)
    if not sa:
        return _err("School owner account not found.", status=403)
    if sa.status != "approved":
        return _err("Your Owner Profile is currently pending Admin approval. Once approved, you can add or claim a school.", status=403)

    d = request.data
    mode = str(d.get("mode") or "claim").strip()

    if mode == "claim":
        sid = d.get("schoolId")
        proof = str(d.get("claimProof") or sa.claim_proof or "").strip()
        target = School.objects.filter(school_id=sid).first() if sid else None
        if not target:
            return _err("Please select an existing school from the search list to claim.")
        sa.requested_school = target
        sa.institution_name = target.name
        sa.city = target.city or sa.city
        sa.state = target.state or sa.state
        if proof:
            sa.claim_proof = proof[:300]
        sa.school_link_status = "pending_claim"
        sa.rejection_reason = ""
        sa.save()
        return Response({
            "ok": True,
            "message": f"Your claim request for '{target.name}' has been submitted for Admin approval.",
            "schoolLinkStatus": sa.school_link_status,
        })

    # mode == "new"
    name = str(d.get("name") or d.get("institutionName") or "").strip()
    city = str(d.get("city") or sa.city or "").strip()
    state = str(d.get("state") or sa.state or "").strip()
    board = str(d.get("board") or "CBSE").strip()
    stype = str(d.get("type") or "Day").strip()
    area = str(d.get("area") or city or "Main Campus").strip()
    address = str(d.get("address") or "").strip()
    pincode = str(d.get("pincode") or "").strip()
    phone = re.sub(r"\D", "", str(d.get("phone") or sa.mobile))[-10:]
    email = str(d.get("email") or sa.email).strip()
    affiliation_no = str(d.get("affiliationNo") or d.get("claimProof") or "").strip()

    if len(name) < 3 or not city:
        return _err("Please enter the full school name and city.")

    sa.pending_new_school_data = {
        "name": name,
        "city": city,
        "state": state,
        "area": area,
        "address": address,
        "pincode": pincode,
        "board": board,
        "type": stype,
        "phone": phone,
        "email": email,
        "affiliationNo": affiliation_no,
    }
    sa.institution_name = name[:240]
    sa.city = city[:120]
    sa.state = state[:120]
    if affiliation_no:
        sa.claim_proof = affiliation_no[:300]
    sa.school_link_status = "pending_new"
    sa.rejection_reason = ""
    sa.save()
    return Response({
        "ok": True,
        "message": f"Your new school submission '{name}' has been sent to Admin for approval.",
        "schoolLinkStatus": sa.school_link_status,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def school_dashboard(request):
    sa = _get_school_account(request)
    if not sa:
        return _err("School account not found for this login.", status=403)

    ensure_default_plans()
    if not sa.school and sa.requested_school and sa.school_link_status == "approved":
        sa.school = sa.requested_school
        sa.save(update_fields=["school"])

    s = sa.school
    req_s = sa.requested_school
    preview_s = s or req_s
    draft = sa.pending_edit_data or {}
    new_school_draft = sa.pending_new_school_data or {}

    enquiries_qs = Enquiry.objects.none()
    if s and sa.school_link_status == "approved":
        Enquiry.objects.filter(
            Q(schoolId=s.school_id) | Q(schoolId=s.pk) | (Q(schoolName__iexact=s.name) & Q(city__iexact=s.city)),
            school__isnull=True,
        ).update(school=s, schoolId=s.school_id or s.pk)
        enquiries_qs = Enquiry.objects.filter(
            Q(school=s) | Q(schoolId=s.school_id) | Q(schoolId=s.pk) | (Q(schoolName__iexact=s.name) & Q(city__iexact=s.city))
        ).distinct().order_by("-created_at")

    total_leads = enquiries_qs.count()
    pending_leads = enquiries_qs.filter(is_unlocked=False, school_status="pending").count()
    unlocked_leads = enquiries_qs.filter(is_unlocked=True).count()
    rejected_leads = enquiries_qs.filter(school_status="rejected").count()
    review_req_leads = enquiries_qs.filter(school_status="review_requested").count()

    active_mems = list(sa.active_memberships())
    primary_mem = active_mems[0] if active_mems else None

    leads_total = sa.total_leads_quota()
    leads_used = sa.total_leads_used()
    leads_remaining = sa.total_leads_remaining()

    # Build onboarding wizard checklist (checking both live school and pending draft)
    checklist = [
        {"step": 1, "label": "Basic School Details & Location", "done": bool(draft.get("name") or (preview_s and preview_s.name and preview_s.city))},
        {"step": 2, "label": "Contact & Social Media Links", "done": bool(draft.get("phone") or (preview_s and (preview_s.phone or preview_s.landline)))},
        {"step": 3, "label": "Academics, Timing & About School", "done": bool((draft.get("about") and len(str(draft.get("about"))) >= 30) or (preview_s and preview_s.about and len(preview_s.about) >= 30))},
        {"step": 4, "label": "Campus Facilities", "done": bool(draft.get("facilities") or (preview_s and preview_s.facilities))},
        {"step": 5, "label": "Class-wise Fee Structure", "done": bool(draft.get("feeMin") or draft.get("feeComponents") or (preview_s and (preview_s.feeMin or preview_s.fee_components.exists())))},
        {"step": 6, "label": "Awards & Recognitions", "done": bool(draft.get("awards") or (preview_s and preview_s.award_items.exists()))},
        {"step": 7, "label": "Campus Video Links (YouTube)", "done": bool(draft.get("videos") or draft.get("youtubeUrl") or (preview_s and (preview_s.video_items.exists() or preview_s.youtube_url)))},
        {"step": 8, "label": "School Gallery Photos", "done": bool(draft.get("photos") or draft.get("image") or (preview_s and (preview_s.cover_image or preview_s.image or preview_s.photo_items.exists())))},
        {"step": 9, "label": "Official Logo & Brochure", "done": bool(draft.get("logoUrl") or draft.get("brochureUrl") or (preview_s and preview_s.logo_url) or sa.logo_file or sa.brochure_url or sa.brochure_file)},
        {"step": 10, "label": "Affiliation & Verification Details", "done": bool(draft.get("affiliationNo") or draft.get("established") or (preview_s and (preview_s.affiliation_no or preview_s.established)))},
    ]

    school_data = None
    if preview_s or new_school_draft or draft:
        base_dict = {
            "schoolId": preview_s.school_id if preview_s else None,
            "slug": preview_s.slug if preview_s else "",
            "name": (preview_s.name if preview_s else new_school_draft.get("name")) or sa.institution_name,
            "area": (preview_s.area if preview_s else new_school_draft.get("area")) or "",
            "city": (preview_s.city if preview_s else new_school_draft.get("city")) or sa.city,
            "state": (preview_s.state if preview_s else new_school_draft.get("state")) or sa.state,
            "pincode": (preview_s.pincode if preview_s else new_school_draft.get("pincode")) or "",
            "address": (preview_s.address if preview_s else new_school_draft.get("address")) or sa.address,
            "board": (preview_s.board if preview_s else new_school_draft.get("board")) or "CBSE",
            "type": (preview_s.type if preview_s else new_school_draft.get("type")) or "Day",
            "gender": preview_s.gender if preview_s else "Co-ed",
            "gradeFrom": preview_s.grade_from if preview_s else "Nursery",
            "gradeTo": preview_s.grade_to if preview_s else "Class 12",
            "grades": preview_s.grades if preview_s else "Nursery - Class 12",
            "established": preview_s.established if preview_s else None,
            "students": preview_s.students if preview_s else None,
            "teachers": preview_s.teachers if preview_s else None,
            "studentTeacherRatio": preview_s.student_teacher_ratio if preview_s else "",
            "schoolTiming": preview_s.school_timing if preview_s else "",
            "campus": preview_s.campus if preview_s else "",
            "affiliationNo": (preview_s.affiliation_no if preview_s else new_school_draft.get("affiliationNo")) or sa.claim_proof,
            "medium": (preview_s.medium or preview_s.instruction_language) if preview_s else "English",
            "admissionStatus": preview_s.admission_status if preview_s else "open",
            "admissionSession": (preview_s.current_admission_session if preview_s else "") or "2027-28",
            "phone": (preview_s.phone if preview_s else new_school_draft.get("phone")) or sa.mobile,
            "landline": preview_s.landline if preview_s else "",
            "email": (preview_s.email if preview_s else new_school_draft.get("email")) or sa.email,
            "website": preview_s.website if preview_s else "",
            "youtubeUrl": preview_s.youtube_url if preview_s else "",
            "facebookUrl": preview_s.facebook_url if preview_s else "",
            "instagramUrl": preview_s.instagram_url if preview_s else "",
            "linkedinUrl": preview_s.linkedin_url if preview_s else "",
            "about": preview_s.about if preview_s else "",
            "feeMin": (preview_s.feeMin or preview_s.fee) if preview_s else 0,
            "feeMax": preview_s.feeMax if preview_s else 0,
            "feeNote": preview_s.feeNote if preview_s else "",
            "facilities": (preview_s.facilities or []) if preview_s else [],
            "image": file_or_url(request, preview_s.cover_image, preview_s.image) if preview_s else "",
            "logoUrl": file_or_url(request, sa.logo_file, preview_s.logo_url if preview_s else ""),
            "brochureUrl": file_or_url(request, sa.brochure_file, sa.brochure_url),
            "isFeatured": preview_s.isFeatured if preview_s else False,
            "isRecommended": preview_s.isRecommended if preview_s else False,
            "topRated": preview_s.topRated if preview_s else False,
            "verified": preview_s.verified if preview_s else False,
            "rating": float(preview_s.rating or 0) if preview_s else 0,
            "reviewsCount": preview_s.reviews if preview_s else 0,
            "shortlistsCount": preview_s.shortlisted_by.count() if preview_s else 0,
            "feeComponents": [
                {"id": fc.pk, "session": fc.session, "className": fc.class_name, "name": fc.name, "frequency": fc.frequency, "amount": fc.amount}
                for fc in (preview_s.fee_components.all() if preview_s else [])
            ],
            "awards": [
                {"id": aw.pk, "name": aw.name, "position": aw.position, "year": aw.year}
                for aw in (preview_s.award_items.all() if preview_s else [])
            ],
            "videos": [
                {"id": vd.pk, "title": vd.title, "youtubeUrl": vd.youtube_url, "isApproved": vd.is_approved}
                for vd in (preview_s.video_items.all() if preview_s else [])
            ],
            "photos": [
                {"id": ph.pk, "url": file_or_url(request, ph.image, ph.image_url), "caption": ph.caption, "isApproved": ph.is_approved}
                for ph in (preview_s.photo_items.all() if preview_s else [])
            ],
            "reviews": [
                {
                    "id": rv.pk,
                    "name": rv.name,
                    "role": rv.role,
                    "rating": rv.rating,
                    "text": rv.text,
                    "isApproved": rv.is_approved,
                    "schoolReply": rv.school_reply,
                    "createdAt": rv.created_at.date().isoformat(),
                }
                for rv in (preview_s.review_items.all()[:30] if preview_s else [])
            ],
        }
        # Overlay any staged/pending edits ONLY if the draft was submitted for THIS active school!
        draft_school_id = draft.get("school_id")
        draft_school_name = draft.get("name")
        draft_matches = False
        if preview_s:
            if draft_school_id and (draft_school_id == preview_s.pk or draft_school_id == preview_s.school_id):
                draft_matches = True
            elif not draft_school_id and draft_school_name and draft_school_name.strip().lower() == preview_s.name.strip().lower():
                draft_matches = True

        if draft_matches:
            for k, v in draft.items():
                if k in base_dict and v is not None:
                    base_dict[k] = v
        school_data = base_dict

        # Build managedSchools list (Active school + Owner branches + Approved claims)
    managed_schools = []
    seen_ids = set()

    if s and sa.school_link_status == "approved":
        seen_ids.add(s.pk)
        managed_schools.append({
            "id": s.pk,
            "schoolId": s.school_id or s.pk,
            "name": s.name,
            "city": s.city,
            "area": s.area,
            "board": s.board,
            "type": s.type,
            "image": file_or_url(request, s.cover_image, s.image),
            "status": "approved",
            "isActive": True,
        })

    if sa.owner_record:
        for sc in sa.owner_record.schools.all():
            if sc.pk not in seen_ids:
                seen_ids.add(sc.pk)
                managed_schools.append({
                    "id": sc.pk,
                    "schoolId": sc.school_id or sc.pk,
                    "name": sc.name,
                    "city": sc.city,
                    "area": sc.area,
                    "board": sc.board,
                    "type": sc.type,
                    "image": file_or_url(request, sc.cover_image, sc.image),
                    "status": "approved",
                    "isActive": bool(s and sc.pk == s.pk),
                })

    for bc in BranchClaim.objects.filter(account=sa, status="approved").select_related("school"):
        if bc.school and bc.school.pk not in seen_ids:
            seen_ids.add(bc.school.pk)
            managed_schools.append({
                "id": bc.school.pk,
                "schoolId": bc.school.school_id or bc.school.pk,
                "name": bc.school.name,
                "city": bc.school.city,
                "area": bc.school.area,
                "board": bc.school.board,
                "type": bc.school.type,
                "image": file_or_url(request, bc.school.cover_image, bc.school.image),
                "status": "approved",
                "isActive": bool(s and bc.school.pk == s.pk),
            })

    # Pending branch claims for this owner
    pending_branch_claims = []
    for bc in BranchClaim.objects.filter(account=sa, status="pending").select_related("school"):
        if bc.school:
            pending_branch_claims.append({
                "id": bc.school.pk,
                "schoolId": bc.school.school_id or bc.school.pk,
                "name": bc.school.name,
                "city": bc.school.city,
                "area": bc.school.area,
                "board": bc.school.board,
                "type": bc.school.type,
                "image": file_or_url(request, bc.school.cover_image, bc.school.image),
                "proof": bc.proof,
                "status": "pending",
                "createdAt": bc.created_at.date().isoformat() if bc.created_at else "",
            })

    all_memberships = [membership_json(m) for m in (s.memberships.all() if s else [])]
    all_invoices = [invoice_json(inv) for inv in (s.invoices.all() if s else [])]

    return Response({
        "ok": True,
        "account": {
            "id": sa.pk,
            "institutionName": s.name if s else (sa.school.name if sa.school else (sa.requested_school.name if sa.requested_school else sa.institution_name)),
            "contactPerson": sa.contact_person,
            "designation": sa.designation,
            "mobile": sa.mobile,
            "email": sa.email,
            "city": sa.city,
            "state": sa.state,
            "claimProof": sa.claim_proof,
            "status": sa.status,
            "schoolLinkStatus": sa.school_link_status,
            "editApprovalStatus": sa.edit_approval_status,
            "editSubmittedAt": sa.edit_submitted_at.isoformat() if sa.edit_submitted_at else None,
            "editRejectionReason": sa.edit_rejection_reason,
            "rejectionReason": sa.rejection_reason,
            "requestedSchoolName": sa.requested_school.name if sa.requested_school else (new_school_draft.get("name") or ""),
            "wizardStep": sa.wizard_step,
            "profileCompletion": sa.profile_completion,
            "checklist": checklist,
        },
        "school": school_data,
        "credits": {
            "hasActivePlan": bool(primary_mem),
            "activePlanName": primary_mem.plan_name if primary_mem else "Free Basic Listing (Contacts Masked)",
            "daysRemaining": primary_mem.days_remaining if primary_mem else 0,
            "endDate": primary_mem.end_date.isoformat() if (primary_mem and primary_mem.end_date) else None,
            "leadsTotal": leads_total,
            "leadsUsed": leads_used,
            "leadsRemaining": leads_remaining,
        },
        "stats": {
            "totalLeads": total_leads,
            "pendingLeads": pending_leads,
            "unlockedLeads": unlocked_leads,
            "rejectedLeads": rejected_leads,
            "reviewRequestedLeads": review_req_leads,
            "shortlists": s.shortlisted_by.count() if s else 0,
            "reviews": s.reviews if s else 0,
        },
        "recentLeads": [lead_for_school_json(e) for e in enquiries_qs[:25]],
        "memberships": all_memberships,
        "invoices": all_invoices,
        "plans": [plan_json(p) for p in Plan.objects.filter(is_active=True)],
        "managedSchools": managed_schools,
        "pendingBranchClaims": pending_branch_claims,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def school_leads_list(request):
    sa = _get_school_account(request)
    if not sa:
        return _err("School account not found.", status=403)
    if not sa.school and sa.requested_school and sa.school_link_status == "approved":
        sa.school = sa.requested_school
        sa.save(update_fields=["school"])
    if not sa.school:
        return _err("School account not linked or pending approval.", status=403)
    s = sa.school
    qs = Enquiry.objects.filter(
        Q(school=s) | Q(schoolId=s.school_id) | Q(schoolId=s.pk) | (Q(schoolName__iexact=s.name) & Q(city__iexact=s.city))
    ).distinct().order_by("-created_at")

    st = (request.query_params.get("status") or "").strip()
    if st == "unlocked":
        qs = qs.filter(is_unlocked=True)
    elif st == "locked":
        qs = qs.filter(is_unlocked=False)
    elif st in ("pending", "accepted", "rejected", "review_requested", "refunded"):
        qs = qs.filter(school_status=st)

    q = (request.query_params.get("q") or "").strip()
    if q:
        qs = qs.filter(Q(parentName__icontains=q) | Q(childName__icontains=q) | Q(className__icontains=q) | Q(city__icontains=q))

    return Response({
        "ok": True,
        "leadsRemaining": sa.total_leads_remaining(),
        "data": [lead_for_school_json(e) for e in qs[:200]],
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def school_unlock_lead(request, lead_id):
    """
    Accepts / Unlocks a Lead for the School.
    - If already unlocked: returns the unlocked lead immediately.
    - If locked: checks if the school has `leads_remaining > 0`.
      - If 0 credits: returns 402 with `code: 'NO_CREDITS'` so the frontend opens the Upgrade / Top-up Recharge modal.
      - If >0 credits: deducts 1 credit from the active membership, unlocks the contact number & email, and returns full details.
    """
    sa = _get_school_account(request)
    if not sa or not sa.school:
        return _err("School is not yet linked or approved.", status=403)
    if sa.status != "approved" or sa.school_link_status != "approved":
        return _err("Your account or school claim is pending Admin approval.", status=403)

    s = sa.school
    lead = Enquiry.objects.filter(pk=lead_id).filter(Q(school=s) | Q(schoolId=s.school_id)).first()
    if not lead:
        return _err("Lead not found.", status=404)

    if lead.is_unlocked:
        return Response({
            "ok": True,
            "message": "Lead is already unlocked.",
            "leadsRemaining": sa.total_leads_remaining(),
            "lead": lead_for_school_json(lead),
        })

    today = timezone.localdate()
    active_mem = None
    for m in s.memberships.filter(status="active", end_date__gte=today).order_by("end_date", "id"):
        if m.leads_remaining > 0:
            active_mem = m
            break

    if not active_mem:
        return Response({
            "ok": False,
            "code": "NO_CREDITS",
            "message": "You have 0 lead credits remaining. Please subscribe to a 1-Year Membership Plan (100 Leads) or add a Lead Booster Pack (+50 / +100 Leads) to unlock parent contact details.",
            "leadsRemaining": 0,
        }, status=402)

    with transaction.atomic():
        active_mem.leads_used += 1
        active_mem.save()

        lead.is_unlocked = True
        lead.unlocked_at = timezone.now()
        lead.credit_used = True
        lead.school_status = "accepted"
        lead.status = "contacted"
        lead.save()

    return Response({
        "ok": True,
        "message": f"Lead unlocked successfully. 1 credit used ({sa.total_leads_remaining()} credits remaining).",
        "leadsRemaining": sa.total_leads_remaining(),
        "lead": lead_for_school_json(lead),
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def school_update_lead(request, lead_id):
    """Update lead status (reject, pending, request_review for invalid lead) or save school follow-up note."""
    sa = _get_school_account(request)
    if not sa or not sa.school:
        return _err("School account not found.", status=403)
    s = sa.school
    lead = Enquiry.objects.filter(pk=lead_id).filter(Q(school=s) | Q(schoolId=s.school_id)).first()
    if not lead:
        return _err("Lead not found.", status=404)

    d = request.data
    action = d.get("action")
    if action == "reject":
        lead.school_status = "rejected"
        lead.rejection_reason = str(d.get("reason") or "Seat not available / Not matching criteria")[:300]
    elif action == "request_review":
        if not lead.is_unlocked:
            return _err("Only unlocked leads can be submitted for credit refund review.")
        lead.school_status = "review_requested"
        lead.review_reason = str(d.get("reason") or "Invalid phone number / Parent not reachable")[:500]
    elif action == "pending":
        if not lead.is_unlocked:
            lead.school_status = "pending"

    if "schoolNote" in d:
        lead.school_note = str(d.get("schoolNote") or "")[:1000]
    if "followupDate" in d:
        fd = str(d.get("followupDate") or "").strip()
        lead.followup_date = fd if re.match(r"^\d{4}-\d{2}-\d{2}$", fd) else None

    lead.save()
    return Response({"ok": True, "lead": lead_for_school_json(lead)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def school_save_profile(request):
    """
    Stage 3: Saves any or all steps of the 10-step School Profile Editor as STAGED EDITS (`pending_edit_data`)
    with `edit_approval_status = 'pending'`.
    Changes are sent to the Admin Panel for approval and only update the public website AFTER Admin approves!
    """
    sa = _get_school_account(request)
    if not sa:
        return _err("School owner account not found.", status=403)
    if sa.status != "approved":
        return _err("Your Owner Profile is pending Admin approval. Once approved, you can manage school details.", status=403)

    d = request.data
    draft = dict(sa.pending_edit_data or {})

    allowed_keys = (
        "name", "area", "city", "state", "address", "pincode", "board", "type", "gender",
        "gradeFrom", "gradeTo", "admissionStatus", "admissionSession",
        "contactPerson", "designation", "phone", "landline", "email", "website",
        "youtubeUrl", "facebookUrl", "instagramUrl", "linkedinUrl",
        "medium", "studentTeacherRatio", "schoolTiming", "affiliationNo",
        "campus", "about", "feeNote", "established", "students", "teachers",
        "feeMin", "feeMax", "facilities", "image", "logoUrl", "brochureUrl",
        "feeComponents", "awards", "videos", "photos",
    )
    for k in allowed_keys:
        if k in d and d[k] is not None:
            draft[k] = d[k]

    if "contactPerson" in d and str(d["contactPerson"]).strip():
        sa.contact_person = str(d["contactPerson"]).strip()[:120]
    if "designation" in d:
        sa.designation = str(d["designation"] or "")[:80]
    if "wizardStep" in d:
        try:
            sa.wizard_step = max(1, min(10, int(d["wizardStep"])))
        except ValueError:
            pass

    if sa.school:
        draft["school_id"] = sa.school.pk
    sa.pending_edit_data = draft
    sa.edit_approval_status = "pending"
    sa.edit_submitted_at = timezone.now()
    sa.edit_rejection_reason = ""
    sa.save()

    return Response({
        "ok": True,
        "message": "Your school profile changes have been saved and submitted for Admin approval. They will appear on the public website once approved.",
        "editApprovalStatus": sa.edit_approval_status,
        "profileCompletion": sa.profile_completion,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def school_subscribe_plan(request):
    """
    Allows a school to subscribe to a 1-Year Plan or buy a Lead Booster Recharge Pack (+50 / +100 Leads).
    Creates the `SchoolMembership`, adds the lead credits immediately, updates Featured/Recommended/TopRated badges,
    and generates the GST Invoice (`INV-YYYY-000001`).
    """
    sa = _get_school_account(request)
    if not sa or not sa.school:
        return _err("School account not found.", status=403)

    plan_id = request.data.get("planId")
    payment_mode = request.data.get("paymentMode") or "upi"
    payment_note = str(request.data.get("paymentNote") or "Online Portal Subscription")[:300]
    coupon_code = str(request.data.get("couponCode") or "").strip().upper()

    plan = Plan.objects.filter(pk=plan_id, is_active=True).first()
    if not plan:
        return _err("Selected plan not found.")

    discount = 0
    if coupon_code:
        c = Coupon.objects.filter(code=coupon_code, is_active=True).first()
        if c and (not c.expiry_date or c.expiry_date >= timezone.localdate()) and c.used_count < c.usage_limit:
            discount = c.discount_value if c.discount_type == "flat" else round((plan.price * c.discount_value) / 100)
            discount = min(plan.price, discount)
            c.used_count += 1
            c.save()

    with transaction.atomic():
        mem = SchoolMembership.objects.create(
            school=sa.school,
            plan=plan,
            plan_name=plan.name,
            plan_type=plan.plan_type,
            start_date=timezone.localdate(),
            end_date=timezone.localdate() + timedelta(days=plan.validity_days or 365),
            leads_total=plan.leads_included,
            leads_used=0,
            amount=plan.price,
            discount=discount,
            gst_percent=plan.gst_percent,
            payment_mode=payment_mode if payment_mode in dict(SchoolMembership.PAYMENT_MODES) else "upi",
            payment_note=payment_note,
            coupon_code=coupon_code,
            status="active",
        )

    return Response({
        "ok": True,
        "message": f"{plan.name} activated! +{plan.leads_included} Lead Credits added to your account.",
        "leadsRemaining": sa.total_leads_remaining(),
        "membership": membership_json(mem),
    }, status=201)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def school_reply_review(request, review_id):
    sa = _get_school_account(request)
    if not sa or not sa.school:
        return _err("School account not found.", status=403)
    rv = Review.objects.filter(pk=review_id, school=sa.school).first()
    if not rv:
        return _err("Review not found.", status=404)
    reply = str(request.data.get("reply") or "").strip()
    if not reply:
        return _err("Please write a reply.")
    rv.school_reply = reply[:1000]
    rv.save()
    return Response({"ok": True, "message": "Reply published!"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def school_upload_file(request):
    """
    School owner file upload endpoint for:
    - Primary Cover Photo (image)
    - Gallery Photos (image)
    - School Logo (image)
    - School Brochure (PDF/DOC)
    """
    f = request.FILES.get("file") or request.FILES.get("image") or request.FILES.get("logo") or request.FILES.get("brochure")
    if not f:
        return _err("Please choose a file to upload.")

    ext = (f.name.rsplit(".", 1)[-1] if "." in f.name else "").lower()
    allowed_images = ("jpg", "jpeg", "png", "webp", "gif")
    allowed_docs = ("pdf", "doc", "docx")

    is_image = ext in allowed_images
    is_doc = ext in allowed_docs

    if not (is_image or is_doc):
        return _err("Invalid file format. Only JPG, PNG, WEBP, GIF, PDF, or DOC are allowed.")

    max_size = 25 * 1024 * 1024 if is_doc else 10 * 1024 * 1024
    if f.size > max_size:
        limit_mb = max_size // (1024 * 1024)
        return _err(f"File size exceeds maximum allowed limit ({limit_mb} MB).")

    folder = "brochures" if is_doc else "schools"
    raw_stem = f.name.rsplit(".", 1)[0]
    safe_stem = slugify(raw_stem)[:50] or "upload"
    ts = int(timezone.now().timestamp())
    filename = f"uploads/{folder}/{safe_stem}_{ts}.{ext}"

    name = default_storage.save(filename, f)
    url = default_storage.url(name)
    full_url = request.build_absolute_uri(url) if url.startswith("/") else url

    return Response({
        "ok": True,
        "url": full_url,
        "filename": f.name,
        "size": f.size,
        "isImage": is_image,
        "isDoc": is_doc,
    })


# ============================================================================
# 4. PARENT / STUDENT PANEL ENDPOINTS (/api/portal/parent/...)
# ============================================================================

def _get_or_create_parent_profile(user):
    if hasattr(user, "parent_profile"):
        return user.parent_profile
    return ParentProfile.objects.create(
        user=user,
        parent_name=user.get_full_name() or user.username,
        mobile="9876543210",
        email=user.email or "",
    )


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def parent_dashboard(request):
    if hasattr(request.user, "school_account"):
        return _err("This endpoint is for Parent/Student accounts.", status=403)

    pp = _get_or_create_parent_profile(request.user)

    if request.method == "PUT":
        d = request.data
        for field, key in (
            ("parent_name", "parentName"), ("student_name", "studentName"),
            ("email", "email"), ("relation", "relation"),
            ("looking_for_class", "lookingForClass"), ("current_school", "currentSchool"),
            ("admission_type", "admissionType"), ("preferred_city", "preferredCity"),
            ("preferred_state", "preferredState"), ("preferred_board", "preferredBoard"),
            ("budget", "budget"), ("session", "session"),
        ):
            if key in d and d[key] is not None:
                setattr(pp, field, str(d[key]).strip())
        if "mobile" in d:
            m = re.sub(r"\D", "", str(d["mobile"]))[-10:]
            if re.match(r"^[6-9]\d{9}$", m):
                pp.mobile = m
        pp.save()

    # Link any enquiries matching this parent's mobile or email
    if pp.mobile:
        Enquiry.objects.filter(mobile=pp.mobile, parent_user__isnull=True).update(parent_user=request.user)
    em = (pp.email or request.user.email or "").strip().lower()
    if em:
        Enquiry.objects.filter(email__iexact=em, parent_user__isnull=True).update(parent_user=request.user)

    enquiries = Enquiry.objects.filter(
        Q(parent_user=request.user) | (Q(mobile=pp.mobile) if pp.mobile else Q(pk=-1))
    ).select_related("school").order_by("-created_at")

    shortlisted_rows = Shortlist.objects.filter(parent_user=request.user).select_related("school")
    shortlisted_schools = [
        SchoolListSerializer(row.school, context={"request": request}).data
        for row in shortlisted_rows if row.school
    ]

    # Recommended schools matching preferences (or top featured/boarding schools)
    rec_qs = School.objects.filter(isActive=True)
    if pp.preferred_city:
        city_match = rec_qs.filter(city__iexact=pp.preferred_city)
        if city_match.exists():
            rec_qs = city_match
    if pp.admission_type and rec_qs.filter(type=pp.admission_type).exists():
        rec_qs = rec_qs.filter(type=pp.admission_type)
    recommended = SchoolListSerializer(
        rec_qs.order_by("-isFeatured", "-isRecommended", "-rating")[:8],
        many=True,
        context={"request": request},
    ).data

    my_reviews = Review.objects.filter(
        Q(parent_user=request.user) | (Q(mobile=pp.mobile) if pp.mobile else Q(pk=-1))
    ).select_related("school").order_by("-created_at")

    return Response({
        "ok": True,
        "profile": {
            "parentName": pp.parent_name,
            "studentName": pp.student_name,
            "mobile": pp.mobile,
            "email": pp.email or request.user.email,
            "relation": pp.relation,
            "lookingForClass": pp.looking_for_class,
            "currentSchool": pp.current_school,
            "admissionType": pp.admission_type,
            "preferredCity": pp.preferred_city,
            "preferredState": pp.preferred_state,
            "preferredBoard": pp.preferred_board,
            "budget": pp.budget,
            "session": pp.session,
            "profileCompletion": pp.profile_completion,
        },
        "enquiries": [
            {
                "id": e.pk,
                "schoolId": e.schoolId or (e.school.school_id if e.school else None),
                "schoolSlug": e.school.slug if e.school else "",
                "schoolName": e.schoolName,
                "schoolCity": e.school.city if e.school else e.city,
                "childName": e.childName or pp.student_name,
                "className": e.className or pp.looking_for_class,
                "session": e.session or "2027-28",
                "status": "Accepted by School" if e.is_unlocked else ("Rejected" if e.school_status == "rejected" else "Sent to School"),
                "schoolStatus": e.school_status,
                "isUnlocked": e.is_unlocked,
                "note": e.note,
                "createdAt": e.created_at.isoformat(),
                "messagesCount": e.messages.count(),
            }
            for e in enquiries[:50]
        ],
        "shortlisted": shortlisted_schools,
        "recommendedSchools": recommended,
        "reviews": [
            {
                "id": r.pk,
                "schoolId": r.school.school_id,
                "schoolName": r.school.name,
                "schoolSlug": r.school.slug,
                "rating": r.rating,
                "text": r.text,
                "isApproved": r.is_approved,
                "schoolReply": r.school_reply,
                "createdAt": r.created_at.date().isoformat(),
            }
            for r in my_reviews[:25]
        ],
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def parent_toggle_shortlist(request):
    sid = request.data.get("schoolId")
    school = School.objects.filter(school_id=sid).first()
    if not school:
        return _err("School not found.", status=404)
    existing = Shortlist.objects.filter(parent_user=request.user, school=school).first()
    if existing:
        existing.delete()
        return Response({"ok": True, "shortlisted": False, "message": "Removed from shortlist."})
    Shortlist.objects.create(parent_user=request.user, school=school)
    return Response({"ok": True, "shortlisted": True, "message": "Added to shortlist!"})


# ============================================================================
# 5. ADMISSION & CHAT MESSAGES (Shared by Parent & School on an Enquiry)
# ============================================================================

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def enquiry_messages(request, lead_id):
    lead = Enquiry.objects.filter(pk=lead_id).select_related("school").first()
    if not lead:
        return _err("Enquiry not found.", status=404)

    # Check ownership: either the school that received the lead, or the parent who sent it
    sa = getattr(request.user, "school_account", None)
    pp = getattr(request.user, "parent_profile", None)

    is_school = sa is not None and (
        sa.school == lead.school or
        sa.requested_school == lead.school or
        sa.school_id == lead.schoolId or
        (sa.school and lead.school and sa.school.pk == lead.school.pk) or
        (sa.requested_school and lead.school and sa.requested_school.pk == lead.school.pk) or
        (sa.school and sa.school.school_id == lead.schoolId) or
        (sa.requested_school and sa.requested_school.school_id == lead.schoolId)
    )
    is_parent = pp is not None and (
        lead.parent_user == request.user or
        (pp.mobile and lead.mobile == pp.mobile) or
        (lead.email and request.user.email and lead.email.strip().lower() == request.user.email.strip().lower()) or
        (pp.email and lead.email and lead.email.strip().lower() == pp.email.strip().lower())
    )
    if not (is_school or is_parent or request.user.is_staff):
        return _err("Not authorized to view this conversation.", status=403)

    if request.method == "POST":
        text = str(request.data.get("message") or "").strip()
        if not text:
            return _err("Please enter a message.")
        role = "school" if is_school else ("parent" if is_parent else "admin")
        sender = (
            request.user.school_account.institution_name if is_school
            else (request.user.parent_profile.parent_name if is_parent else "VidyaVista Support")
        )
        LeadMessage.objects.create(
            enquiry=lead,
            sender_role=role,
            sender_name=sender[:120],
            message=text[:1500],
        )

    msgs = [
        {
            "id": m.pk,
            "senderRole": m.sender_role,
            "senderName": m.sender_name,
            "message": m.message,
            "createdAt": m.created_at.isoformat(),
        }
        for m in lead.messages.all()
    ]
    return Response({"ok": True, "data": msgs})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def school_claim_branch(request):
    """Owner requests to link another school/branch to their account (pending admin approval)."""
    sa = _get_school_account(request)
    if not sa or sa.status != "approved":
        return _err("Approved school owner account required.", status=403)
    target_id = request.data.get("schoolId")
    proof = str(request.data.get("proof") or "").strip()
    if not target_id:
        return _err("Please select a school to link.")
    target = School.objects.filter(Q(school_id=target_id) | Q(pk=target_id)).first()
    if not target:
        return _err("School not found.", status=404)
    if sa.owner_record and target.owner == sa.owner_record:
        return _err("This school is already linked to your account.")
    existing = BranchClaim.objects.filter(account=sa, school=target, status="pending").first()
    if existing:
        return _err("A link request for this branch is already pending admin review.")
    BranchClaim.objects.create(account=sa, school=target, proof=proof)
    return Response({"ok": True, "message": f"Request to link {target.name} submitted for admin review."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def school_switch_branch(request):
    """Switch active school in dashboard between approved branches."""
    sa = _get_school_account(request)
    if not sa:
        return _err("School account not found.", status=403)
    target_id = request.data.get("schoolId")
    if not target_id:
        return _err("schoolId is required.")
    target = School.objects.filter(Q(school_id=target_id) | Q(pk=target_id)).first()
    if not target:
        return _err("School not found.", status=404)
    
    is_allowed = (
        (sa.owner_record and target.owner == sa.owner_record)
        or sa.school == target
        or (sa.requested_school == target and sa.school_link_status == "approved")
        or BranchClaim.objects.filter(account=sa, school=target, status="approved").exists()
    )
    if is_allowed:
        sa.school = target
        sa.institution_name = target.name
        sa.school_link_status = "approved"
        if sa.owner_record and not target.owner:
            target.owner = sa.owner_record
            target.save(update_fields=["owner"])
        sa.save(update_fields=["school", "institution_name", "school_link_status"])
        return Response({"ok": True, "message": f"Switched to {target.name}", "schoolId": target.pk})
    return _err("You do not have permission to manage this school.", status=403)



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def school_upload_file(request):
    """Handles image and document file uploads for school dashboard edit profile."""
    sa = _get_school_account(request)
    if not sa:
        return _err("Unauthorized school account.", status=403)

    uploaded = request.FILES.get("file")
    if not uploaded:
        return _err("No file provided.")

    allowed_exts = {".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx"}
    import os
    from django.core.files.storage import default_storage

    ext = os.path.splitext(uploaded.name)[1].lower()
    if ext not in allowed_exts:
        return _err(f"Unsupported file type ({ext}). Allowed: jpg, png, webp, pdf, doc, docx.")

    if uploaded.size > 15 * 1024 * 1024:
        return _err("File size exceeds 15MB limit.")

    import uuid
    safe_name = f"uploads/{uuid.uuid4().hex[:12]}_{uploaded.name.replace(' ', '_')}"
    saved_path = default_storage.save(safe_name, uploaded)
    file_url = default_storage.url(saved_path)

    return Response({
        "ok": True,
        "url": file_url,
        "filename": uploaded.name,
        "size": uploaded.size,
    })
