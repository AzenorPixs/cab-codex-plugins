from django.db import migrations, models


def project_cycle_profile(apps, schema_editor):
    Run = apps.get_model('cab_core','Run')
    Projection = apps.get_model('cab_core','SessionProjection')
    db = schema_editor.connection.alias
    value = 'publication-12-v1'
    runs = Run.objects.using(db).filter(configuration__cycle_profile=value).values('pk')
    Projection.objects.using(db).filter(binding_id__in=runs).update(cycle_profile=value)


class Migration(migrations.Migration):
    dependencies = [('cab_core','0049_publication_stage_activity')]
    operations = [
        migrations.AddField(model_name='sessionprojection',name='cycle_profile',
                            field=models.CharField(max_length=32,blank=True,default='',db_default='')),
        migrations.RunPython(project_cycle_profile,migrations.RunPython.noop),
    ]
