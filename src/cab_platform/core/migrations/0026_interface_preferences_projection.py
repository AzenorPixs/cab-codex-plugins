from django.db import migrations,models


def initialize(apps,schema_editor):
    configuration=apps.get_model('cab_core','Configuration')
    projection=apps.get_model('cab_core','InterfacePreferencesProjection')
    record=configuration.objects.using(schema_editor.connection.alias).filter(pk='interface').first()
    raw=record.value if record and isinstance(record.value,dict) else {}
    value={key:raw[key] for key in ('font_scale','theme','responsive') if key in raw}
    value.setdefault('font_scale',100);value.setdefault('theme','light')
    projection.objects.using(schema_editor.connection.alias).update_or_create(pk=1,defaults={'preferences':value})


class Migration(migrations.Migration):
    dependencies=[('cab_core','0025_cab_version_projection')]
    operations=[
        migrations.CreateModel(name='InterfacePreferencesProjection',fields=[
            ('id',models.PositiveSmallIntegerField(default=1,primary_key=True,serialize=False)),
            ('preferences',models.JSONField(default=dict)),
        ],options={'db_table':'interface_preferences_projection'}),
        migrations.RunPython(initialize,migrations.RunPython.noop),
    ]
