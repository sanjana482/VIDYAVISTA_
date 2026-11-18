import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('schools', '0014_review_rating_safety_alter_review_rating_academics_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='BlogPost',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('slug', models.SlugField(blank=True, help_text='Part of the URL (/blog/<slug>). Leave empty to create it from the title.', max_length=220, unique=True)),
                ('category', models.CharField(default='Choosing a school', help_text='Any text, e.g. Boards, Fees, Boarding, Admissions. Posts with the same category are grouped.', max_length=60)),
                ('excerpt', models.TextField(help_text='1-2 lines shown on cards and in Google.', max_length=400)),
                ('body', models.TextField(help_text='Write the full article here.', verbose_name='Article')),
                ('cover_image', models.ImageField(blank=True, help_text='Upload the photo yourself. Nothing is added automatically.', upload_to='blog/', verbose_name='Cover photo')),
                ('cover_alt', models.CharField(blank=True, default='', help_text='Short description of the photo (helps SEO and screen readers).', max_length=200, verbose_name='Photo description')),
                ('author', models.CharField(default='VidyaVista Editorial Team', max_length=120)),
                ('published_at', models.DateField(default=django.utils.timezone.localdate, help_text='Shown on the website. You can change it (past date, or a future date to schedule the post).', verbose_name='Post date')),
                ('is_published', models.BooleanField(default=True, help_text='Untick to keep it as a draft (not visible on the website).', verbose_name='Published')),
                ('meta_title', models.CharField(blank=True, default='', help_text='Optional. Google title (about 60 characters). Empty = post title.', max_length=70, verbose_name='SEO title')),
                ('meta_description', models.CharField(blank=True, default='', help_text='Optional. Google description (about 155 characters). Empty = excerpt.', max_length=170, verbose_name='SEO description')),
                ('cta_label', models.CharField(blank=True, default='', help_text='Optional button at the end of the post, e.g. See CBSE schools', max_length=60, verbose_name='Button text')),
                ('cta_url', models.CharField(blank=True, default='', help_text='Optional, e.g. /boarding-schools/india/board/cbse', max_length=300, verbose_name='Button link')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Blog post',
                'verbose_name_plural': 'Blog posts',
                'ordering': ['-published_at', '-id'],
            },
        ),
    ]
