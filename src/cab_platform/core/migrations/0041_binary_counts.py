from django.db import migrations, models


def seed_counts(apps, schema_editor):
    binaries = apps.get_model('cab_core', 'ObservedBinary').objects.using(schema_editor.connection.alias)
    counts = binaries.aggregate(
        inactive=models.Count('pk', filter=models.Q(active=False)),
        active=models.Count('pk', filter=models.Q(active=True)),
    )
    apps.get_model('cab_core', 'BinaryCounts').objects.using(schema_editor.connection.alias).create(id=1, **counts)


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0040_mcp_disconnect_recovery')]
    operations = [
        migrations.CreateModel(
            name='BinaryCounts',
            fields=[
                ('id', models.PositiveSmallIntegerField(primary_key=True, default=1, serialize=False)),
                ('inactive', models.PositiveIntegerField(default=0)),
                ('active', models.PositiveIntegerField(default=0)),
            ],
            options={'db_table': 'cab_binary_counts'},
        ),
        migrations.RunPython(seed_counts, migrations.RunPython.noop),
    ]
