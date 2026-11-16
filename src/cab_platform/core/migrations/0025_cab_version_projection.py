from django.db import migrations,models

class Migration(migrations.Migration):
    dependencies=[('cab_core','0024_agent_user_config')]
    operations=[migrations.CreateModel(name='CabVersionProjection',fields=[
        ('id',models.PositiveSmallIntegerField(default=1,primary_key=True,serialize=False)),
        ('version',models.CharField(max_length=100)),
    ],options={'db_table':'cab_version_projection'})]
