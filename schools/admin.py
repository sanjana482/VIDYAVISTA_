from django.contrib import admin
from .models import School, Enquiry, LocationPage
@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display=('school_id','name','city','state','board','type','fee','isActive')
    list_filter=('state','city','board','type','isActive')
    search_fields=('name','area','city','state')
    readonly_fields=('school_id','slug','created_at','updated_at')
@admin.register(Enquiry)
class EnquiryAdmin(admin.ModelAdmin):
    list_display=('parentName','schoolName','mobile','status','created_at')
    list_filter=('status','created_at')
    search_fields=('parentName','schoolName','mobile','email')
@admin.register(LocationPage)
class LocationAdmin(admin.ModelAdmin):
    list_display=('kind','name','state','isActive')
    list_filter=('kind','state','isActive')
    search_fields=('name','state','slug')
