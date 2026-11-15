from django.db import migrations


def order_agents(apps,schema_editor):
    agent=apps.get_model('cab_core','Agent')
    agent.objects.filter(pk='codex_desktop').update(position=1)
    agent.objects.filter(pk='codex').update(position=2)


def restore_order(apps,schema_editor):
    agent=apps.get_model('cab_core','Agent')
    agent.objects.filter(pk='codex').update(position=1)
    agent.objects.filter(pk='codex_desktop').update(position=2)


class Migration(migrations.Migration):
    dependencies=[('cab_core','0018_agents_catalogue')]
    operations=[migrations.RunPython(order_agents,restore_order)]
