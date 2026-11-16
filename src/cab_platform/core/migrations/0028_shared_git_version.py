from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0027_git_projects')]
    operations = [migrations.AddField(model_name='cabversionprojection', name='git_version', field=models.CharField(blank=True, default='', max_length=100))]
