import django.db.models.deletion
from django.db import migrations,models

class Migration(migrations.Migration):
    dependencies=[('cab_core','0012_system_updates')]
    operations=[
        migrations.CreateModel(name='FinalizationPlan',fields=[
            ('id',models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name='ID')),
            ('policy',models.JSONField(default=dict)),('digest',models.CharField(max_length=64,blank=True)),
            ('phase',models.CharField(max_length=24,default='WAITING')),('missing',models.JSONField(default=list)),
            ('receipt',models.JSONField(default=dict)),('updated',models.DateTimeField(auto_now=True)),
            ('run',models.OneToOneField(on_delete=django.db.models.deletion.PROTECT,related_name='finalization_plan',to='cab_core.run')),
        ],options={'db_table':'run_finalization_plans'}),
        migrations.CreateModel(name='EvidenceProducer',fields=[
            ('id',models.CharField(max_length=200,primary_key=True,serialize=False)),('kinds',models.JSONField()),('active',models.BooleanField(default=True)),
            ('actor',models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to='cab_core.actor')),
            ('project',models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to='cab_core.project')),
        ],options={'db_table':'evidence_producers'}),
        migrations.CreateModel(name='RunEvidence',fields=[
            ('id',models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name='ID')),
            ('source',models.CharField(max_length=220)),('evidence_id',models.CharField(max_length=200)),
            ('payload',models.JSONField()),('digest',models.CharField(max_length=64)),('created',models.DateTimeField(auto_now_add=True)),
            ('run',models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name='finalization_evidence',to='cab_core.run')),
        ],options={'db_table':'run_evidence'}),
        migrations.AddConstraint(model_name='runevidence',constraint=models.UniqueConstraint(fields=['run','source','evidence_id'],name='cab_run_evidence_identity')),
    ]
