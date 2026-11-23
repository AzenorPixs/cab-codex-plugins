from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0058_model_policy_sort')]
    operations = [
        migrations.AddField(
            model_name='agentmodelpolicy',
            name='provider_ids',
            field=models.JSONField(blank=True, default=None, null=True),
        ),
    ]
