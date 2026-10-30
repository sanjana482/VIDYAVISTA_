import csv

from django import forms
from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.http import HttpResponse
from django.template.response import TemplateResponse
from django.urls import path
from django.utils.html import format_html

from . import importer

from .models import (
    FACILITY_CHOICES, Enquiry, FeeComponent, LocationFAQ, LocationHighlight, LocationPage, Owner, Review, School,
    SchoolFAQ, SchoolHighlight, SchoolPhoto,
)

# Phone box me letters type hi nahi honge (browser level) + server par bhi validate hota hai (models.py)
DIGITS = {'inputmode': 'numeric', 'autocomplete': 'off',
          'oninput': "this.value=this.value.replace(/[^0-9]/g,'')"}


class SchoolForm(forms.ModelForm):
    facilities = forms.MultipleChoiceField(
        choices=[], required=False, widget=forms.CheckboxSelectMultiple,
        help_text='Jo facilities school me hain unpe tick karo.')
    extra_facilities = forms.CharField(
        required=False, label='Other facilities',
        help_text='Upar list me nahi hai to yahan comma (,) laga ke likho. Jaise: Robotics lab, Horse riding')

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
    verbose_name = 'Fee component'
    verbose_name_plural = 'Fee components (har fee ke liye ek row bharo)'


class HighlightInline(admin.TabularInline):
    model = SchoolHighlight
    extra = 1
    fields = ('text', 'order')
    verbose_name_plural = 'Highlights (ek row = ek highlight)'


class FAQInline(admin.StackedInline):
    model = SchoolFAQ
    extra = 1
    fields = ('question', 'answer', 'order')
    verbose_name_plural = 'FAQs (jitne chahiye utne add karo)'


class PhotoInline(admin.TabularInline):
    model = SchoolPhoto
    extra = 1
    fields = ('image', 'image_url', 'caption', 'order')
    verbose_name_plural = 'Gallery photos (file choose karo ya link daalo)'


