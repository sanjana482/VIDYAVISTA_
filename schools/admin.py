from django import forms
from django.contrib import admin
from .models import School, Enquiry, LocationPage, FeeComponent

class SchoolForm(forms.ModelForm):
    class Meta:
        model=School
        fields='__all__'
        help_texts={'grades':'Jaise: Nursery – Class 12 ya Class 1 – Class 10','state':'Jaise: Maharashtra'}

class FeeComponentInline(admin.TabularInline):
    model=FeeComponent
    extra=3
    fields=('session','class_name','name','frequency','amount')
    verbose_name='Fee component'
    verbose_name_plural='Fee components (har fee ke liye ek row bharo)'

@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    form=SchoolForm
    list_display=('school_id','name','city','state','board','type','feeMin','feeMax','isActive')
    list_filter=('state','city','board','type','isActive')
    search_fields=('name','area','city','state')
    readonly_fields=('school_id','slug','created_at','updated_at')
    inlines=[FeeComponentInline]
    fieldsets=(
        ('1. Basic details',{'fields':('name','area','city','state','grades','board','type','gender','phone','image',('rating','reviews'),('isActive','topRated'))}),
        ('2. About the school',{'fields':('about',)}),
        ('3. Fees (yearly)',{'fields':(('feeMin','feeMax'),'feeUpdated','feeNote')}),
    )


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


@admin.register(LocationPage)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('kind', 'name', 'state', 'isActive')
    list_filter = ('kind', 'state', 'isActive')
    search_fields = ('name', 'state', 'slug')
