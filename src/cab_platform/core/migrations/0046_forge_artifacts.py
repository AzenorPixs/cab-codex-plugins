import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0045_project_artifacts')]
    operations = [
        migrations.CreateModel(
            name='ProjectForgeArtifact',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('forge', models.CharField(max_length=12)),
                ('source', models.JSONField(default=list)),
                ('artifacts', models.JSONField(default=dict)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='cab_core.project')),
            ],
            options={
                'db_table': 'project_forge_artifacts',
                'constraints': [models.UniqueConstraint(fields=('project', 'forge'), name='project_forge_artifact_snapshot')],
            },
        ),
        migrations.CreateModel(
            name='ProjectForgeArtifactPublication',
            fields=[
                ('id', models.CharField(max_length=200, primary_key=True, serialize=False)),
                ('forge', models.CharField(max_length=12)),
                ('state', models.CharField(default='PENDING', max_length=16)),
                ('plan', models.JSONField(default=dict)),
                ('executor', models.JSONField(default=dict)),
                ('receipt', models.JSONField(default=dict)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='cab_core.project')),
            ],
            options={
                'db_table': 'project_forge_artifact_publications',
                'constraints': [models.UniqueConstraint(fields=('project',), condition=models.Q(state__in=['PENDING','RUNNING','UNKNOWN']), name='project_forge_one_active_publication')],
            },
        ),
    ]
