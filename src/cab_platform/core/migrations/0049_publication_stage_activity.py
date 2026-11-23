from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0048_publication_cycle')]

    operations = [
        migrations.AddField(
            model_name='changestage', name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        migrations.AddField(
            model_name='changestageiteration', name='asynchronous',
            field=models.BooleanField(default=False, db_default=False),
        ),
        migrations.RemoveConstraint(
            model_name='changestageiteration', name='cab_one_open_stage_per_run',
        ),
        migrations.AddConstraint(
            model_name='changestageiteration',
            constraint=models.UniqueConstraint(
                fields=['run'],
                condition=models.Q(ended_at__isnull=True, parent__isnull=True, asynchronous=False),
                name='cab_one_open_stage_per_run',
            ),
        ),
    ]
