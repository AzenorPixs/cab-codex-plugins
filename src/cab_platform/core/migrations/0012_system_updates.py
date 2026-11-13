import django.db.models.deletion
from django.db import migrations,models

class Migration(migrations.Migration):
    dependencies=[('cab_core','0011_project_public_metadata')]
    operations=[migrations.CreateModel(name='SystemUpdate',fields=[
        ('request_id',models.CharField(primary_key=True,max_length=200,serialize=False)),
        ('target_version',models.CharField(max_length=100,blank=True)),
        ('state',models.CharField(max_length=24,default='QUEUED')),
        ('active_slot',models.PositiveSmallIntegerField(unique=True,null=True,default=1)),
        ('result',models.JSONField(default=dict)),
        ('created',models.DateTimeField(auto_now_add=True)),('updated',models.DateTimeField(auto_now=True)),
        ('actor',models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to='cab_core.actor')),
    ],options={'db_table':'system_updates'}),migrations.CreateModel(name='UpdateAvailability',fields=[
        ('id',models.PositiveSmallIntegerField(primary_key=True,default=1,serialize=False)),
        ('latest_version',models.CharField(max_length=100,blank=True)),
        ('checked_at',models.DateTimeField(null=True)),('next_check_at',models.DateTimeField(null=True)),('checking_until',models.DateTimeField(null=True)),
        ('requested',models.BooleanField(default=True)),('forced',models.BooleanField(default=False)),('error',models.CharField(max_length=100,blank=True)),
    ],options={'db_table':'update_availability'})]
