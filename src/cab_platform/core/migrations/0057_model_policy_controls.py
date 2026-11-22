from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0056_agent_model_policy')]
    operations = [
        migrations.AddField(
            model_name='agentmodelpolicy',
            name='model_filter',
            field=models.CharField(blank=True, default='', max_length=2048),
        ),
        migrations.AddField(
            model_name='agentmodelpolicy',
            name='cache_write_max',
            field=models.DecimalField(decimal_places=12, default=0, max_digits=24),
        ),
        migrations.AddField(
            model_name='agentmodelpolicy',
            name='cache_read_min',
            field=models.DecimalField(decimal_places=12, default=0, max_digits=24),
        ),
    ]
