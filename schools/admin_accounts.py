"""
User & Password Administration for VidyaVista:
- View all users (Administrators, Staff, School Owners, Parents/Students)
- One-click Change / Reset Password for any user
- Manage Staff roles and permissions
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils.html import format_html

try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass


@admin.register(User)
class AccountAdmin(UserAdmin):
    """Unified User & Password Manager for Administrators."""

    readonly_fields = ("change_password_button", "user_role_badge", "last_login", "date_joined")
    fieldsets = (
        ("Account & Password Control", {"fields": ("username", "change_password_button", "user_role_badge")}),
        ("Personal Information", {"fields": ("first_name", "last_name", "email")}),
        ("Permissions & Staff Access", {"fields": ("is_active", "is_staff", "is_superuser", "groups")}),
        ("Activity Dates", {"fields": ("last_login", "date_joined")}),
    )
    list_display = ("username", "email", "first_name", "user_role_badge", "is_active", "is_staff", "last_login", "reset_password_link")
    list_filter = ("is_staff", "is_superuser", "is_active")
    search_fields = ("username", "email", "first_name", "last_name")

    @admin.display(description="Account Type")
    def user_role_badge(self, obj):
        if hasattr(obj, "school_account"):
            label = obj.school_account.institution_name or obj.school_account.contact_person
            return format_html(
                '<span style="background:#e0f2fe;color:#0369a1;padding:4px 10px;border-radius:99px;font-weight:600;font-size:12px;">'
                '<i class="fas fa-school" style="margin-right:5px;"></i>School Owner: {}</span>',
                label[:35],
            )
        if hasattr(obj, "parent_profile"):
            return format_html(
                '<span style="background:#fce7f3;color:#be185d;padding:4px 10px;border-radius:99px;font-weight:600;font-size:12px;">'
                '<i class="fas fa-user-graduate" style="margin-right:5px;"></i>Parent: {}</span>',
                obj.parent_profile.parent_name[:35],
            )
        if obj.is_superuser:
            return format_html(
                '<span style="background:#fef3c7;color:#b45309;padding:4px 10px;border-radius:99px;font-weight:600;font-size:12px;">'
                '<i class="fas fa-user-shield" style="margin-right:5px;"></i>Administrator</span>'
            )
        if obj.is_staff:
            return format_html(
                '<span style="background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:99px;font-weight:600;font-size:12px;">'
                '<i class="fas fa-id-badge" style="margin-right:5px;"></i>Staff Member</span>'
            )
        return "Standard User"

    @admin.display(description="Password Management")
    def reset_password_link(self, obj):
        if not obj or not obj.pk:
            return "-"
        url = reverse("admin:auth_user_password_change", args=[obj.pk])
        return format_html(
            '<a class="btn btn-primary btn-xs" style="border-radius:6px;font-weight:600;padding:4px 10px;" href="{}">'
            '<i class="fas fa-key" style="margin-right:4px;"></i>Reset Password</a>',
            url,
        )

    @admin.display(description="Password")
    def change_password_button(self, obj):
        if not obj or not obj.pk:
            return "-"
        url = reverse("admin:auth_user_password_change", args=[obj.pk])
        return format_html(
            '<a class="btn btn-primary btn-sm" style="border-radius:6px;font-weight:600;" href="{}">'
            '<i class="fas fa-key" style="margin-right:5px;"></i>Change or Reset Password for this User</a>',
            url,
        )
