from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0032_mcp_run_binding')]
    operations = [
        migrations.CreateModel(name='GitDelivery', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('version', models.CharField(max_length=64)),
            ('state', models.CharField(default='PENDING', max_length=24)),
            ('executor', models.JSONField(default=dict)),
            ('commit_oid', models.CharField(blank=True, max_length=64)),
            ('tag_oid', models.CharField(blank=True, max_length=64)),
            ('created', models.DateTimeField(auto_now_add=True)),
            ('updated', models.DateTimeField(auto_now=True)),
            ('project', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='git_deliveries', to='cab_core.project')),
            ('run', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='git_deliveries', to='cab_core.run')),
            ('git_index', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='cab_core.gitsessionindex')),
        ], options={'db_table':'git_deliveries','constraints':[
            models.UniqueConstraint(fields=('run','version'),name='git_delivery_run_version_unique'),
            models.UniqueConstraint(condition=models.Q(state__in=['PENDING','RUNNING','UNKNOWN','PARTIAL']),fields=('project',),name='git_delivery_active_project_unique')]}),
        migrations.CreateModel(name='GitDeliveryStep', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('key', models.CharField(max_length=100)),
            ('state', models.CharField(default='PENDING', max_length=24)),
            ('receipt', models.JSONField(default=dict)),
            ('created', models.DateTimeField(auto_now_add=True)),
            ('updated', models.DateTimeField(auto_now=True)),
            ('delivery', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='steps', to='cab_core.gitdelivery')),
        ], options={'db_table':'git_delivery_steps','constraints':[models.UniqueConstraint(fields=('delivery','key'),name='git_delivery_step_unique')]}),
    ]
