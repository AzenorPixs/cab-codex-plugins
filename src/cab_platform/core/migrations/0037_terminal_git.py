from django.db import migrations,models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies=[('cab_core','0036_git_index_keep_ref')]
    operations=[migrations.CreateModel(name='TerminalGitCommit',fields=[
        ('id',models.BigAutoField(primary_key=True,serialize=False,auto_created=True,verbose_name='ID')),
        ('origin',models.JSONField(default=dict)),
        ('branch',models.CharField(max_length=16)),
        ('state',models.CharField(max_length=24,default='INTENT')),
        ('executor',models.JSONField(default=dict)),
        ('index_path',models.CharField(max_length=1500,blank=True)),
        ('base_head',models.CharField(max_length=64,blank=True)),
        ('commit_oid',models.CharField(max_length=64,blank=True)),
        ('snapshot',models.JSONField(default=dict)),
        ('remote_plan',models.JSONField(default=list)),
        ('receipt',models.JSONField(default=dict)),
        ('created',models.DateTimeField(auto_now_add=True)),
        ('updated',models.DateTimeField(auto_now=True)),
        ('run',models.OneToOneField(null=True,on_delete=django.db.models.deletion.SET_NULL,related_name='terminal_git',to='cab_core.run')),
        ('project',models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to='cab_core.project')),
    ],options={'db_table':'terminal_git_commits'})]
