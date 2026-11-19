from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0038_notifications')]
    operations = [migrations.AlterModelTable(name='incident', table='ccab')]
