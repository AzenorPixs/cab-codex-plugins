from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0029_forge_versions')]
    operations = [
        migrations.CreateModel(name='GitChange', fields=[
            ('change', models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, primary_key=True, related_name='git_snapshot', serialize=False, to='cab_core.change')),
            ('baseline', models.JSONField(default=dict)),
            ('captured_at', models.DateTimeField()),
            ('initial_run', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='cab_core.run')),
            ('project', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='cab_core.project')),
        ], options={'db_table': 'git_changes'}),
        migrations.CreateModel(name='GitSessionIndex', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('base_head', models.CharField(blank=True, max_length=64)),
            ('index_path', models.CharField(max_length=1500)),
            ('state', models.CharField(default='OPEN', max_length=24)),
            ('created', models.DateTimeField(auto_now_add=True)),
            ('updated', models.DateTimeField(auto_now=True)),
            ('change', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='git_indexes', to='cab_core.change')),
            ('session', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='git_indexes', to='cab_core.codingsession')),
            ('initial_run', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='cab_core.run')),
        ], options={'db_table':'git_session_indexes','constraints':[models.UniqueConstraint(fields=('change','session'),name='git_session_change_unique')]}),
        migrations.CreateModel(name='GitFileReservation', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('path', models.CharField(max_length=1500)),
            ('path_digest', models.CharField(max_length=64)),
            ('active', models.BooleanField(default=True)),
            ('created', models.DateTimeField(auto_now_add=True)),
            ('released', models.DateTimeField(null=True)),
            ('project', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='cab_core.project')),
            ('git_index', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='reservations', to='cab_core.gitsessionindex')),
        ], options={'db_table':'git_file_reservations','constraints':[models.UniqueConstraint(condition=models.Q(active=True),fields=('project','path_digest'),name='git_file_active_unique')]}),
    ]
