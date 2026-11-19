from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('schools', '0015_blogpost'),
    ]

    operations = [
        migrations.CreateModel(
            name='CounsellorLead',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120, verbose_name='Parent / Student Name')),
                ('mobile', models.CharField(db_index=True, max_length=10, validators=[django.core.validators.RegexValidator('^[6-9]\\d{9}$', 'Enter a 10-digit mobile number only (no letters, spaces or +91).')], verbose_name='Mobile Number')),
                ('child_class', models.CharField(blank=True, default='', max_length=50, verbose_name='Seeking Admission for Class')),
                ('city', models.CharField(blank=True, default='', max_length=120, verbose_name='City / Preferred Location')),
                ('board', models.CharField(blank=True, choices=[('CBSE', 'CBSE'), ('State Board', 'State Board'), ('ICSE', 'ICSE / CISCE'), ('No Board', 'No Board'), ('Cambridge', 'Cambridge / IGCSE'), ('IB', 'IB Board'), ('NIOS', 'NIOS')], default='', max_length=40, verbose_name='Preferred Board')),
                ('budget', models.CharField(blank=True, default='', max_length=80, verbose_name='Annual Fee Budget')),
                ('notes', models.TextField(blank=True, default='', verbose_name='Additional Requirements / Notes')),
                ('status', models.CharField(choices=[('new', 'New Request'), ('contacted', 'Contacted / In Touch'), ('shortlisted', 'Schools Shortlisted / Visit Scheduled'), ('admitted', 'Admission Completed'), ('closed', 'Closed / Not Interested')], db_index=True, default='new', max_length=20, verbose_name='Status')),
                ('counsellor_remarks', models.TextField(blank=True, default='', verbose_name='Counsellor Call Notes / Follow-up')),
                ('source', models.CharField(blank=True, default='Home Guidance Banner', max_length=200, verbose_name='Source / Trigger Location')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Counsellor Request',
                'verbose_name_plural': 'School Counsellor Leads',
                'ordering': ['-created_at'],
            },
        ),
    ]
