from django.db import migrations, models
from django.db.models import deletion


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0054_resource_reservations')]
    operations = [
        migrations.CreateModel(
            name='AgentProvider',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False, auto_created=True, verbose_name='ID')),
                ('name', models.CharField(max_length=160, unique=True)),
                ('models_url', models.URLField(max_length=2048, blank=True)),
                ('api_url', models.URLField(max_length=2048)),
                ('refresh_after', models.DateTimeField(null=True, db_index=True)),
                ('refreshed_at', models.DateTimeField(null=True)),
            ],
            options={'db_table': 'agent_providers'},
        ),
        migrations.CreateModel(
            name='AgentApiKey',
            fields=[
                ('id', models.UUIDField(primary_key=True, serialize=False, editable=False)),
                ('ciphertext', models.TextField(editable=False)),
                ('provider', models.ForeignKey(on_delete=deletion.PROTECT, to='cab_core.agentprovider')),
            ],
            options={'db_table': 'agent_api_keys'},
        ),
        migrations.CreateModel(
            name='AgentModel',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False, auto_created=True, verbose_name='ID')),
                ('identifier', models.CharField(max_length=255)),
                ('source', models.JSONField()),
                ('details', models.JSONField()),
                ('provider', models.ForeignKey(on_delete=deletion.CASCADE, related_name='catalog', to='cab_core.agentprovider')),
            ],
            options={
                'db_table': 'agent_models',
                'constraints': [models.UniqueConstraint(fields=('provider', 'identifier'), name='agent_model_identity')],
            },
        ),
    ]
