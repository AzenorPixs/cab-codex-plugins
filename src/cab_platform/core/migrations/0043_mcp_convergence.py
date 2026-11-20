from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies=[('cab_core','0042_drop_delivery_progress_notifications')]
    operations=[
        migrations.AddField(model_name='mcpdisconnectrecovery',name='purpose',
                            field=models.CharField(default='loss',max_length=16)),
        migrations.CreateModel(name='McpConvergence',fields=[
            ('scope',models.CharField(max_length=100,primary_key=True,serialize=False)),
            ('incident',models.JSONField(default=dict)),
        ],options={'db_table':'mcp_convergence'}),
    ]
