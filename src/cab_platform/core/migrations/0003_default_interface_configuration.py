from django.db import migrations


def default_interface(apps,schema_editor):
    Configuration=apps.get_model('cab_core','Configuration')
    Configuration.objects.using(schema_editor.connection.alias).get_or_create(
        key='interface',defaults={'value':{'font_scale':100,'theme':'light'}}
    )


class Migration(migrations.Migration):
    dependencies=[('cab_core','0002_interface_configuration')]
    operations=[migrations.RunPython(default_interface,migrations.RunPython.noop)]
