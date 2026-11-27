from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0065_publication_notifications')]

    operations = [
        migrations.CreateModel(
            name='SessionAgent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('coder', 'Codage'), ('orchestrator', 'Orchestrateur')], max_length=12)),
                ('model', models.CharField(max_length=255)),
                ('reasoning', models.CharField(blank=True, max_length=80)),
                ('native_provider', models.CharField(blank=True, max_length=160)),
                ('observed_at', models.DateTimeField()),
                ('token_costs', models.JSONField(db_default={}, default=dict)),
                ('provider', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='cab_core.agentprovider')),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='observed_agents', to='cab_core.codingsession')),
                ('stage_passage', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='observed_agents', to='cab_core.changestageiteration')),
            ],
            options={
                'db_table': 'sessions_agents',
                'constraints': [models.UniqueConstraint(fields=('stage_passage', 'role', 'model', 'reasoning', 'native_provider'), name='cab_session_agent_identity')],
            },
        ),
    ]
