from django.db import migrations,models


def publish(apps,schema_editor):
    if schema_editor.connection.vendor!='postgresql':return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("SELECT 1 FROM pg_roles WHERE rolname='cab_electric'")
        if cursor.fetchone():cursor.execute('GRANT SELECT ON project_metadata_projection TO cab_electric')
        cursor.execute('ALTER TABLE project_metadata_projection REPLICA IDENTITY FULL')


def unpublish(apps,schema_editor):
    if schema_editor.connection.vendor!='postgresql':return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("SELECT 1 FROM pg_roles WHERE rolname='cab_electric'")
        if cursor.fetchone():cursor.execute('REVOKE SELECT ON project_metadata_projection FROM cab_electric')


class Migration(migrations.Migration):
    dependencies=[('cab_core','0010_session_archives')]
    operations=[migrations.AddField(model_name='project',name='public_metadata',field=models.JSONField(default=dict)),migrations.CreateModel(name='ProjectMetadataProjection',fields=[('id',models.CharField(primary_key=True,max_length=64,serialize=False)),('public_metadata',models.JSONField(default=dict))],options={'db_table':'project_metadata_projection'}),migrations.RunPython(publish,unpublish)]
