import django.db.models.deletion
from django.db import migrations,models

class Migration(migrations.Migration):
    dependencies=[('cab_core','0013_run_finalization')]
    operations=[migrations.CreateModel(name='McpConnector',fields=[
        ('id',models.CharField(primary_key=True,max_length=64,serialize=False)),
        ('agent',models.CharField(max_length=24)),('process',models.JSONField()),('worker',models.JSONField(default=dict)),
        ('loaded_version',models.CharField(max_length=100,blank=True)),('catalog_version',models.CharField(max_length=100,blank=True)),
        ('generation',models.PositiveBigIntegerField(default=0)),('pending',models.PositiveIntegerField(default=0)),
        ('state',models.CharField(max_length=40,default='STARTING')),('error',models.CharField(max_length=100,blank=True)),
        ('seen',models.DateTimeField(auto_now=True)),
        ('actor',models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to='cab_core.actor')),
    ],options={'db_table':'mcp_connectors'}),migrations.CreateModel(name='ConnectorReload',fields=[
        ('update',models.OneToOneField(on_delete=django.db.models.deletion.PROTECT,primary_key=True,serialize=False,related_name='connector_reload',to='cab_core.systemupdate')),
        ('targets',models.JSONField(default=list)),('version',models.CharField(max_length=100,blank=True)),
        ('state',models.CharField(max_length=24,default='RECONNECTING')),('observations',models.JSONField(default=list)),
        ('updated',models.DateTimeField(auto_now=True)),
    ],options={'db_table':'connector_reloads'})]
