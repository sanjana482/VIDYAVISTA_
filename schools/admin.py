import csv
import json
from datetime import timedelta

from django import forms
from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils import timezone
from django.utils.html import format_html

from . import importer
from .models import (
    FACILITY_CHOICES, Coupon, EmailOTP, Enquiry, FeeComponent, Invoice, LeadMessage,
    LocationFAQ, LocationHighlight, LocationPage, Owner, ParentProfile,
    Plan, Review, School, SchoolAccount, SchoolAward, SchoolFAQ,
    BranchClaim, SchoolHighlight, SchoolMembership, SchoolPhoto, SchoolVideo, Shortlist,
)
from .portal_api import (
    approve_owner_profile, approve_school_edits, approve_school_link, ensure_default_plans,
)

User = get_user_model()

DIGITS = {
    'inputmode': 'numeric',
    'autocomplete': 'off',
    'oninput': "this.value=this.value.replace(/[^0-9]/g,'')",
}


class SchoolForm(forms.ModelForm):
    facilities = forms.MultipleChoiceField(
        choices=[], required=False, widget=forms.CheckboxSelectMultiple,
        help_text='Select all campus facilities available at the school.',
    )
    extra_facilities = forms.CharField(
        required=False, label='Additional facilities',
        help_text='Enter any additional facilities not listed above, separated by commas (e.g. Robotics Lab, Horse Riding).',
    )

    class Meta:
        model = School
        fields = '__all__'
        widgets = {
            'phone': forms.TextInput(attrs={**DIGITS, 'maxlength': '10', 'placeholder': '9876543210'}),
            'landline': forms.TextInput(attrs={**DIGITS, 'maxlength': '13', 'placeholder': '01126543210'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        current = list((self.instance.facilities if self.instance and self.instance.pk else []) or [])
        choices = list(FACILITY_CHOICES) + [c for c in current if c not in FACILITY_CHOICES]
        self.fields['facilities'].choices = [(c, c) for c in choices]
        self.initial['facilities'] = current

    def clean(self):
        data = super().clean()
        picked = list(data.get('facilities') or [])
        for item in (data.get('extra_facilities') or '').split(','):
            item = item.strip()
            if item and item not in picked:
                picked.append(item)
        data['facilities'] = picked
        return data


class FeeComponentInline(admin.TabularInline):
    model = FeeComponent
    extra = 0
    fields = ('session', 'class_name', 'name', 'frequency', 'amount')
    verbose_name = 'Fee Component'
    verbose_name_plural = 'Class-wise Fee Components (Add one row per fee head)'


class HighlightInline(admin.TabularInline):
    model = SchoolHighlight
    extra = 1
    fields = ('text', 'order')
    verbose_name_plural = 'Key School Highlights (One row per highlight)'


class FAQInline(admin.StackedInline):
    model = SchoolFAQ
    extra = 1
    fields = ('question', 'answer', 'order')
    verbose_name_plural = 'Frequently Asked Questions (FAQs)'


class PhotoInline(admin.TabularInline):
    model = SchoolPhoto
    extra = 1
    fields = ('image', 'image_url', 'caption', 'order', 'is_approved')
    verbose_name_plural = 'Campus Gallery Photos (Upload file or paste image URL)'


class AwardInline(admin.TabularInline):
    model = SchoolAward
    extra = 1
    fields = ('name', 'position', 'year', 'order')
    verbose_name_plural = 'Awards & Recognitions'


class VideoInline(admin.TabularInline):
    model = SchoolVideo
    extra = 1
    fields = ('title', 'youtube_url', 'is_approved')
    verbose_name_plural = 'YouTube Campus Videos'


# Unregistered standalone: consolidated inside SchoolAccountAdmin
class OwnerAdmin(admin.ModelAdmin):
    list_display = ('name', 'designation', 'phone', 'email', 'city', 'approval_badge', 'linked_schools_display', 'portal_account_link', 'created_at')
    list_filter = ('approval_status', 'state', 'city', 'created_at')
    search_fields = ('name', 'email', 'phone', 'city')
    actions = ['approve_selected_owners']

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if 'phone' in form.base_fields:
            form.base_fields['phone'].widget.attrs.update({**DIGITS, 'maxlength': '10'})
        return form

    @admin.display(description='Approval Status')
    def approval_badge(self, obj):
        styles = {
            'approved': ('#dcfce7', '#15803d', 'fa-check-circle', 'Approved'),
            'pending': ('#fef3c7', '#b45309', 'fa-clock', 'Pending Approval'),
            'rejected': ('#fee2e2', '#b91c1c', 'fa-times-circle', 'Rejected'),
        }
        bg, fg, icon, label = styles.get(obj.approval_status, ('#f1f5f9', '#334155', 'fa-info-circle', obj.approval_status))
        return format_html(
            '<span style="background:{};color:{};padding:4px 10px;border-radius:99px;font-weight:600;font-size:12px;">'
            '<i class="fas {}" style="margin-right:4px;"></i>{}</span>',
            bg, fg, icon, label,
        )

    @admin.display(description='Linked Schools')
    def linked_schools_display(self, obj):
        names = [s.name for s in obj.schools.all()[:3]]
        return ', '.join(names) if names else 'No School Linked Yet'

    @admin.display(description='Portal Login Account')
    def portal_account_link(self, obj):
        sa = obj.portal_accounts.first()
        if not sa:
            return '-'
        url = reverse('admin:schools_schoolaccount_change', args=[sa.pk])
        return format_html(
            '<a class="btn btn-xs btn-outline-primary" style="border-radius:6px;font-weight:600;" href="{}">'
            '<i class="fas fa-user-check" style="margin-right:4px;"></i>Manage Portal Account</a>',
            url,
        )

    @admin.action(description='Approve selected School Owner profiles')
    def approve_selected_owners(self, request, queryset):
        count = 0
        for ow in queryset:
            ow.approval_status = 'approved'
            ow.save(update_fields=['approval_status'])
            for sa in ow.portal_accounts.all():
                approve_owner_profile(sa, admin_user=request.user)
            count += 1
        messages.success(request, f"{count} School Owner profile(s) approved successfully.")


class HasOwnerFilter(admin.SimpleListFilter):
    title = 'Owner / Claim Status'
    parameter_name = 'has_owner'

    def lookups(self, request, model_admin):
        return (
            ('claimed', '✓ Claimed (Has Owner)'),
            ('unclaimed', '○ Unclaimed (No Owner)'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'claimed':
            return queryset.filter(owner__isnull=False)
        if self.value() == 'unclaimed':
            return queryset.filter(owner__isnull=True)
        return queryset


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    form = SchoolForm
    change_list_template = 'admin/schools/school/change_list.html'
    list_display = (
        'school_id', 'name', 'city', 'state', 'board', 'type',
        'owner_badge',
        'rating', 'isFeatured', 'isRecommended', 'topRated', 'verified', 'isActive',
        'quick_portal_actions',
    )
    list_filter = (HasOwnerFilter, 'state', 'city', 'board', 'type', 'isFeatured', 'isRecommended', 'topRated', 'verified', 'isActive')
    list_editable = ('isFeatured', 'isRecommended', 'topRated', 'verified', 'isActive')
    search_fields = ('name', 'area', 'city', 'state', 'school_id', 'phone', 'email')
    raw_id_fields = ('owner',)
    readonly_fields = ('school_id', 'slug', 'grades', 'rating', 'reviews', 'cover_preview', 'created_at', 'updated_at')
    inlines = [HighlightInline, FAQInline, PhotoInline, FeeComponentInline, AwardInline, VideoInline]
    fieldsets = (
        ('1. Basic details', {'fields': (
            'name', 'owner', ('area', 'city', 'state'), 'address', ('board', 'type', 'gender'),
            ('grade_from', 'grade_to'), 'grades', 'isActive')}),
        ('2. Homepage sections (tick karo)', {'fields': (('isFeatured', 'isRecommended', 'topRated', 'verified'),),
            'description': 'Featured = homepage "Featured Schools". Recommended = "Recommended Schools". '
                           '"Highest Rated" automatic hai: parents ke reviews ki average se.'}),
        ('3. Contact', {'fields': (('phone', 'landline'), 'email', 'website')}),
        ('4. Cover image & Logo', {'fields': ('cover_image', 'image', 'logo_url', 'cover_preview')}),
        ('5. About the school', {'fields': ('about',)}),
        ('6. School details', {'fields': (('established', 'students', 'teachers'), 'campus', 'facilities', 'extra_facilities')}),
        ('7. Social media links', {'fields': ('youtube_url', 'facebook_url', 'instagram_url', 'x_url', 'linkedin_url', 'other_url')}),
        ('8. Fees (yearly)', {'fields': (('feeMin', 'feeMax'), 'feeUpdated', 'feeNote')}),
        ('Ratings (auto, parents ke reviews se)', {'fields': (('rating', 'reviews'),), 'classes': ('collapse',)}),
        ('Old data (purana JSON, ab use mat karo)', {'fields': ('highlights', 'faqs', 'gallery'), 'classes': ('collapse',)}),
    )

    @admin.display(description='Owner')
    def owner_badge(self, obj):
        if obj.owner:
            return format_html('<span style="color:#0A5C91;font-weight:600;">{}</span>', obj.owner.name)
        return format_html('<span style="color:#94a3b8;font-style:italic;">Unclaimed</span>')

    @admin.display(description='Portal Actions')
    def quick_portal_actions(self, obj):
        plan_url = f"{reverse('admin:schools_schoolmembership_add')}?school={obj.pk}"
        return format_html(
            '<a class="btn btn-xs btn-success" style="border-radius:4px;padding:2px 7px;font-size:10px;font-weight:700;" href="{}">+ Plan</a>',
            plan_url,
        )



    def get_urls(self):
        extra = [
            path('import-csv/', self.admin_site.admin_view(self.import_csv_view), name='schools_school_import_csv'),
            path('import-template/', self.admin_site.admin_view(self.import_template_view), name='schools_school_import_template'),
        ]
        return extra + super().get_urls()

    def import_csv_view(self, request):
        if not self.has_add_permission(request):
            raise PermissionDenied
        result = None
        if request.method == 'POST':
            f = request.FILES.get('csv_file')
            if not f:
                messages.error(request, 'Please select a CSV file first.')
            else:
                try:
                    text = f.read().decode('utf-8-sig')
                except UnicodeDecodeError:
                    messages.error(request, 'The file must be saved as UTF-8 CSV (Excel: Save As > CSV UTF-8).')
                else:
                    result = importer.import_csv_text(text)
                    if result['created']:
                        messages.success(request, f"{result['created']} schools imported successfully.")
        ctx = dict(self.admin_site.each_context(request), title='Import Schools from CSV', opts=self.model._meta, result=result)
        return TemplateResponse(request, 'admin/schools/school/import_csv.html', ctx)

    def import_template_view(self, request):
        resp = HttpResponse(content_type='text/csv; charset=utf-8')
        resp['Content-Disposition'] = 'attachment; filename="vidyavista-schools-template.csv"'
        resp.write('\ufeff')
        csv.writer(resp).writerow(importer.TEMPLATE_COLUMNS)
        return resp

    @admin.display(description='Cover Image Preview')
    def cover_preview(self, obj):
        src = ''
        if obj and obj.cover_image:
            src = obj.cover_image.url
        elif obj and obj.image:
            src = obj.image
        return format_html('<img src="{}" style="max-height:120px;border-radius:8px">', src) if src else '-'


# ============================================================================
# SCHOOL OWNERS, CLAIMS & 3-STAGE APPROVAL ADMIN
# ============================================================================

class BranchClaimInline(admin.TabularInline):
    model = BranchClaim
    extra = 0
    fields = ('school', 'proof', 'status', 'created_at', 'reviewed_at')
    readonly_fields = ('created_at', 'reviewed_at')
    autocomplete_fields = ('school',)
    verbose_name = 'Branch Claim / Link'
    verbose_name_plural = 'Branch Claims & Additional Branches'


@admin.register(SchoolAccount)
class SchoolAccountAdmin(admin.ModelAdmin):
    change_list_template = 'admin/schools/schoolaccount/change_list.html'
    inlines = [BranchClaimInline]
    list_display = (
        'owner_contact_card', 'all_schools_display', 'mobile', 'email',
        'owner_status_badge', 'admin_actions_column', 'created_at',
    )
    list_filter = ('status', 'school_link_status', 'edit_approval_status', 'state', 'city', 'created_at')
    search_fields = ('institution_name', 'contact_person', 'mobile', 'email', 'school__name', 'requested_school__name', 'claim_proof')
    autocomplete_fields = ('school', 'requested_school', 'user', 'approved_by')
    raw_id_fields = ('owner_record',)
    actions = [
        'approve_owner_profiles_action',
        'approve_school_claims_and_additions_action',
        'approve_pending_profile_edits_action',
        'suspend_accounts',
        'assign_yearly_100_leads_plan',
    ]

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        p_owners = SchoolAccount.objects.filter(status='pending').count()
        p_links = SchoolAccount.objects.filter(school_link_status__in=['pending_claim', 'pending_new']).count()
        p_edits = SchoolAccount.objects.filter(edit_approval_status='pending').count()
        p_branches = BranchClaim.objects.filter(status='pending').count()
        total_pending = p_owners + p_links + p_edits + p_branches

        extra_context['total_pending_approvals'] = total_pending
        extra_context['pending_details'] = {
            'owners': p_owners,
            'links': p_links,
            'edits': p_edits,
            'branches': p_branches,
        }
        return super().changelist_view(request, extra_context=extra_context)

    def pending_notifications_info(self, obj):
        count = 0
        reasons = []
        if obj.status == 'pending':
            count += 1
            reasons.append('Owner Profile')
        if obj.school_link_status in ('pending_claim', 'pending_new'):
            count += 1
            reasons.append('School Link/Claim')
        if obj.edit_approval_status in ('pending', 'pending_review'):
            count += 1
            reasons.append('Profile Edits')
        bc_count = obj.branch_claims.filter(status='pending').count()
        if bc_count > 0:
            count += bc_count
            reasons.append(f'{bc_count} Branch Claim{"s" if bc_count > 1 else ""}')
        return count, reasons

    readonly_fields = ('all_linked_schools_table',)

    @admin.display(description='All Schools Managed by this Owner')
    def all_linked_schools_table(self, obj):
        schools_data = []
        seen_pks = set()

        # Primary Active School
        if obj.school:
            seen_pks.add(obj.school.pk)
            schools_data.append({
                'school': obj.school,
                'role': 'Primary Active School',
                'status': 'Live & Linked' if obj.school_link_status == 'approved' else f'Claim {obj.get_school_link_status_display()}',
                'is_pending': False,
                'claim_id': None,
            })
        elif obj.requested_school:
            seen_pks.add(obj.requested_school.pk)
            schools_data.append({
                'school': obj.requested_school,
                'role': 'Requested School',
                'status': f'Claim {obj.get_school_link_status_display()}',
                'is_pending': obj.school_link_status in ('pending_claim', 'pending_new'),
                'claim_id': None,
            })

        # Additional Schools linked to Owner record
        if obj.owner_record:
            for sc in obj.owner_record.schools.all():
                if sc.pk not in seen_pks:
                    seen_pks.add(sc.pk)
                    schools_data.append({
                        'school': sc,
                        'role': 'Linked School',
                        'status': 'Approved & Live',
                        'is_pending': False,
                        'claim_id': None,
                    })

        # Branch claims
        for bc in obj.branch_claims.select_related('school').all():
            if bc.school and bc.school.pk not in seen_pks:
                seen_pks.add(bc.school.pk)
                schools_data.append({
                    'school': bc.school,
                    'role': 'Linked School',
                    'status': bc.get_status_display(),
                    'is_pending': bc.status == 'pending',
                    'claim_id': bc.pk,
                })

        if not schools_data:
            return format_html(
                '<p style="color:#64748b; font-style:italic; padding:12px; background:#f8fafc; border-radius:8px;">'
                'No schools linked to this owner yet. Once claimed or added, they will appear here with edit and remove options.'
                '</p>'
            )

        rows = []
        assign_plan_base = reverse('admin:schools_schoolmembership_add')
        review_edits_url = reverse('admin:schools_schoolaccount_review_edits', args=[obj.pk])

        for item in schools_data:
            sc = item['school']
            school_url = reverse('admin:schools_school_change', args=[sc.pk])
            unlink_url = reverse('admin:schools_schoolaccount_unlink_school', args=[obj.pk, sc.pk])

            # Plan info
            m = sc.memberships.filter(status='active').first()
            if m:
                plan_html = f'<span style="background:#dcfce7; color:#15803d; padding:2px 7px; border-radius:6px; font-weight:700; font-size:11px;">{m.plan_name[:16]} ({m.days_remaining}d) &bull; {sc.leads_quota_remaining} Credits</span>'
            else:
                plan_html = '<span style="color:#94a3b8; font-size:11px;">No Paid Plan &bull; 0 Credits</span>'

            # Edits status
            has_pending_edits = (obj.edit_approval_status == 'pending') and (
                obj.school_id == sc.pk or (obj.pending_edit_data and obj.pending_edit_data.get('school_id') == sc.pk) or not obj.school_id
            )
            if has_pending_edits:
                edits_btn = (
                    f'<a class="btn btn-xs btn-danger" style="border-radius:6px; font-weight:700; margin-left:4px;" href="{review_edits_url}">'
                    f'<i class="fas fa-bell"></i> Review Edits</a>'
                )
            else:
                edits_btn = ''

            # Status styling
            status_style = 'background:#dcfce7;color:#15803d;' if 'Approved' in item['status'] or 'Live' in item['status'] else 'background:#fef3c7;color:#b45309;'

            # Approve claim button
            approve_action = ''
            if item['is_pending']:
                if item['claim_id']:
                    approve_url = reverse('admin:schools_schoolaccount_approve_branch_claim', args=[obj.pk, item['claim_id']])
                    approve_action = f'<a class="btn btn-xs btn-info" style="border-radius:6px; font-weight:700; margin-right:4px;" href="{approve_url}"><i class="fas fa-check"></i> Approve Claim</a>'
                else:
                    approve_url = reverse('admin:schools_schoolaccount_approve_school', args=[obj.pk])
                    approve_action = f'<a class="btn btn-xs btn-info" style="border-radius:6px; font-weight:700; margin-right:4px;" href="{approve_url}"><i class="fas fa-check"></i> Approve School</a>'

            rows.append(f'''
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:12px 14px; font-weight:700;">
                        <a href="{school_url}" style="color:#0A5C91; font-size:14px; text-decoration:none;" title="Click to Edit School">{sc.name}</a>
                        <span style="font-size:11px; color:#64748b; display:block;">Live School ID: {sc.school_id or sc.pk}</span>
                    </td>
                    <td style="padding:12px 14px; font-size:12px; color:#334155;">{sc.area or "-"}, {sc.city} ({sc.board})</td>
                    <td style="padding:12px 14px; font-weight:600; font-size:12px; color:#475569;">{item['role']}</td>
                    <td style="padding:12px 14px;">
                        <span style="padding:3px 8px; border-radius:99px; font-size:11px; font-weight:700; {status_style}">{item['status']}</span>
                    </td>
                    <td style="padding:12px 14px;">{plan_html}</td>
                    <td style="padding:12px 14px; white-space:nowrap;">
                        <div style="display:inline-flex; align-items:center; gap:4px;">
                            {approve_action}
                            <a class="btn btn-xs btn-primary" style="border-radius:6px; font-weight:700;" href="{school_url}" title="Edit school profile details">
                                <i class="fas fa-edit"></i> Edit School
                            </a>
                            <a class="btn btn-xs btn-success" style="border-radius:6px; font-weight:700;" href="{assign_plan_base}?school={sc.pk}" title="Assign Plan to this school">
                                <i class="fas fa-plus"></i> Plan
                            </a>
                            {edits_btn}
                            <a class="btn btn-xs btn-outline-danger" style="border-radius:6px; font-weight:700;" href="{unlink_url}" onclick="return confirm('Are you sure you want to remove and unlink this school ({sc.name}) from owner {obj.contact_person}?');" title="Remove this school from owner">
                                <i class="fas fa-trash-alt"></i> Remove School
                            </a>
                        </div>
                    </td>
                </tr>
            ''')

        table_html = f'''
        <div style="border:1px solid #cbd5e1; border-radius:12px; overflow:hidden; background:#fff; margin-top:8px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead>
                    <tr style="background:#f8fafc; text-align:left; color:#475569; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">
                        <th style="padding:12px 14px;">School Name &amp; ID</th>
                        <th style="padding:12px 14px;">Location &amp; Board</th>
                        <th style="padding:12px 14px;">Role</th>
                        <th style="padding:12px 14px;">Status</th>
                        <th style="padding:12px 14px;">Plan &amp; Credits</th>
                        <th style="padding:12px 14px;">Actions (Edit / Plan / Remove)</th>
                    </tr>
                </thead>
                <tbody>{''.join(rows)}</tbody>
            </table>
        </div>
        '''
        return format_html(table_html)

    def quick_approve_branch_view(self, request, pk, claim_id):
        sa = get_object_or_404(SchoolAccount, pk=pk)
        claim = get_object_or_404(BranchClaim, pk=claim_id, account=sa)
        owner = sa.owner_record
        if not owner:
            owner = sa.sync_owner_record()
        claim.school.owner = owner
        claim.school.save(update_fields=['owner'])
        claim.status = 'approved'
        claim.reviewed_at = timezone.now()
        claim.save(update_fields=['status', 'reviewed_at'])
        messages.success(request, f"Branch '{claim.school.name}' has been approved and linked to owner '{sa.contact_person}'.")
        return redirect('admin:schools_schoolaccount_change', pk)

    fieldsets = (
        ('1. Owner Profile & Personal Details', {
            'fields': (
                'user', 'owner_record', ('contact_person', 'designation'),
                ('mobile', 'mobile_verified'), 'email', ('city', 'state'), 'address',
                'status', 'rejection_reason'
            ),
            'description': 'Personal and contact details for this school owner / administrator.',
        }),
        ('2. Schools Managed by this Owner', {
            'fields': ('all_linked_schools_table',),
            'description': 'All institutions and branches associated with this owner account.',
        }),
        ('3. Verification Documents & System Info', {
            'fields': ('claim_proof', 'brochure_file', 'brochure_url', ('approved_by', 'approved_at')),
            'classes': ('collapse',),
        }),
    )
    def get_urls(self):
        extra = [
            path(
                'quick-create/',
                self.admin_site.admin_view(self.quick_create_school_login_view),
                name='schools_schoolaccount_quick_create',
            ),
            path(
                '<int:pk>/approve-owner/',
                self.admin_site.admin_view(self.quick_approve_owner_view),
                name='schools_schoolaccount_approve_owner',
            ),
            path(
                '<int:pk>/approve-school/',
                self.admin_site.admin_view(self.quick_approve_school_view),
                name='schools_schoolaccount_approve_school',
            ),
            path(
                '<int:pk>/approve-branch/<int:claim_id>/',
                self.admin_site.admin_view(self.quick_approve_branch_view),
                name='schools_schoolaccount_approve_branch_claim',
            ),
            path(
                '<int:pk>/review-edits/',
                self.admin_site.admin_view(self.review_pending_edits_view),
                name='schools_schoolaccount_review_edits',
            ),
            path(
                '<int:pk>/unlink-school/<int:school_id>/',
                self.admin_site.admin_view(self.unlink_school_view),
                name='schools_schoolaccount_unlink_school',
            ),
        ]
        return extra + super().get_urls()

    def quick_approve_owner_view(self, request, pk):
        sa = get_object_or_404(SchoolAccount, pk=pk)
        approve_owner_profile(sa, admin_user=request.user)
        messages.success(request, f"Stage 1 Complete: Owner Profile for '{sa.contact_person}' is now Approved. They can now add or claim a school.")
        return redirect('admin:schools_schoolaccount_changelist')

    def quick_approve_school_view(self, request, pk):
        sa = get_object_or_404(SchoolAccount, pk=pk)
        approve_school_link(sa, admin_user=request.user)
        school_name = sa.school.name if sa.school else sa.institution_name
        messages.success(request, f"Stage 2 Complete: School '{school_name}' has been approved and linked to {sa.contact_person}.")
        return redirect('admin:schools_schoolaccount_changelist')

    def unlink_school_view(self, request, pk, school_id):
        sa = get_object_or_404(SchoolAccount, pk=pk)
        school = get_object_or_404(School, pk=school_id)

        # Unlink primary school
        if sa.school == school:
            other = None
            if sa.owner_record:
                other = sa.owner_record.schools.exclude(pk=school.pk).first()
            sa.school = other
            sa.institution_name = other.name if other else f"{sa.contact_person}'s Institution"
            if not other:
                sa.school_link_status = 'none'
            sa.save(update_fields=['school', 'institution_name', 'school_link_status'])

        # Unlink requested school
        if sa.requested_school == school:
            sa.requested_school = None
            if not sa.school:
                sa.school_link_status = 'none'
            sa.save(update_fields=['requested_school', 'school_link_status'])

        # Remove from owner record schools
        if sa.owner_record:
            sa.owner_record.schools.remove(school)

        # Remove branch claims
        BranchClaim.objects.filter(account=sa, school=school).delete()

        # Remove owner from school
        if school.owner == sa.owner_record:
            school.owner = None
            school.save(update_fields=['owner'])

        messages.success(request, f"School '{school.name}' has been successfully unlinked and removed from owner {sa.contact_person}.")
        return redirect('admin:schools_schoolaccount_change', pk)

    def review_pending_edits_view(self, request, pk):
        sa = get_object_or_404(SchoolAccount, pk=pk)
        draft = sa.pending_edit_data or {}

        # Resolve target school
        target_school = sa.school
        if not target_school and draft.get('school_id'):
            target_school = School.objects.filter(pk=draft.get('school_id')).first()
        if not target_school:
            target_school = sa.requested_school or (sa.owner_record.schools.first() if sa.owner_record else None)

        if request.method == 'POST':
            decision = request.POST.get('decision')
            if decision == 'approve':
                if not sa.school and target_school:
                    sa.school = target_school
                    sa.save(update_fields=['school'])
                approve_school_edits(sa, admin_user=request.user)
                school_display_name = (target_school.name if target_school else sa.institution_name) or 'School'
                messages.success(request, f"Stage 3 Complete: Profile edits for '{school_display_name}' have been approved and published live to VidyaVista.")
                return redirect('admin:schools_schoolaccount_changelist')
            elif decision == 'reject':
                reason = (request.POST.get('reason') or 'Please review and update the submitted details.').strip()
                sa.edit_approval_status = 'rejected'
                sa.edit_rejection_reason = reason[:300]
                sa.save(update_fields=['edit_approval_status', 'edit_rejection_reason'])
                school_display_name = (target_school.name if target_school else sa.institution_name) or 'School'
                messages.warning(request, f"Profile edits for '{school_display_name}' have been rejected.")
                return redirect('admin:schools_schoolaccount_changelist')

        # 10 Comparison Sections matching School Dashboard Edit Profile
        sections_spec = [
            {
                'title': '1. Basic Information',
                'fields': [
                    ('School Name', getattr(target_school, 'name', '') or sa.institution_name, 'name', False, False),
                    ('Education Board', getattr(target_school, 'board', ''), 'board', False, False),
                    ('School Type', getattr(target_school, 'type', ''), 'type', False, False),
                    ('Gender (Co-ed / Boys / Girls)', getattr(target_school, 'gender', ''), 'gender', False, False),
                    ('Starting Class (Grade From)', getattr(target_school, 'grade_from', ''), 'gradeFrom', False, False),
                    ('Ending Class (Grade To)', getattr(target_school, 'grade_to', ''), 'gradeTo', False, False),
                ]
            },
            {
                'title': '2. Location & Address',
                'fields': [
                    ('Complete Campus Address', getattr(target_school, 'address', '') or sa.address, 'address', False, False),
                    ('Locality / Area', getattr(target_school, 'area', ''), 'area', False, False),
                    ('City', getattr(target_school, 'city', '') or sa.city, 'city', False, False),
                    ('State', getattr(target_school, 'state', '') or sa.state, 'state', False, False),
                    ('Pin Code', getattr(target_school, 'pincode', ''), 'pincode', False, False),
                ]
            },
            {
                'title': '3. Official Contact Details',
                'fields': [
                    ('Contact Person / Head', sa.contact_person, 'contactPerson', False, False),
                    ('Designation', sa.designation, 'designation', False, False),
                    ('Primary Mobile / Phone', getattr(target_school, 'phone', '') or sa.mobile, 'phone', False, False),
                    ('Landline Number', getattr(target_school, 'landline', ''), 'landline', False, False),
                    ('Official Email', getattr(target_school, 'email', '') or sa.email, 'email', False, False),
                    ('Official Website URL', getattr(target_school, 'website', ''), 'website', False, False),
                ]
            },
            {
                'title': '4. Academic & Campus Details',
                'fields': [
                    ('Year Established', getattr(target_school, 'established', None), 'established', False, False),
                    ('Total Students Enrolled', getattr(target_school, 'students', None), 'students', False, False),
                    ('Total Teaching Staff', getattr(target_school, 'teachers', None), 'teachers', False, False),
                    ('Student-Teacher Ratio', getattr(target_school, 'student_teacher_ratio', ''), 'studentTeacherRatio', False, False),
                    ('School Timings', getattr(target_school, 'school_timing', ''), 'schoolTiming', False, False),
                    ('Affiliation No.', getattr(target_school, 'affiliation_no', ''), 'affiliationNo', False, False),
                    ('Campus Size / Type', getattr(target_school, 'campus', ''), 'campus', False, False),
                ]
            },
            {
                'title': '5. About the School & Medium',
                'fields': [
                    ('Medium of Instruction', getattr(target_school, 'medium', ''), 'medium', False, False),
                    ('About the School (Overview)', getattr(target_school, 'about', ''), 'about', False, False),
                ]
            },
            {
                'title': '6. Facilities & Amenities',
                'fields': [
                    ('Campus Facilities', getattr(target_school, 'facilities', []) or [], 'facilities', False, True),
                ]
            },
            {
                'title': '7. Annual Fee Structure',
                'fields': [
                    ('Minimum Annual Fee (Rs.)', getattr(target_school, 'feeMin', 0), 'feeMin', False, False),
                    ('Maximum Annual Fee (Rs.)', getattr(target_school, 'feeMax', 0), 'feeMax', False, False),
                    ('Fee Note / Payment Terms', getattr(target_school, 'feeNote', ''), 'feeNote', False, False),
                ]
            },
            {
                'title': '8. Admissions Information',
                'fields': [
                    ('Admission Status', getattr(target_school, 'admission_status', ''), 'admissionStatus', False, False),
                    ('Admission Academic Session', getattr(target_school, 'current_admission_session', ''), 'admissionSession', False, False),
                ]
            },
            {
                'title': '9. Photos, Logo & Brochure',
                'fields': [
                    ('Campus Cover Image', getattr(target_school, 'image', ''), 'image', True, False),
                    ('School Logo', getattr(target_school, 'logo_url', ''), 'logoUrl', True, False),
                    ('School Brochure Link', getattr(sa, 'brochure_url', ''), 'brochureUrl', False, False),
                ]
            },
            {
                'title': '10. Social Media & Online Profiles',
                'fields': [
                    ('YouTube Video / Channel', getattr(target_school, 'youtube_url', ''), 'youtubeUrl', False, False),
                    ('Facebook Page', getattr(target_school, 'facebook_url', ''), 'facebookUrl', False, False),
                    ('Instagram Profile', getattr(target_school, 'instagram_url', ''), 'instagramUrl', False, False),
                    ('LinkedIn Profile', getattr(target_school, 'linkedin_url', ''), 'linkedinUrl', False, False),
                ]
            },
        ]

        sections_data = []
        total_changed = 0

        for sec in sections_spec:
            sec_changed = 0
            sec_fields = []
            for label, curr_raw, draft_key, is_image, is_list in sec['fields']:
                has_in_draft = draft_key in draft
                new_raw = draft[draft_key] if has_in_draft else curr_raw

                if is_list:
                    c_list = [str(x).strip() for x in (curr_raw or []) if str(x).strip()]
                    n_list = [str(x).strip() for x in (new_raw or []) if str(x).strip()]
                    changed = has_in_draft and (sorted(c_list) != sorted(n_list))
                    curr_val = c_list
                    new_val = n_list
                else:
                    c_str = "" if curr_raw is None else str(curr_raw).strip()
                    n_str = "" if new_raw is None else str(new_raw).strip()
                    changed = has_in_draft and (c_str != n_str)
                    curr_val = c_str
                    new_val = n_str if has_in_draft else c_str

                if changed:
                    sec_changed += 1
                    total_changed += 1

                sec_fields.append({
                    'label': label,
                    'current_val': curr_val,
                    'new_val': new_val,
                    'is_changed': changed,
                    'is_image': is_image,
                    'is_list': is_list,
                })

            sections_data.append({
                'title': sec['title'],
                'changed_in_section': sec_changed,
                'fields': sec_fields,
            })

        # Extra dynamic fields (Fee Components, Awards, Campus Videos)
        extra_fields = []
        if 'feeComponents' in draft and isinstance(draft['feeComponents'], list) and draft['feeComponents']:
            fcs = [f"{fc.get('className') or ''} - {fc.get('name')}: Rs. {fc.get('amount')} ({fc.get('frequency', 'Annually')})" for fc in draft['feeComponents']]
            extra_fields.append({
                'label': 'Detailed Fee Components',
                'current_val': [f"{fc.class_name} - {fc.name}: Rs. {fc.amount} ({fc.frequency})" for fc in (target_school.fee_components.all() if target_school else [])],
                'new_val': fcs,
                'is_changed': True,
                'is_image': False,
                'is_list': True,
            })
            total_changed += 1

        if 'awards' in draft and isinstance(draft['awards'], list) and draft['awards']:
            aws = [f"{a.get('name')} ({a.get('position', '')} - {a.get('year', '')})" for a in draft['awards'] if a.get('name')]
            extra_fields.append({
                'label': 'School Awards & Achievements',
                'current_val': [f"{a.name} ({a.position} - {a.year})" for a in (target_school.award_items.all() if target_school else [])],
                'new_val': aws,
                'is_changed': True,
                'is_image': False,
                'is_list': True,
            })
            total_changed += 1

        if 'videos' in draft and isinstance(draft['videos'], list) and draft['videos']:
            vids = [f"{v.get('title')}: {v.get('youtubeUrl')}" for v in draft['videos'] if v.get('youtubeUrl')]
            extra_fields.append({
                'label': 'Campus Videos',
                'current_val': [f"{v.title}: {v.youtube_url}" for v in (target_school.video_items.all() if target_school else [])],
                'new_val': vids,
                'is_changed': True,
                'is_image': False,
                'is_list': True,
            })
            total_changed += 1

        if extra_fields:
            sections_data.append({
                'title': '11. Additional Items (Fee Breakdown, Awards, Videos)',
                'changed_in_section': len(extra_fields),
                'fields': extra_fields,
            })

        context = {
            **self.admin_site.each_context(request),
            'title': f"Review Profile Edits: {target_school.name if target_school else sa.institution_name}",
            'account': sa,
            'school': target_school,
            'sections_data': sections_data,
            'changed_count': total_changed,
        }
        return TemplateResponse(request, 'admin/schools/schoolaccount/review_edits.html', context)

    def quick_create_school_login_view(self, request):
        ensure_default_plans()
        school_pk = request.GET.get('school_id') or request.POST.get('school_id')
        pre_school = School.objects.filter(pk=school_pk).first() if school_pk else None

        if request.method == 'POST':
            sid = request.POST.get('school_pk')
            school_obj = School.objects.filter(pk=sid).first() if sid else None
            inst_name = (request.POST.get('institution_name') or (school_obj.name if school_obj else '')).strip()
            contact = (request.POST.get('contact_person') or 'Principal / Director').strip()
            mobile = ''.join(ch for ch in (request.POST.get('mobile') or '') if ch.isdigit())[-10:]
            email = (request.POST.get('email') or '').strip().lower()
            password = (request.POST.get('password') or '').strip()
            plan_id = request.POST.get('plan_id')

            if not inst_name or len(mobile) != 10 or not email or len(password) < 6:
                messages.error(request, 'Please provide the School Name, 10-digit Mobile, Email, and Password (minimum 6 characters).')
            else:
                username = f"school_{mobile}"
                if User.objects.filter(username=username).exists():
                    username = f"school_{mobile}_{User.objects.count() + 1}"
                with transaction.atomic():
                    if not school_obj:
                        school_obj = School.objects.create(
                            name=inst_name, area='Main Campus', city=request.POST.get('city') or 'Delhi',
                            phone=mobile, email=email, isActive=True,
                        )
                    u = User.objects.create_user(username=username, email=email, password=password, first_name=contact[:30])
                    SchoolAccount.objects.create(
                        user=u, school=school_obj, school_link_status='approved',
                        institution_name=school_obj.name,
                        contact_person=contact, mobile=mobile, email=email,
                        city=school_obj.city, state=school_obj.state, status='approved',
                        approved_by=request.user, approved_at=timezone.now(),
                    )
                    if plan_id:
                        plan = Plan.objects.filter(pk=plan_id).first()
                        if plan:
                            SchoolMembership.objects.create(
                                school=school_obj, plan=plan, plan_name=plan.name, plan_type=plan.plan_type,
                                leads_total=plan.leads_included, amount=plan.price, gst_percent=plan.gst_percent,
                                payment_mode='upi', payment_note='Assigned on account creation',
                                status='active', assigned_by=request.user,
                            )
                messages.success(
                    request,
                    f"School Owner Account created for {school_obj.name}. Login ID: {mobile} (or {email}) | Password: {password}",
                )
                return redirect('admin:schools_schoolaccount_changelist')

        from django.middleware.csrf import get_token
        csrf_token = get_token(request)
        plans = Plan.objects.filter(is_active=True)
        schools_sample = School.objects.order_by('name')[:300]
        html_content = f"""
        <div style="max-width:720px;margin:20px auto;background:#fff;padding:28px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
          <h2 style="margin-top:0;color:#0A5C91;font-weight:800;">Create School Owner Login Account</h2>
          <p style="color:#64748b;font-size:14px;">Create an approved login ID and password for a school owner and optionally assign an initial membership plan.</p>
          <form method="post">
            <input type="hidden" name="csrfmiddlewaretoken" value="{csrf_token}">
            <div style="margin-bottom:14px;">
              <label style="font-weight:700;display:block;margin-bottom:4px;">Select Existing School (or leave blank to create a new school)</label>
              <select name="school_pk" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;">
                <option value="{pre_school.pk if pre_school else ''}">{f"{pre_school.name} ({pre_school.city})" if pre_school else "-- Select School --"}</option>
                {''.join(f'<option value="{s.pk}">{s.name} ({s.city}) [ID: {s.school_id}]</option>' for s in schools_sample)}
              </select>
            </div>
            <div style="margin-bottom:14px;">
              <label style="font-weight:700;display:block;margin-bottom:4px;">School / Institution Name (if creating new)</label>
              <input type="text" name="institution_name" value="{pre_school.name if pre_school else ''}" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;" placeholder="e.g. Delhi Public School">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
              <div>
                <label style="font-weight:700;display:block;margin-bottom:4px;">Owner / Contact Person Name *</label>
                <input type="text" name="contact_person" value="Principal / Director" required style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;">
              </div>
              <div>
                <label style="font-weight:700;display:block;margin-bottom:4px;">10-Digit Mobile Number (Login ID) *</label>
                <input type="text" name="mobile" value="{pre_school.phone if pre_school else ''}" maxlength="10" required style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;" placeholder="9876543210">
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
              <div>
                <label style="font-weight:700;display:block;margin-bottom:4px;">Official Email Address (Login ID) *</label>
                <input type="email" name="email" value="{pre_school.email if pre_school else ''}" required style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;" placeholder="principal@school.edu.in">
              </div>
              <div>
                <label style="font-weight:700;display:block;margin-bottom:4px;">Login Password *</label>
                <input type="text" name="password" value="Welcome@123" required style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;">
              </div>
            </div>
            <div style="margin-bottom:18px;">
              <label style="font-weight:700;display:block;margin-bottom:4px;">Optional: Assign Initial Membership Plan</label>
              <select name="plan_id" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;">
                <option value="">-- No Paid Plan Yet (Contacts Stay Masked) --</option>
                {''.join(f'<option value="{p.pk}">{p.name} — Rs. {p.price} + GST ({p.leads_included} Leads)</option>' for p in plans)}
              </select>
            </div>
            <button type="submit" class="btn btn-primary" style="padding:10px 24px;font-weight:700;border-radius:8px;">Create School Login Account</button>
            <a href="{reverse('admin:schools_schoolaccount_changelist')}" class="btn btn-secondary" style="margin-left:8px;padding:10px 18px;border-radius:8px;">Cancel</a>
          </form>
        </div>
        """
        return HttpResponse(self._wrap_admin_page(request, "Create School Login", html_content))

    def _wrap_admin_page(self, request, title, body_html):
        return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>{title} | VidyaVista Admin</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">
        </head><body style="background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;padding:24px;">
        <div style="max-width:860px;margin:0 auto 12px;"><a href="/admin/" style="font-weight:700;color:#0A5C91;">&larr; Back to VidyaVista Administration</a></div>
        {body_html}</body></html>"""

    @admin.display(description='Owner / Contact Person')
    def owner_contact_card(self, obj):
        count, reasons = self.pending_notifications_info(obj)
        notif_html = ''
        if count > 0:
            title_text = f'{count} Pending Approval(s): {", ".join(reasons)}'
            notif_html = format_html(
                '<span title="{0}" '
                'style="background:#dc2626; color:#fff; border-radius:50%; width:20px; height:20px; '
                'display:inline-flex; align-items:center; justify-content:center; font-size:11px; '
                'font-weight:800; margin-left:6px; box-shadow:0 0 0 2px #fff, 0 1px 4px rgba(220,38,38,0.5);">{1}</span>',
                title_text,
                count,
            )

        change_url = reverse('admin:schools_schoolaccount_change', args=[obj.pk])
        owner_name = obj.contact_person or obj.institution_name or f'Account #{obj.pk}'
        designation = obj.designation or 'Founder / Director'

        return format_html(
            '<div style="min-width:140px;">'
            '<div style="display:flex; align-items:center;">'
            '<a href="{}" style="font-weight:700; font-size:13px; color:#0B2A47; text-decoration:none;">{}</a>'
            '{}'
            '</div>'
            '<div style="color:#64748b; font-size:11px; margin-top:2px;">{}</div>'
            '<div style="margin-top:6px;">'
            '<a href="{}" class="btn btn-xs" style="background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1; '
            'border-radius:4px; padding:2px 8px; font-size:10px; font-weight:600; display:inline-flex; align-items:center; gap:4px; text-decoration:none;" '
            'title="Edit Owner personal profile and account details">'
            '<i class="fas fa-user-edit" style="color:#0284c7;"></i> Edit Owner Info'
            '</a>'
            '</div>'
            '</div>',
            change_url,
            owner_name,
            notif_html,
            designation,
            change_url,
        )

    @admin.display(description='All Schools Managed by Owner')
    def all_schools_display(self, obj):
        schools_data = []
        seen = set()

        # 1. Primary Active School
        if obj.school:
            seen.add(obj.school.pk)
            schools_data.append({
                'school': obj.school,
                'role': 'Active School',
                'is_primary': True,
                'status': 'Live & Linked' if obj.school_link_status == 'approved' else obj.get_school_link_status_display(),
                'is_pending': obj.school_link_status in ('pending_claim', 'pending_new'),
                'claim_id': None,
            })
        elif obj.requested_school:
            seen.add(obj.requested_school.pk)
            schools_data.append({
                'school': obj.requested_school,
                'role': 'Requested School',
                'is_primary': False,
                'status': f'Claim {obj.get_school_link_status_display()}',
                'is_pending': obj.school_link_status in ('pending_claim', 'pending_new'),
                'claim_id': None,
            })

        # 2. Owner record schools (all schools linked to this owner)
        if obj.owner_record:
            for sc in obj.owner_record.schools.all():
                if sc.pk not in seen:
                    seen.add(sc.pk)
                    schools_data.append({
                        'school': sc,
                        'role': 'Linked School',
                        'is_primary': False,
                        'status': 'Approved & Live',
                        'is_pending': False,
                        'claim_id': None,
                    })

        # 3. Branch claims
        for bc in obj.branch_claims.select_related('school').all():
            if bc.school and bc.school.pk not in seen:
                seen.add(bc.school.pk)
                schools_data.append({
                    'school': bc.school,
                    'role': 'Linked School',
                    'is_primary': False,
                    'status': bc.get_status_display(),
                    'is_pending': bc.status == 'pending',
                    'claim_id': bc.pk,
                })

        if not schools_data:
            if obj.school_link_status == 'pending_new':
                nd = obj.pending_new_school_data or {}
                name = nd.get('name') or obj.institution_name or 'New School Submission'
                city = nd.get('city') or obj.city or ''
                return format_html(
                    '<div style="background:#fef3c7; border:1px solid #fde68a; border-radius:6px; padding:6px 10px;">'
                    '<span style="font-weight:700; color:#b45309;"><i class="fas fa-clock"></i> New School Pending: {}</span>'
                    '<div style="font-size:11px; color:#92400e;">{}</div>'
                    '</div>',
                    name, city,
                )
            return format_html('<span style="color:#64748b; font-style:italic;">No schools linked yet</span>')

        cards = []
        assign_plan_base = reverse('admin:schools_schoolmembership_add')
        review_edits_url = reverse('admin:schools_schoolaccount_review_edits', args=[obj.pk])

        for item in schools_data:
            sc = item['school']
            school_url = reverse('admin:schools_school_change', args=[sc.pk])

            # School link status badge
            if item['is_pending']:
                status_badge = '<span style="background:#fee2e2; color:#991b1b; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:700;"><i class="fas fa-clock"></i> Pending Claim</span>'
            elif item['is_primary']:
                status_badge = '<span style="background:#e0f2fe; color:#0369a1; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:700;">Active School</span>'
            else:
                status_badge = '<span style="background:#dcfce7; color:#15803d; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:700;">Approved School</span>'

            # Profile edits status badge with review button
            has_pending_edits = (obj.edit_approval_status == 'pending') and (
                obj.school_id == sc.pk or (obj.pending_edit_data and obj.pending_edit_data.get('school_id') == sc.pk) or not obj.school_id
            )
            if has_pending_edits:
                edits_badge = (
                    f'<a href="{review_edits_url}" class="btn btn-xs" '
                    f'style="background:#fef2f2; color:#dc2626; border:1px solid #f87171; border-radius:4px; padding:1px 6px; font-size:10px; font-weight:800; text-decoration:none;" '
                    f'title="Review Profile Edits submitted by school owner">'
                    f'<i class="fas fa-bell"></i> Review Edits (Pending)</a>'
                )
            elif obj.edit_approval_status == 'approved':
                edits_badge = '<span style="color:#16a34a; font-size:10px; font-weight:600;"><i class="fas fa-check"></i> Profile Live</span>'
            else:
                edits_badge = '<span style="color:#94a3b8; font-size:10px;">Up to Date</span>'

            # Plan & Credits for this school
            m = sc.memberships.filter(status='active').first()
            if m:
                plan_badge = (
                    f'<span style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:700;" title="{m.plan_name}">'
                    f'<i class="fas fa-award"></i> {m.plan_name[:16]} ({m.days_remaining}d) &bull; {sc.leads_quota_remaining} Credits</span>'
                )
            else:
                plan_badge = '<span style="color:#94a3b8; font-size:10px;">No Paid Plan &bull; 0 Credits</span>'

            # Buttons for this school
            edit_btn = (
                f'<a href="{school_url}" class="btn btn-xs" '
                f'style="background:#0795DC; color:#fff; border-radius:4px; padding:2px 7px; font-size:10px; font-weight:700; text-decoration:none; white-space:nowrap;" '
                f'title="Edit full school details (fees, images, facilities)"><i class="fas fa-edit"></i> Edit School</a>'
            )
            plan_btn = (
                f'<a href="{assign_plan_base}?school={sc.pk}" class="btn btn-xs btn-success" '
                f'style="border-radius:4px; padding:2px 7px; font-size:10px; font-weight:700; text-decoration:none; margin-left:4px;" '
                f'title="Assign Membership Plan or Top-up Leads"><i class="fas fa-plus"></i> Plan</a>'
            )

            approve_btn = ''
            if item['is_pending']:
                if item.get('claim_id'):
                    app_url = reverse('admin:schools_schoolaccount_approve_branch_claim', args=[obj.pk, item['claim_id']])
                    approve_btn = (
                        f'<a href="{app_url}" class="btn btn-xs btn-info" '
                        f'style="border-radius:4px; padding:2px 7px; font-size:10px; font-weight:700; text-decoration:none; margin-left:4px;">'
                        f'<i class="fas fa-check"></i> Approve Claim</a>'
                    )
                else:
                    app_url = reverse('admin:schools_schoolaccount_approve_school', args=[obj.pk])
                    approve_btn = (
                        f'<a href="{app_url}" class="btn btn-xs btn-info" '
                        f'style="border-radius:4px; padding:2px 7px; font-size:10px; font-weight:700; text-decoration:none; margin-left:4px;">'
                        f'<i class="fas fa-check"></i> Approve School</a>'
                    )

            cards.append(f'''
                <div style="padding:8px 0; border-bottom:1px solid #f1f5f9; display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                        <a href="{school_url}" style="font-weight:700; font-size:13px; color:#0A5C91; text-decoration:none;" title="Click to edit {sc.name}">
                            <i class="fas fa-school" style="color:#0795DC; margin-right:4px;"></i>{sc.name}
                        </a>
                        <div style="display:inline-flex; align-items:center;">
                            {edit_btn}
                            {plan_btn}
                            {approve_btn}
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-size:11px;">
                        <span style="color:#64748b;">{sc.city or "-"} (Live ID: {sc.school_id or sc.pk})</span>
                        {status_badge}
                        {edits_badge}
                        {plan_badge}
                    </div>
                </div>
            ''')

        return format_html('<div style="min-width:320px; display:flex; flex-direction:column;">' + ''.join(cards) + '</div>')

    @admin.display(description='1. Owner Status')
    def owner_status_badge(self, obj):
        colors = {
            'approved': ('#dcfce7', '#15803d', 'fa-check-circle', 'Owner Approved'),
            'pending': ('#fef3c7', '#b45309', 'fa-clock', 'Owner Pending'),
            'rejected': ('#fee2e2', '#b91c1c', 'fa-times-circle', 'Rejected'),
            'suspended': ('#f1f5f9', '#475569', 'fa-ban', 'Suspended'),
        }
        bg, fg, icon, label = colors.get(obj.status, ('#f1f5f9', '#334155', 'fa-info-circle', obj.status))
        return format_html(
            '<span style="background:{};color:{};padding:4px 10px;border-radius:99px;font-weight:600;font-size:11px;white-space:nowrap;">'
            '<i class="fas {}" style="margin-right:4px;"></i>{}</span>',
            bg, fg, icon, label,
        )

    @admin.display(description='2. School Link')
    def school_link_badge(self, obj):
        styles = {
            'none': ('#f1f5f9', '#64748b', 'fa-minus-circle', 'Not Selected'),
            'pending_claim': ('#fef3c7', '#b45309', 'fa-hourglass-half', 'Claim Pending'),
            'pending_new': ('#e0f2fe', '#0369a1', 'fa-plus-circle', 'New School Pending'),
            'approved': ('#dcfce7', '#15803d', 'fa-check-circle', 'School Approved'),
            'rejected': ('#fee2e2', '#b91c1c', 'fa-times-circle', 'School Rejected'),
        }
        bg, fg, icon, label = styles.get(obj.school_link_status, ('#f1f5f9', '#475569', 'fa-info-circle', obj.school_link_status))
        return format_html(
            '<span style="background:{};color:{};padding:4px 10px;border-radius:99px;font-weight:600;font-size:11px;white-space:nowrap;">'
            '<i class="fas {}" style="margin-right:4px;"></i>{}</span>',
            bg, fg, icon, label,
        )

    @admin.display(description='3. Profile Edits')
    def edits_status_badge(self, obj):
        styles = {
            'none': ('#f8fafc', '#94a3b8', 'fa-check', 'Up to Date'),
            'pending': ('#fce7f3', '#be185d', 'fa-edit', 'Edits Pending Approval'),
            'approved': ('#dcfce7', '#15803d', 'fa-check-double', 'Edits Published'),
            'rejected': ('#fee2e2', '#b91c1c', 'fa-exclamation-circle', 'Edits Rejected'),
        }
        bg, fg, icon, label = styles.get(obj.edit_approval_status, ('#f8fafc', '#64748b', 'fa-info-circle', obj.edit_approval_status))
        return format_html(
            '<span style="background:{};color:{};padding:4px 10px;border-radius:99px;font-weight:600;font-size:11px;white-space:nowrap;">'
            '<i class="fas {}" style="margin-right:4px;"></i>{}</span>',
            bg, fg, icon, label,
        )

    @admin.display(description='Active Plan')
    def active_plan_display(self, obj):
        m = obj.active_memberships().first()
        if not m:
            return format_html('<span style="color:#94a3b8;font-size:12px;">No Paid Plan</span>')
        return format_html(
            '<span style="background:#e0f2fe;color:#0369a1;padding:3px 9px;border-radius:8px;font-weight:600;font-size:11px;">{} ({}d left)</span>',
            m.plan_name[:26], m.days_remaining,
        )

    @admin.display(description='Lead Credits')
    def leads_balance_display(self, obj):
        rem = obj.total_leads_remaining()
        tot = obj.total_leads_quota()
        if tot == 0:
            return format_html('<span style="color:#dc2626;font-weight:600;font-size:12px;">0 Credits</span>')
        color = '#15803d' if rem > 10 else ('#d97706' if rem > 0 else '#dc2626')
        return format_html('<strong style="color:{};font-size:12px;">{} / {} Left</strong>', color, rem, tot)

    @admin.display(description='Account Actions')
    def admin_actions_column(self, obj):
        buttons = []
        if obj.status == 'pending':
            url = reverse('admin:schools_schoolaccount_approve_owner', args=[obj.pk])
            buttons.append(f'<a class="btn btn-xs btn-warning" style="margin:2px;border-radius:6px;font-weight:700;" href="{url}"><i class="fas fa-user-check"></i> Approve Owner</a>')

        pwd_url = reverse('admin:auth_user_password_change', args=[obj.user_id])
        buttons.append(f'<a class="btn btn-xs btn-primary" style="margin:2px;border-radius:6px;font-weight:600;" href="{pwd_url}"><i class="fas fa-key"></i> Password</a>')
        return format_html(''.join(buttons))

    @admin.action(description='Stage 1: Approve selected Owner Profiles')
    def approve_owner_profiles_action(self, request, queryset):
        count = 0
        for sa in queryset:
            approve_owner_profile(sa, admin_user=request.user)
            count += 1
        messages.success(request, f"{count} School Owner profile(s) approved.")

    @admin.action(description='Stage 2: Approve selected School Claims & New School Additions')
    def approve_school_claims_and_additions_action(self, request, queryset):
        count = 0
        for sa in queryset:
            approve_school_link(sa, admin_user=request.user)
            count += 1
        messages.success(request, f"{count} School claim(s) / new school submission(s) approved and linked.")

    @admin.action(description='Stage 3: Approve & Publish Pending School Profile Edits')
    def approve_pending_profile_edits_action(self, request, queryset):
        count = 0
        for sa in queryset:
            approve_school_edits(sa, admin_user=request.user)
            count += 1
        messages.success(request, f"Published profile edits for {count} school(s) to the live website.")

    @admin.action(description='Suspend selected School Owner Accounts')
    def suspend_accounts(self, request, queryset):
        n = queryset.update(status='suspended')
        messages.warning(request, f"{n} School account(s) suspended.")

    @admin.action(description='Assign 1-Year Verified Plan (100 Leads) to selected Schools')
    def assign_yearly_100_leads_plan(self, request, queryset):
        ensure_default_plans()
        plan = Plan.objects.filter(code='yearly-verified-100').first() or Plan.objects.filter(plan_type='yearly').first()
        count = 0
        for sa in queryset:
            if sa.school and plan:
                SchoolMembership.objects.create(
                    school=sa.school,
                    plan=plan,
                    plan_name=plan.name,
                    plan_type=plan.plan_type,
                    leads_total=plan.leads_included,
                    amount=plan.price,
                    gst_percent=plan.gst_percent,
                    payment_mode='upi',
                    payment_note='Assigned by Administrator',
                    status='active',
                    assigned_by=request.user,
                )
                count += 1
        messages.success(request, f"Assigned {plan.name} (+100 Leads & GST Invoice) to {count} school(s).")


# ============================================================================
# PARENT / STUDENT ACCOUNTS ADMIN
# ============================================================================

@admin.register(ParentProfile)
class ParentProfileAdmin(admin.ModelAdmin):
    list_display = (
        'parent_name', 'student_name', 'mobile', 'email',
        'looking_for_class', 'admission_type', 'preferred_city', 'preferred_board',
        'enquiries_sent_count', 'shortlisted_count', 'password_btn', 'created_at',
    )
    list_filter = ('admission_type', 'preferred_board', 'preferred_city', 'looking_for_class', 'created_at')
    search_fields = ('parent_name', 'student_name', 'mobile', 'email', 'preferred_city')
    autocomplete_fields = ('user',)
    readonly_fields = ('shortlisted_schools_table', 'enquiries_sent_count', 'shortlisted_count', 'created_at')
    fieldsets = (
        ('Parent & Student Profile', {
            'fields': ('parent_name', 'student_name', 'mobile', 'email', 'user', 'created_at')
        }),
        ('Admission Preferences', {
            'fields': ('looking_for_class', 'admission_type', 'preferred_city', 'preferred_state', 'preferred_board', 'budget', 'session')
        }),
        ('Schools Shortlisted by Parent', {
            'fields': ('shortlisted_schools_table',),
            'description': 'Real-time list of all schools this parent has saved to their shortlist.',
        }),
    )

    @admin.display(description='Enquiries Sent')
    def enquiries_sent_count(self, obj):
        cnt = Enquiry.objects.filter(mobile=obj.mobile).count()
        return format_html('<strong>{}</strong>', cnt)

    @admin.display(description='Shortlisted')
    def shortlisted_count(self, obj):
        return obj.user.shortlisted_schools.count() if obj.user_id else 0

    @admin.display(description='Shortlisted Schools')
    def shortlisted_schools_table(self, obj):
        if not obj.user_id:
            return "No user account linked."
        items = obj.user.shortlisted_schools.select_related('school').all()
        if not items.exists():
            return "No schools shortlisted yet."
        rows = []
        for it in items:
            sc = it.school
            if not sc:
                continue
            sc_url = reverse('admin:schools_school_change', args=[sc.pk])
            rows.append(
                f"<tr style='border-bottom:1px solid #e2e8f0;'>"
                f"<td style='padding:8px 12px;font-weight:600;'><a href='{sc_url}' target='_blank' style='color:#0A5C91;'>{sc.name}</a></td>"
                f"<td style='padding:8px 12px;'>{sc.city}</td>"
                f"<td style='padding:8px 12px;'>{sc.board}</td>"
                f"<td style='padding:8px 12px;'>{it.created_at.strftime('%d %b %Y, %I:%M %p')}</td>"
                f"</tr>"
            )
        return format_html(
            '<div style="max-width:850px;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;margin-top:6px;">'
            '<table style="width:100%;border-collapse:collapse;font-size:13px;">'
            '<thead style="background:#f1f5f9;border-bottom:1px solid #cbd5e1;text-align:left;">'
            '<tr><th style="padding:10px 12px;">School Name</th><th style="padding:10px 12px;">City</th><th style="padding:10px 12px;">Board</th><th style="padding:10px 12px;">Date Added</th></tr>'
            '</thead><tbody>{}</tbody></table></div>',
            format_html("".join(rows))
        )

    @admin.display(description='Password Control')
    def password_btn(self, obj):
        if not obj.user_id:
            return '-'
        url = reverse('admin:auth_user_password_change', args=[obj.user_id])
        return format_html(
            '<a class="btn btn-xs btn-primary" style="border-radius:6px;font-weight:600;" href="{}">'
            '<i class="fas fa-key" style="margin-right:4px;"></i>Set Password</a>',
            url,
        )


# ============================================================================
# PLANS, MEMBERSHIPS (RECHARGES) & GST INVOICES ADMIN
# ============================================================================

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'plan_type', 'price', 'gst_percent', 'total_with_gst_display',
        'leads_included', 'validity_days', 'badges_granted', 'is_popular', 'is_active', 'order',
    )
    list_filter = ('plan_type', 'is_active', 'grants_featured', 'grants_recommended', 'grants_top_rated')
    list_editable = ('price', 'leads_included', 'validity_days', 'is_popular', 'is_active', 'order')
    search_fields = ('name', 'code', 'description')
    prepopulated_fields = {'code': ('name',)}

    def get_queryset(self, request):
        ensure_default_plans()
        return super().get_queryset(request)

    @admin.display(description='Total incl. GST')
    def total_with_gst_display(self, obj):
        return f"Rs. {obj.total_price_with_gst:,}"

    @admin.display(description='Badges Included')
    def badges_granted(self, obj):
        badges = []
        if obj.grants_featured:
            badges.append('Featured')
        if obj.grants_recommended:
            badges.append('Recommended')
        if obj.grants_top_rated:
            badges.append('Top Rated')
        if obj.grants_verified:
            badges.append('Verified')
        return ', '.join(badges) if badges else 'Standard'


@admin.register(SchoolMembership)
class SchoolMembershipAdmin(admin.ModelAdmin):
    list_display = (
        'school', 'plan_name', 'plan_type', 'leads_progress_badge',
        'start_date', 'end_date', 'total_paid_display', 'payment_mode', 'status', 'invoice_button',
    )
    list_filter = ('status', 'plan_type', 'payment_mode', 'start_date')
    search_fields = ('school__name', 'plan_name', 'payment_note', 'coupon_code')
    autocomplete_fields = ('school',)
    readonly_fields = ('gst_amount', 'total_paid', 'created_at')

    fieldsets = (
        ('1. Select School & Plan / Lead Booster Pack', {
            'fields': ('school', 'plan', 'plan_name', 'plan_type', 'status'),
            'description': 'Select a school and choose a 1-Year Membership Plan (100 Leads) or a Lead Booster Top-up Pack (+50 / +100 Leads). Saving automatically adds credits, enables plan badges, and generates a GST Invoice.',
        }),
        ('2. Lead Credits & Validity Period', {
            'fields': (('leads_total', 'leads_used'), ('start_date', 'end_date')),
        }),
        ('3. Payment & GST Billing Details', {
            'fields': (('amount', 'discount', 'gst_percent'), ('gst_amount', 'total_paid'), ('payment_mode', 'coupon_code'), 'payment_note', 'assigned_by'),
        }),
    )

    def save_model(self, request, obj, form, change):
        if not obj.assigned_by_id:
            obj.assigned_by = request.user
        super().save_model(request, obj, form, change)

    @admin.display(description='Leads Used / Total')
    def leads_progress_badge(self, obj):
        rem = obj.leads_remaining
        color = '#15803d' if rem > 10 else ('#d97706' if rem > 0 else '#dc2626')
        return format_html(
            '<span style="color:{};font-weight:700;">{} left</span> <span style="color:#64748b;font-size:12px;">({}/{} used)</span>',
            color, rem, obj.leads_used, obj.leads_total,
        )

    @admin.display(description='Total Paid (incl. GST)')
    def total_paid_display(self, obj):
        return f"Rs. {obj.total_paid:,}"

    @admin.display(description='GST Invoice')
    def invoice_button(self, obj):
        inv = getattr(obj, 'invoice', None)
        if not inv:
            return '-'
        url = reverse('admin:schools_invoice_print', args=[inv.pk])
        return format_html(
            '<a class="btn btn-xs btn-outline-primary" target="_blank" href="{}">'
            '<i class="fas fa-file-invoice" style="margin-right:4px;"></i>{}</a>',
            url, inv.invoice_number,
        )


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        'invoice_number', 'recipient_name', 'plan_description',
        'subtotal', 'discount', 'gst_amount', 'total_amount',
        'payment_mode', 'status', 'issued_date', 'print_btn',
    )
    list_filter = ('status', 'payment_mode', 'issued_date')
    search_fields = ('invoice_number', 'recipient_name', 'plan_description')
    readonly_fields = ('invoice_number', 'created_at')
    actions = ['export_sales_csv']

    def get_urls(self):
        extra = [
            path('<int:pk>/print/', self.admin_site.admin_view(self.print_invoice_view), name='schools_invoice_print'),
        ]
        return extra + super().get_urls()

    @admin.display(description='Print / PDF')
    def print_btn(self, obj):
        url = reverse('admin:schools_invoice_print', args=[obj.pk])
        return format_html(
            '<a class="btn btn-xs btn-primary" target="_blank" style="border-radius:6px;font-weight:600;" href="{}">'
            '<i class="fas fa-print" style="margin-right:4px;"></i>View / Print Invoice</a>',
            url,
        )

    def print_invoice_view(self, request, pk):
        inv = get_object_or_404(Invoice, pk=pk)
        html = f"""<!DOCTYPE html>
        <html><head><meta charset="utf-8"><title>Invoice {inv.invoice_number} - VidyaVista</title>
        <style>
          body {{ font-family: Arial, Helvetica, sans-serif; background: #f8fafc; padding: 30px; color: #0f172a; }}
          .inv-box {{ max-width: 800px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }}
          .top {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0A5C91; padding-bottom: 20px; }}
          .brand {{ font-size: 28px; font-weight: 800; color: #0A5C91; }}
          .badge {{ background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 99px; font-weight: 700; font-size: 12px; text-transform: uppercase; }}
          table {{ width: 100%; border-collapse: collapse; margin-top: 24px; }}
          th {{ background: #f1f5f9; text-align: left; padding: 12px; font-size: 13px; text-transform: uppercase; color: #475569; }}
          td {{ padding: 14px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }}
          .totals {{ width: 320px; margin-left: auto; margin-top: 20px; }}
          .totals div {{ display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }}
          .totals .grand {{ font-size: 18px; font-weight: 800; color: #0A5C91; border-top: 2px solid #cbd5e1; padding-top: 10px; margin-top: 6px; }}
          @media print {{ .no-print {{ display: none; }} body {{ background: #fff; padding: 0; }} .inv-box {{ box-shadow: none; border: none; }} }}
        </style></head><body>
        <div class="inv-box">
          <div class="no-print" style="margin-bottom:20px;text-align:right;">
            <button onclick="window.print()" style="background:#0A5C91;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:700;cursor:pointer;">Print / Save as PDF</button>
          </div>
          <div class="top">
            <div>
              <div class="brand">VidyaVista</div>
              <div style="color:#64748b;font-size:13px;margin-top:4px;">Discover | Learn | Grow — Education Portal &amp; Admission Leads</div>
              <div style="color:#64748b;font-size:12px;margin-top:2px;">GST Tax Invoice</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:20px;font-weight:800;">{inv.invoice_number}</div>
              <div style="color:#64748b;font-size:13px;margin-top:4px;">Date: {inv.issued_date}</div>
              <div style="margin-top:8px;"><span class="badge">{inv.status}</span></div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:24px;font-size:14px;">
            <div>
              <div style="color:#64748b;font-weight:700;text-transform:uppercase;font-size:11px;">Billed To Institution</div>
              <div style="font-weight:800;font-size:16px;margin-top:4px;">{inv.recipient_name}</div>
              <div style="color:#475569;margin-top:2px;">{inv.recipient_address or 'India'}</div>
              {f'<div style="color:#475569;margin-top:2px;">GSTIN: {inv.recipient_gstin}</div>' if inv.recipient_gstin else ''}
            </div>
            <div style="text-align:right;">
              <div style="color:#64748b;font-weight:700;text-transform:uppercase;font-size:11px;">Payment Mode</div>
              <div style="font-weight:700;margin-top:4px;">{inv.payment_mode}</div>
            </div>
          </div>
          <table>
            <thead><tr><th>Membership / Lead Pack Description</th><th style="text-align:right;">Amount (INR)</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>{inv.plan_description}</strong><br><span style="color:#64748b;font-size:12px;">Includes Verified Parent Lead Credits &amp; Portal Access</span></td>
                <td style="text-align:right;font-weight:700;">Rs. {inv.subtotal:,}</td>
              </tr>
            </tbody>
          </table>
          <div class="totals">
            <div><span>Subtotal:</span><span>Rs. {inv.subtotal:,}</span></div>
            {f'<div><span>Discount:</span><span style="color:#15803d;">- Rs. {inv.discount:,}</span></div>' if inv.discount else ''}
            <div><span>GST ({inv.gst_percent}%):</span><span>Rs. {inv.gst_amount:,}</span></div>
            <div class="grand"><span>Total Paid:</span><span>Rs. {inv.total_amount:,}</span></div>
          </div>
          <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;text-align:center;">
            This is a computer-generated GST invoice issued by VidyaVista. Thank you for partnering with us.
          </div>
        </div></body></html>"""
        return HttpResponse(html)

    @admin.action(description='Export selected Invoices to Sales Report CSV')
    def export_sales_csv(self, request, queryset):
        resp = HttpResponse(content_type='text/csv; charset=utf-8')
        resp['Content-Disposition'] = 'attachment; filename="vidyavista-sales-report.csv"'
        resp.write('\ufeff')
        w = csv.writer(resp)
        w.writerow(['Invoice Number', 'Date', 'School Name', 'Plan Description', 'Subtotal', 'Discount', 'GST (18%)', 'Total Paid', 'Payment Mode', 'Status'])
        for inv in queryset:
            w.writerow([inv.invoice_number, inv.issued_date, inv.recipient_name, inv.plan_description, inv.subtotal, inv.discount, inv.gst_amount, inv.total_amount, inv.payment_mode, inv.status])
        return resp


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_type', 'discount_value', 'expiry_date', 'used_count', 'usage_limit', 'is_active')
    list_filter = ('discount_type', 'is_active')
    search_fields = ('code',)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('school', 'name', 'role', 'rating', 'is_approved', 'has_school_reply', 'created_at')
    list_filter = ('is_approved', 'rating', 'role')
    search_fields = ('school__name', 'name', 'text', 'school_reply')
    list_editable = ('is_approved',)
    actions = ['approve', 'unapprove']

    @admin.display(boolean=True, description='School Replied')
    def has_school_reply(self, obj):
        return bool(obj.school_reply)

    @admin.action(description='Approve selected reviews')
    def approve(self, request, queryset):
        for r in queryset:
            r.is_approved = True
            r.save()

    @admin.action(description='Unapprove selected reviews')
    def unapprove(self, request, queryset):
        for r in queryset:
            r.is_approved = False
            r.save()


@admin.register(Enquiry)
class EnquiryAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'parentName', 'childName', 'className', 'schoolName',
        'mobile', 'school_lead_badge', 'is_unlocked', 'credit_used', 'status', 'created_at',
    )
    list_filter = ('school_status', 'is_unlocked', 'status', 'created_at', 'city')
    search_fields = ('parentName', 'childName', 'schoolName', 'mobile', 'email', 'city')
    autocomplete_fields = ('school', 'parent_user')
    actions = ['unlock_lead_free', 'refund_credit_to_school']
    fields = (
        ('school', 'schoolId', 'schoolName'),
        ('parent_user', 'parentName', 'relation'),
        ('childName', 'className', 'session'),
        ('mobile', 'email', 'city'),
        'note', 'source', 'preference',
        ('school_status', 'is_unlocked', 'credit_used', 'lead_source_tag'),
        ('school_note', 'followup_date'),
        ('rejection_reason', 'review_reason'),
        ('status', 'adminNote'),
    )

    @admin.display(description='School Lead Status')
    def school_lead_badge(self, obj):
        styles = {
            'pending': ('#fef3c7', '#b45309', 'fa-lock', 'Masked / Pending'),
            'accepted': ('#dcfce7', '#15803d', 'fa-unlock', 'Unlocked (1 Credit)'),
            'rejected': ('#fee2e2', '#b91c1c', 'fa-times-circle', 'Rejected'),
            'review_requested': ('#fce7f3', '#be185d', 'fa-exclamation-triangle', 'Refund Requested'),
            'refunded': ('#e0f2fe', '#0369a1', 'fa-undo', 'Credit Refunded'),
        }
        bg, fg, icon, label = styles.get(obj.school_status, ('#f1f5f9', '#475569', 'fa-info-circle', obj.school_status))
        return format_html(
            '<span style="background:{};color:{};padding:3px 9px;border-radius:99px;font-weight:600;font-size:11px;">'
            '<i class="fas {}" style="margin-right:4px;"></i>{}</span>',
            bg, fg, icon, label,
        )

    @admin.action(description='Unlock selected leads for School (without deducting credit)')
    def unlock_lead_free(self, request, queryset):
        n = queryset.update(is_unlocked=True, school_status='accepted', unlocked_at=timezone.now())
        messages.success(request, f"{n} lead(s) unlocked for the school.")

    @admin.action(description='Approve Review Request & Refund +1 Lead Credit to School')
    def refund_credit_to_school(self, request, queryset):
        refunded = 0
        for lead in queryset:
            if lead.school and lead.credit_used and lead.school_status != 'refunded':
                mem = lead.school.memberships.order_by('-created_at').first()
                if mem and mem.leads_used > 0:
                    mem.leads_used -= 1
                    if mem.status == 'exhausted' and mem.leads_remaining > 0:
                        mem.status = 'active'
                    mem.save()
                lead.school_status = 'refunded'
                lead.credit_used = False
                lead.save()
                refunded += 1
        messages.success(request, f"Refunded +1 lead credit for {refunded} lead(s).")


class LocationHighlightInline(admin.TabularInline):
    model = LocationHighlight
    extra = 1
    fields = ('text', 'order')
    verbose_name_plural = 'Key Location Highlights (One row per highlight)'


class LocationFAQInline(admin.StackedInline):
    model = LocationFAQ
    extra = 1
    fields = ('question', 'answer', 'order')
    verbose_name_plural = 'Frequently Asked Questions (FAQs)'


@admin.register(LocationPage)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('kind', 'name', 'state', 'has_content', 'show_on_home', 'isActive')
    list_filter = ('kind', 'state', 'show_on_home', 'isActive')
    list_editable = ('show_on_home', 'isActive')
    search_fields = ('name', 'state', 'slug')
    inlines = [LocationHighlightInline, LocationFAQInline]

    @admin.display(boolean=True, description='Has Content')
    def has_content(self, obj):
        return bool(obj.description or obj.highlight_items.exists() or obj.faq_items.exists())

    fieldsets = (
        ('Location Details', {'fields': ('kind', 'name', 'slug', 'state', 'show_on_home', 'isActive')}),
        ('Page SEO & Description', {'fields': ('title', 'metaTitle', 'description')}),
        ('Hero Card Image', {'fields': ('image', 'image_url')}),
        ('Legacy Data', {'fields': ('photos', 'faqs'), 'classes': ('collapse',)}),
    )


# Shortlist is embedded directly inside ParentProfileAdmin below.
# LeadMessage and EmailOTP standalone views removed as requested.


# Unregistered standalone: consolidated inside SchoolAccountAdmin
class BranchClaimAdmin(admin.ModelAdmin):
    list_display = ('school', 'owner_name', 'proof', 'status_badge', 'created_at', 'approve_btn')
    list_filter = ('status', 'created_at')
    search_fields = ('school__name', 'account__contact_person', 'account__email', 'proof')
    readonly_fields = ('created_at', 'reviewed_at')
    actions = ['approve_selected_branches']

    @admin.display(description='Owner & Account')
    def owner_name(self, obj):
        return f"{obj.account.contact_person} ({obj.account.email})"

    @admin.display(description='Status')
    def status_badge(self, obj):
        colors = {'pending': '#eab308', 'approved': '#16a34a', 'rejected': '#dc2626'}
        return format_html(
            '<span style="background:{};color:#fff;padding:3px 10px;border-radius:12px;font-weight:700;font-size:11px;">{}</span>',
            colors.get(obj.status, '#64748b'),
            obj.get_status_display()
        )

    @admin.display(description='Admin Action')
    def approve_btn(self, obj):
        if obj.status == 'pending':
            url = reverse('admin:schools_branchclaim_change', args=[obj.pk])
            return format_html(
                '<a class="btn btn-xs btn-success" style="border-radius:6px;font-weight:600;" href="{}">'
                '<i class="fas fa-check" style="margin-right:4px;"></i>Review / Approve</a>',
                url
            )
        return obj.get_status_display()

    @admin.action(description='Approve Selected Branch Claims')
    def approve_selected_branches(self, request, queryset):
        cnt = 0
        for claim in queryset.filter(status='pending'):
            owner = claim.account.owner_record
            if not owner:
                owner = claim.account.sync_owner_record()
            claim.school.owner = owner
            claim.school.save(update_fields=['owner'])
            claim.status = 'approved'
            claim.reviewed_at = timezone.now()
            claim.save(update_fields=['status', 'reviewed_at'])
            cnt += 1
        messages.success(request, f"Approved {cnt} branch claims and linked them to their respective owners.")
