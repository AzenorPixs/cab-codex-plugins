from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0028_shared_git_version')]
    operations = [migrations.CreateModel(name='ForgeVersion', fields=[
        ('id', models.CharField(max_length=64, primary_key=True, serialize=False)),
        ('forge', models.CharField(max_length=16)),
        ('base_url', models.CharField(max_length=500)),
        ('version', models.CharField(blank=True, default='', max_length=100)),
        ('last_check', models.DateTimeField(null=True)),
        ('next_check', models.DateTimeField(null=True)),
    ], options={'db_table': 'forge_versions'})]
