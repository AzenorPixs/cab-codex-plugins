import django.db.models.deletion
from django.db import migrations,models


class Migration(migrations.Migration):
    dependencies=[('cab_core','0009_local_statistics_service')]
    operations=[
        migrations.AddField(model_name='sessionprojection',name='suspension',field=models.CharField(max_length=32,blank=True,default=''),preserve_default=False),
        migrations.AddField(model_name='sessionprojection',name='archived',field=models.BooleanField(default=False)),
        migrations.CreateModel(name='SessionArchive',fields=[
            ('id',models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name='ID')),
            ('request_id',models.CharField(max_length=200)),
            ('evidence',models.JSONField()),
            ('created',models.DateTimeField(auto_now_add=True)),
            ('actor',models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to='cab_core.actor')),
            ('run',models.OneToOneField(on_delete=django.db.models.deletion.PROTECT,related_name='session_archive',to='cab_core.run')),
        ],options={'db_table':'session_archives'}),
    ]
