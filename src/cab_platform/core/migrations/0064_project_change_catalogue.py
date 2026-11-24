from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0063_agent_api_key_health')]
    operations = [
        migrations.AddField(model_name='change', name='catalogue', field=models.JSONField(default=list)),
        migrations.AddField(model_name='change', name='catalogue_hashes', field=models.JSONField(default=dict)),
        migrations.AddField(model_name='projectstatistics', name='next_catalogue_sync',
                            field=models.DateTimeField(null=True)),
    ]
