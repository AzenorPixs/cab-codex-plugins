from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('cab_core','0050_session_cycle_projection')]
    operations = [
        migrations.AddField(model_name='runcycleiteration',name='time_projection',
                            field=models.JSONField(default=dict,db_default={})),
        migrations.AddField(model_name='changestageiteration',name='time_projection',
                            field=models.JSONField(default=dict,db_default={})),
    ]
