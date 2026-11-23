from django.db import migrations, models
from django.db.models.functions import Lower


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0055_agent_catalog')]
    operations = [
        migrations.CreateModel(
            name='AgentModelPolicy',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120)),
                ('include_free', models.BooleanField(default=True)),
                ('include_paid', models.BooleanField(default=True)),
                ('context_min', models.PositiveIntegerField(default=0)),
                ('output_min', models.PositiveIntegerField(default=0)),
                ('input_price_min', models.DecimalField(max_digits=24, decimal_places=12, default=0)),
                ('input_price_max', models.DecimalField(max_digits=24, decimal_places=12, default=0)),
                ('output_price_min', models.DecimalField(max_digits=24, decimal_places=12, default=0)),
                ('output_price_max', models.DecimalField(max_digits=24, decimal_places=12, default=0)),
                ('cache_read_max', models.DecimalField(max_digits=24, decimal_places=12, default=0)),
                ('cache_write_min', models.DecimalField(max_digits=24, decimal_places=12, default=0)),
            ],
            options={
                'db_table': 'agent_model_policies',
                'constraints': [models.UniqueConstraint(Lower('name'), name='agent_model_policy_name')],
            },
        ),
    ]
