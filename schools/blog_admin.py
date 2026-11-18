"""Django admin for blog posts. Imported from admin.py (one line)."""
from django import forms
from django.contrib import admin
from django.utils.html import format_html

from .models import BlogPost


class BlogPostForm(forms.ModelForm):
    class Meta:
        model = BlogPost
        fields = '__all__'
        widgets = {
            'excerpt': forms.Textarea(attrs={'rows': 3}),
            'body': forms.Textarea(attrs={'rows': 24, 'class': 'vv-blog-editor'}),
            'published_at': forms.DateInput(attrs={'type': 'date'}, format='%Y-%m-%d'),
        }


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    form = BlogPostForm
    list_display = ('thumb', 'title', 'category', 'published_at', 'status', 'is_published')
    list_display_links = ('thumb', 'title')
    list_editable = ('is_published',)
    list_filter = ('is_published', 'category', 'published_at')
    search_fields = ('title', 'excerpt', 'body', 'category')
    date_hierarchy = 'published_at'
    prepopulated_fields = {'slug': ('title',)}
    save_on_top = True

    fieldsets = (
        ('Post', {'fields': ('title', 'slug', 'category', 'excerpt', 'body')}),
        ('Photo (upload it yourself)', {'fields': ('cover_image', 'cover_alt')}),
        ('Date and visibility', {'fields': ('published_at', 'is_published', 'author')}),
        ('Button at the end (optional)', {'fields': ('cta_label', 'cta_url'), 'classes': ('collapse',)}),
        ('Google / SEO (optional)', {'fields': ('meta_title', 'meta_description'), 'classes': ('collapse',)}),
    )

    class Media:
        # CKEditor 5 (pinned version, loaded from its CDN). No pip package needed.
        js = ('https://cdn.ckeditor.com/ckeditor5/41.4.2/classic/ckeditor.js', 'schools/blog_editor.js')

    @admin.display(description='Photo')
    def thumb(self, obj):
        if not obj.cover_image:
            return '-'
        try:
            return format_html('<img src="{}" style="height:44px;width:70px;object-fit:cover;border-radius:6px">', obj.cover_image.url)
        except ValueError:
            return '-'

    @admin.display(description='Status')
    def status(self, obj):
        if not obj.is_published:
            return 'Draft'
        return 'Live' if obj.is_live else 'Scheduled'
