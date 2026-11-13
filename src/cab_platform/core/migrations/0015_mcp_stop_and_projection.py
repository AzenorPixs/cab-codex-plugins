import django.db.models.deletion
from django.db import migrations,models

class Migration(migrations.Migration):
    dependencies=[('cab_core','0014_mcp_connectors')]
    operations=[
        migrations.AddField(model_name='mcpconnector',name='relay_version',field=models.CharField(max_length=100,blank=True)),
        migrations.CreateModel(name='McpConnectorProjection',fields=[
            ('connector',models.OneToOneField(on_delete=django.db.models.deletion.PROTECT,primary_key=True,serialize=False,related_name='public_projection',to='cab_core.mcpconnector')),
            ('agent',models.CharField(max_length=24)),('uid',models.PositiveIntegerField()),
            ('loaded_version',models.CharField(max_length=100,blank=True)),('catalog_version',models.CharField(max_length=100,blank=True)),('relay_version',models.CharField(max_length=100,blank=True)),
            ('state',models.CharField(max_length=40)),('connected',models.BooleanField(default=False)),
        ],options={'db_table':'mcp_connector_projection'}),
        migrations.CreateModel(name='McpStopAttempt',fields=[
            ('id',models.CharField(primary_key=True,max_length=64,serialize=False)),('digest',models.CharField(max_length=64)),('report',models.JSONField()),('created',models.DateTimeField(auto_now_add=True)),
            ('connector',models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to='cab_core.mcpconnector')),
        ],options={'db_table':'mcp_stop_attempts'}),
    ]
