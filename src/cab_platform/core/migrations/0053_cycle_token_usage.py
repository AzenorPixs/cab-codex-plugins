from django.db import migrations, models
from django.db.models import deletion


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0052_run_cycle_summary')]
    operations = [
        migrations.CreateModel(
            name='CycleTokenUsage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('native_key', models.CharField(max_length=64)),
                ('observed_at', models.DateTimeField()),
                ('role', models.CharField(choices=[('coder', 'Codeur'), ('orchestrator', 'Orchestrateur')], max_length=12)),
                ('input_tokens', models.PositiveBigIntegerField(null=True)),
                ('output_tokens', models.PositiveBigIntegerField(null=True)),
                ('cache_read_tokens', models.PositiveBigIntegerField(null=True)),
                ('project', models.ForeignKey(on_delete=deletion.CASCADE, to='cab_core.project')),
                ('change', models.ForeignKey(on_delete=deletion.CASCADE, to='cab_core.change')),
                ('session', models.ForeignKey(on_delete=deletion.CASCADE, to='cab_core.codingsession')),
                ('run', models.ForeignKey(on_delete=deletion.CASCADE, to='cab_core.run')),
                ('stage_passage', models.ForeignKey(on_delete=deletion.CASCADE, related_name='+', to='cab_core.changestageiteration')),
                ('action', models.ForeignKey(null=True, on_delete=deletion.SET_NULL, related_name='+', to='cab_core.changestageiteration')),
            ],
            options={
                'db_table': 'cycle_token_usage',
                'constraints': [models.UniqueConstraint(fields=('project', 'native_key'), name='cab_cycle_token_native_event')],
            },
        ),
    ]
