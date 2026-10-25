from django import forms
from django.contrib import admin
from django.utils.html import format_html

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
        ('2. Homepage sections (tick karo)', {'fields': (('isFeatured', 'isRecommended', 'topRated'),),
            'description': 'Featured = homepage "Featured Schools". Recommended = "Recommended Schools". '
                           '"Highest Rated" automatic hai: parents ke approved reviews ki average se.'}),
        ('3. Contact', {'fields': (('phone', 'landline'), 'email', 'website')}),
        ('4. Cover image', {'fields': ('cover_image', 'image', 'cover_preview')}),
        ('5. About the school', {'fields': ('about',)}),
        ('6. School details', {'fields': (('established', 'students', 'teachers'), 'campus', 'facilities', 'extra_facilities')}),
        ('7. Social media links', {'fields': ('youtube_url', 'facebook_url', 'instagram_url', 'x_url', 'linkedin_url', 'other_url')}),
        ('8. Fees (yearly)', {'fields': (('feeMin', 'feeMax'), 'feeUpdated', 'feeNote')}),
        ('Ratings (auto, parents ke reviews se)', {'fields': (('rating', 'reviews'),), 'classes': ('collapse',)}),
        ('Old data (purana JSON, ab use mat karo)', {'fields': ('highlights', 'faqs', 'gallery'), 'classes': ('collapse',)}),
    )

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
                   'description': 'School add karte hi city/state yahan apne aap aa jate hain. Naam / slug mat badlo, sirf neeche ka content bharo.'}),
        ('Page content (Google + parents ko dikhta hai)', {'fields': ('title', 'metaTitle', 'description'),
                   'description': 'Title: page ka heading. Meta title: Google ka title. Khali chhodoge to automatic bana hua text dikhega.'}),
        ('Hero photo (optional)', {'fields': ('image', 'image_url'),
                   'description': 'Photo daalo to page ke upar animated photo dikhegi. Nahi daalo to school ki asli numbers (schools, boards, rating, fees) ke animated cards dikhte hain.'}),
        ('Old data', {'fields': ('photos', 'faqs'), 'classes': ('collapse',)}),
    )
