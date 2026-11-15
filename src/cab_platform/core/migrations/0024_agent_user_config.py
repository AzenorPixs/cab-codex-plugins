from django.db import migrations,models

class Migration(migrations.Migration):
    dependencies=[('cab_core','0023_agent_users')]
    operations=[
        migrations.AddField(model_name='agentuser',name='config_present',field=models.BooleanField(null=True,default=None)),
        migrations.AddField(model_name='agentuser',name='config_path',field=models.CharField(max_length=1500,blank=True,default='')),
        migrations.AddField(model_name='agentuser',name='mcp_declared',field=models.BooleanField(null=True,default=None)),
        migrations.AddField(model_name='agentuser',name='config_error',field=models.CharField(max_length=100,blank=True,default='')),
        migrations.AddField(model_name='agentuser',name='reconcile_state',field=models.CharField(max_length=24,default='IDLE')),
    ]
