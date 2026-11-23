from django.db import migrations, models
import django.db.models.deletion


def preserve_origins(apps, schema_editor):
    GitChange=apps.get_model('cab_core','GitChange')
    GitSessionIndex=apps.get_model('cab_core','GitSessionIndex')
    GitSessionEffect=apps.get_model('cab_core','GitSessionEffect')
    GitDelivery=apps.get_model('cab_core','GitDelivery')
    for row in GitChange.objects.select_related('initial_run').iterator():
        row.origin={'run_id':row.initial_run.run_id,'session_id':row.initial_run.session_id}
        row.save(update_fields=['origin'])
    for row in GitSessionIndex.objects.select_related('initial_run','session').iterator():
        row.origin={'run_id':row.initial_run.run_id,'session_id':row.session.native_id,'agent':row.session.agent,'uid':row.session.uid}
        row.save(update_fields=['origin'])
    for model in (GitSessionEffect,GitDelivery):
        for row in model.objects.select_related('run').iterator():
            row.origin={'run_id':row.run.run_id,'session_id':row.run.session_id}
            row.save(update_fields=['origin'])


class Migration(migrations.Migration):
    dependencies=[('cab_core','0034_git_delivery_plan')]
    operations=[
        migrations.AddField(model_name='gitchange',name='origin',field=models.JSONField(default=dict,db_default={})),
        migrations.AddField(model_name='gitsessionindex',name='origin',field=models.JSONField(default=dict,db_default={})),
        migrations.AddField(model_name='gitsessioneffect',name='origin',field=models.JSONField(default=dict,db_default={})),
        migrations.AddField(model_name='gitdelivery',name='origin',field=models.JSONField(default=dict,db_default={})),
        migrations.RunPython(preserve_origins,migrations.RunPython.noop),
        migrations.AlterField(model_name='gitchange',name='initial_run',field=models.ForeignKey(null=True,on_delete=django.db.models.deletion.SET_NULL,to='cab_core.run')),
        migrations.AlterField(model_name='gitsessionindex',name='initial_run',field=models.ForeignKey(null=True,on_delete=django.db.models.deletion.SET_NULL,to='cab_core.run')),
        migrations.AlterField(model_name='gitsessionindex',name='session',field=models.ForeignKey(null=True,on_delete=django.db.models.deletion.SET_NULL,related_name='git_indexes',to='cab_core.codingsession')),
        migrations.AlterField(model_name='gitsessioneffect',name='run',field=models.ForeignKey(null=True,on_delete=django.db.models.deletion.SET_NULL,related_name='git_effects',to='cab_core.run')),
        migrations.AlterField(model_name='gitdelivery',name='run',field=models.ForeignKey(null=True,on_delete=django.db.models.deletion.SET_NULL,related_name='git_deliveries',to='cab_core.run')),
        migrations.AlterField(model_name='mcprunbinding',name='run',field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,to='cab_core.run')),
    ]
