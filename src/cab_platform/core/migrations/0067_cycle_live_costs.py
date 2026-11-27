from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0066_session_agents')]

    operations = [
        migrations.AddField(
            model_name='codingsession', name='token_costs',
            field=models.JSONField(default=dict, db_default={}),
        ),
        migrations.AddField(
            model_name='sessionagent', name='ended_at', field=models.DateTimeField(null=True),
        ),
        migrations.RemoveConstraint(model_name='sessionagent', name='cab_session_agent_identity'),
        migrations.AddConstraint(
            model_name='sessionagent',
            constraint=models.UniqueConstraint(
                fields=('stage_passage', 'role', 'model', 'reasoning', 'native_provider', 'observed_at'),
                name='cab_session_agent_segment',
            ),
        ),
    ]
