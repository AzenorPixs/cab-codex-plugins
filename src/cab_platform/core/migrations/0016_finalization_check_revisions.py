from django.db import migrations,models

class Migration(migrations.Migration):
    dependencies=[('cab_core','0015_mcp_stop_and_projection')]
    operations=[migrations.AddField(model_name='finalizationplan',name='check_revisions',field=models.JSONField(default=dict))]
