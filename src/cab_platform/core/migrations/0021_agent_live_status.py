from django.db import migrations,models


class Migration(migrations.Migration):
    dependencies=[('cab_core','0020_agents_alphabetical')]
    operations=[
        migrations.AddField(model_name='agent',name='installed',field=models.BooleanField(null=True,default=None)),
        migrations.AddField(model_name='agent',name='running',field=models.BooleanField(null=True,default=None)),
        migrations.AddField(model_name='agent',name='local_version',field=models.CharField(max_length=100,null=True,blank=True,default=None)),
    ]
