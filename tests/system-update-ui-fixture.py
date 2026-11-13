"""Banc Web : GitHub lent simulé, admission réelle, aucun installateur exécuté."""
import io
import json
import os
from pathlib import Path
import time
assert Path('/.dockerenv').exists() and os.environ.get('CAB_TEST_FIXTURE')=='1'
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()
from cab_platform import update_availability,system_updates
from cab_platform.core.models import UpdateAvailability,SystemUpdate
UpdateAvailability.objects.all().delete();SystemUpdate.objects.all().delete()
counter=Path('/tmp/cab-fixture-github-checks');counter.write_text('0')
def github(*args,**kwargs):
    counter.write_text(str(int(counter.read_text())+1));time.sleep(5)
    return io.BytesIO(json.dumps({'tag_name':'v3.2.2','draft':False,'prerelease':False}).encode())
update_availability.urlopen=github
# Le test navigateur valide seulement l'admission et la navigation ; le test
# d'installation réelle utilise l'unité système sur la version publiée.
system_updates.dispatch=lambda:None
from cab_platform.service import run
run()
