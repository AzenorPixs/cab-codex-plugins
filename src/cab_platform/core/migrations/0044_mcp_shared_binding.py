import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies=[('cab_core','0043_mcp_convergence')]
    operations=[
        migrations.CreateModel(name='McpThreadBinding',fields=[
            ('id',models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name='ID')),
            ('thread',models.CharField(max_length=200)),
            ('connector',models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,to='cab_core.mcpconnector')),
            ('run',models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,to='cab_core.run')),
        ],options={'db_table':'mcp_thread_bindings','constraints':[
            models.UniqueConstraint(fields=['connector','thread'],name='mcp_connector_thread_unique'),
        ]}),
    ]
