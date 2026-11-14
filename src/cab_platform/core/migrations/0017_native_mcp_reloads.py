import django.db.models.deletion
from django.db import migrations,models

class Migration(migrations.Migration):
    dependencies=[('cab_core','0016_finalization_check_revisions')]
    operations=[migrations.AddField(model_name='mcpconnector',name='uncertain',field=models.BooleanField(default=False)),migrations.CreateModel(name='NativeReload',fields=[
        ('id',models.CharField(primary_key=True,max_length=200,serialize=False)),
        ('target_version',models.CharField(max_length=100)),('owner',models.JSONField(default=dict)),
        ('input_digest',models.CharField(max_length=64)),('state',models.CharField(max_length=24,default='QUEUED')),
        ('dispatcher',models.JSONField(default=dict)),('result',models.JSONField(default=dict)),
        ('created',models.DateTimeField(auto_now_add=True)),('updated',models.DateTimeField(auto_now=True)),
        ('actor',models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to='cab_core.actor')),
    ],options={'db_table':'native_mcp_reloads'})]
