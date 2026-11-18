from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0031_session_git_effects')]
    operations = [migrations.CreateModel(name='McpRunBinding', fields=[
        ('connector', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True, related_name='run_binding', serialize=False, to='cab_core.mcpconnector')),
        ('bound_at', models.DateTimeField(auto_now=True)),
        ('run', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='cab_core.run')),
    ], options={'db_table':'mcp_run_bindings'})]
