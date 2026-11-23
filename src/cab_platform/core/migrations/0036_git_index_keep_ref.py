from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('cab_core','0035_git_session_retention')]
    operations = [
        migrations.AddField(model_name='gitsessionindex',name='keep_ref',field=models.CharField(blank=True,default='',db_default='',max_length=200)),
        migrations.AddField(model_name='gitsessionindex',name='keep_oid',field=models.CharField(blank=True,default='',db_default='',max_length=64)),
    ]
