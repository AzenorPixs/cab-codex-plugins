from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0030_session_git')]
    operations = [migrations.CreateModel(name='GitSessionEffect', fields=[
        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
        ('request_id', models.CharField(max_length=200)),
        ('request_digest', models.CharField(max_length=64)),
        ('state', models.CharField(default='INTENT', max_length=24)),
        ('receipt', models.JSONField(default=dict)),
        ('created', models.DateTimeField(auto_now_add=True)),
        ('updated', models.DateTimeField(auto_now=True)),
        ('run', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='git_effects', to='cab_core.run')),
        ('git_index', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='effects', to='cab_core.gitsessionindex')),
    ], options={'db_table':'git_session_effects','constraints':[models.UniqueConstraint(fields=('run','request_id'),name='git_session_effect_unique')]})]
