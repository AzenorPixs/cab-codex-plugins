from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0033_git_delivery')]
    operations = [migrations.AddField(model_name='gitdelivery', name='plan', field=models.JSONField(default=dict))]
