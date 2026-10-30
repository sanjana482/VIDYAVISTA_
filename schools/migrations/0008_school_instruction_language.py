
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('schools', '0007_school_academic_session_school_boarding_type_and_more'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name='school',
                    name='instruction_language',
                    field=models.CharField(
                        blank=True,
                        default='',
                        max_length=80,
                        verbose_name='Language of instruction',
                    ),
                ),
            ],
        ),
    ]
