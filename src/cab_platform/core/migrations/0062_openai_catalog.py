from django.db import migrations
from django.db.models import Q
from django.utils import timezone


def add_openai(apps, schema_editor):
    providers = apps.get_model('cab_core', 'AgentProvider').objects.using(schema_editor.connection.alias)
    api_url = 'https://api.openai.com/v1'
    models_url = api_url + '/models'
    if providers.filter(Q(name__iexact='OpenAI') | Q(models_url=models_url)).exists():
        return
    provider = providers.create(name='OpenAI', api_url=api_url, models_url=models_url)
    sources = apps.get_model('cab_core', 'AgentCatalogFile').objects.using(schema_editor.connection.alias)
    sources.create(id='provider-'+str(provider.pk), provider_id=provider.pk,
                   url=models_url, state='queued', refresh_after=timezone.now())


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0061_cycle_cache_write_tokens')]
    operations = [migrations.RunPython(add_openai, migrations.RunPython.noop)]
