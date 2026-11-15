from django.db import migrations,models


class Migration(migrations.Migration):
    dependencies=[('cab_core','0021_agent_live_status')]
    operations=[
        migrations.AddField(model_name='agent',name='mcp_connected',field=models.BooleanField(null=True,default=None)),
        migrations.AddField(model_name='agent',name='mcp_versions',field=models.JSONField(default=list)),
    ]
