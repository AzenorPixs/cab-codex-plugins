from django.db import migrations


def alphabetical(apps,schema_editor):
    agent=apps.get_model('cab_core','Agent')
    for position,key in enumerate(('codex_desktop','codex','opencode')):
        agent.objects.filter(pk=key).update(position=position)


def restore_order(apps,schema_editor):
    agent=apps.get_model('cab_core','Agent')
    for position,key in enumerate(('opencode','codex_desktop','codex')):
        agent.objects.filter(pk=key).update(position=position)


class Migration(migrations.Migration):
    dependencies=[('cab_core','0019_agents_order')]
    operations=[migrations.RunPython(alphabetical,restore_order)]
