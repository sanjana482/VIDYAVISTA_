"""
Keeps the admin simple: one admin account, no groups, no token tables.
Imported once from config/urls.py (after all admin modules are loaded).
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group, User
from django.urls import reverse
from django.utils.html import format_html

# Groups are not used: only one admin account exists.
try:
    admin.site.unregister(Group)
except admin.sites.NotRegistered:
    pass

try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass


@admin.register(User)
class AccountAdmin(UserAdmin):
    """"My account": name, email, change password and read-only dates."""

    readonly_fields = ("change_password_button", "last_login", "date_joined")
    fieldsets = (
        ("Account", {"fields": ("username", "change_password_button")}),
        ("Personal information", {"fields": ("first_name", "last_name", "email")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    list_display = ("username", "email", "last_login")

    def get_queryset(self, request):
        return super().get_queryset(request).filter(pk=request.user.pk)  # you only ever see your own account

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="Password")
    def change_password_button(self, obj):
        if not obj or not obj.pk:
            return "-"
        url = reverse("admin:auth_user_password_change", args=[obj.pk])
        return format_html('<a class="btn btn-primary btn-sm" href="{}"><i class="fas fa-key"></i>&nbsp; Change password</a>', url)
