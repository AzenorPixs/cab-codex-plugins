from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0060_agent_catalog_live')]
    operations = [
        migrations.AddField(
            model_name='cycletokenusage',
            name='cache_write_tokens',
            field=models.PositiveBigIntegerField(null=True),
        ),
    ]
