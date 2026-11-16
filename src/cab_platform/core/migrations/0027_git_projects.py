from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0026_interface_preferences_projection')]
    operations = [migrations.CreateModel(name='GitProject', fields=[
        ('project', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True, serialize=False, to='cab_core.project')),
        ('state', models.JSONField(default=dict)),
        ('checked_at', models.DateTimeField(null=True)),
    ], options={'db_table': 'git_projects'})]