@admin.register(Owner)
class OwnerAdmin(admin.ModelAdmin):
    list_display = ('name', 'designation', 'phone', 'email')
    search_fields = ('name', 'email', 'phone')

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if 'phone' in form.base_fields:
            form.base_fields['phone'].widget.attrs.update({**DIGITS, 'maxlength': '10'})
        return form


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    form = SchoolForm
    change_list_template = 'admin/schools/school/change_list.html'
    list_display = ('school_id', 'name', 'city', 'state', 'board', 'type', 'owner', 'rating', 'reviews',
                    'isFeatured', 'isRecommended', 'isActive')
    list_filter = ('state', 'city', 'board', 'type', 'isFeatured', 'isRecommended', 'isActive')
    list_editable = ('isFeatured', 'isRecommended', 'isActive')
    search_fields = ('name', 'area', 'city', 'state', 'owner__name')
    autocomplete_fields = ('owner',)
    readonly_fields = ('school_id', 'slug', 'grades', 'rating', 'reviews', 'cover_preview', 'created_at', 'updated_at')
    inlines = [HighlightInline, FAQInline, PhotoInline, FeeComponentInline]
    fieldsets = (
        ('1. Basic details', {'fields': (
            'name', 'owner', ('area', 'city', 'state'), 'address', ('board', 'type', 'gender'),
            ('grade_from', 'grade_to'), 'grades', 'isActive')}),
        ('2. Homepage sections (tick here)', {'fields': (('isFeatured', 'isRecommended', 'topRated'),),
            'description': 'Featured = homepage "Featured Schools". Recommended = "Recommended Schools". '
                           '"Highest Rated" is automatic: it is calculated from the average of approved parent reviews.'}),
        ('3. Contact', {'fields': (('phone', 'landline'), 'email', 'website')}),
        ('4. Cover image', {'fields': ('cover_image', 'image', 'cover_preview')}),
        ('5. About the school', {'fields': ('about',)}),
        ('6. School details', {'fields': (('established', 'students', 'teachers'), 'campus', 'facilities', 'extra_facilities')}),
        ('7. Social media links', {'fields': ('youtube_url', 'facebook_url', 'instagram_url', 'x_url', 'linkedin_url', 'other_url')}),
        ('8. Fees (yearly)', {'fields': (('feeMin', 'feeMax'), 'feeUpdated', 'feeNote')}),
        ('9. More details (CSV import se aaye)', {'fields': (
            ('boarding_type', 'hostel', 'verified'), ('locality', 'pincode'), ('lat', 'lng'), 'extra_boards',
            ('medium', 'academic_session'), ('student_teacher_ratio', 'school_timing'), 'affiliation_no',
            ('languages', 'food_options'), ('latest_fee_session', 'current_admission_session'),
            'page_last_updated', 'logo_url', 'facility_groups'), 'classes': ('collapse',)}),
        ('Ratings (auto, parents ke reviews se)', {'fields': (('rating', 'reviews'),), 'classes': ('collapse',)}),
        
    )

    # ---------------------------------------------------------- "Import CSV" button on the schools list
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
                messages.error(request, 'First, choose the CSV file.')
            else:
                try:
                    text = f.read().decode('utf-8-sig')
                except UnicodeDecodeError:
                    messages.error(request, 'The file must be a UTF-8 CSV (Excel: Save As > CSV UTF-8).')
                else:
                    result = importer.import_csv_text(text)
                    if result['created']:
                        messages.success(request, f"{result['created']} Schools added successfully.")
        ctx = dict(self.admin_site.each_context(request), title='Import schools from CSV', opts=self.model._meta, result=result)
        return TemplateResponse(request, 'admin/schools/school/import_csv.html', ctx)

    def import_template_view(self, request):
        resp = HttpResponse(content_type='text/csv; charset=utf-8')
        resp['Content-Disposition'] = 'attachment; filename="vidyavista-schools-template.csv"'
        resp.write('\ufeff')
        csv.writer(resp).writerow(importer.TEMPLATE_COLUMNS)
        return resp

    @admin.display(description='Preview')
    def cover_preview(self, obj):
        src = ''
        if obj and obj.cover_image:
            src = obj.cover_image.url
        elif obj and obj.image:
            src = obj.image
        return format_html('<img src="{}" style="max-height:120px;border-radius:8px">', src) if src else '-'


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('school', 'name', 'role', 'rating', 'is_approved', 'created_at')
    list_filter = ('is_approved', 'rating', 'role')
    search_fields = ('school__name', 'name', 'text')
    list_editable = ('is_approved',)
    actions = ['approve', 'unapprove']

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
    list_display = ('id', 'parentName', 'schoolName', 'mobile', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('parentName', 'schoolName', 'mobile', 'email')
    fields = (
        'school', 'schoolId', 'schoolName',
        'childName', 'className', 'session',
        'parentName', 'relation', 'mobile', 'email',
        'city', 'note', 'source', 'preference',
        'status', 'adminNote',
    )


class LocationHighlightInline(admin.TabularInline):
    model = LocationHighlight
    extra = 1
    fields = ('text', 'order')
    verbose_name_plural = 'Key highlights (ek row = ek highlight)'


class LocationFAQInline(admin.StackedInline):
    model = LocationFAQ
    extra = 1
    fields = ('question', 'answer', 'order')
    verbose_name_plural = 'FAQs'


@admin.register(LocationPage)
class LocationAdmin(admin.ModelAdmin):
    """Har state / city ka page: yahin se title, description, highlights, FAQs badlo."""
    list_display = ('kind', 'name', 'state', 'has_content', 'isActive')
    list_filter = ('kind', 'state', 'isActive')
    search_fields = ('name', 'state', 'slug')
    inlines = [LocationHighlightInline, LocationFAQInline]
    @admin.display(boolean=True, description='Content bhara?')
    def has_content(self, obj):
        return bool(obj.description or obj.highlight_items.exists() or obj.faq_items.exists())

    fieldsets = (
        ('Place', {'fields': ('kind', 'name', 'slug', 'state', 'isActive'),
               'description': 'When you add a school, its city/state appear here automatically. Do not change the name / slug, just fill in the content below.'}),
        ('Page content (shown to Google + parents)', {'fields': ('title', 'metaTitle', 'description'),
               'description': 'Title: the heading of the page. Meta title: the title shown on Google. If you leave these empty, automatically generated text will be shown.'}),
        ('Hero photo (optional)', {'fields': ('image', 'image_url'),
               'description': 'If you add a photo, an animated photo is shown at the top of the page. If you do not, animated cards with the real numbers of the schools (schools, boards, rating, fees) are shown.'}),
        ('Old data', {'fields': ('photos', 'faqs'), 'classes': ('collapse',)}),
    )
