from django.db import migrations,models


def populate(apps,schema_editor):
    agent=apps.get_model('cab_core','Agent')
    for position,(key,label) in enumerate((('opencode','OpenCode'),('codex','Codex CLI'),('codex_desktop','Codex'))):
        agent.objects.get_or_create(pk=key,defaults={'label':label,'position':position})


class Migration(migrations.Migration):
    dependencies=[('cab_core','0017_native_mcp_reloads')]
    operations=[migrations.CreateModel(name='Agent',fields=[
        ('id',models.CharField(primary_key=True,max_length=40,serialize=False)),
        ('label',models.CharField(max_length=100)),
        ('position',models.PositiveSmallIntegerField()),
    ],options={'db_table':'agents'}),migrations.RunPython(populate,migrations.RunPython.noop)]
