from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0051_stage_time_projections')]
    operations = [
        migrations.AddField(model_name='run', name='cycle_summary',
                            field=models.JSONField(default=dict, db_default={})),
    ]
