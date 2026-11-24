from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0064_project_change_catalogue')]
    operations = [
        migrations.AddField(model_name='notification', name='artifacts', field=models.JSONField(default=list)),
    ]
