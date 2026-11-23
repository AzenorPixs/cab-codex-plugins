from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0057_model_policy_controls')]
    operations = [
        migrations.AddField(
            model_name='agentmodelpolicy',
            name='sort_column',
            field=models.CharField(
                choices=[
                    ('input_cost', 'Coût entrée / M'),
                    ('output_cost', 'Coût sortie / M'),
                    ('cache_read_cost', 'Lecture cache / M'),
                    ('cache_write_cost', 'Écriture cache / M'),
                ],
                default='input_cost',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='agentmodelpolicy',
            name='sort_descending',
            field=models.BooleanField(default=False),
        ),
    ]
