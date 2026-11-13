"""Recette réelle du service en fixture : aucune édition d’un projet de production."""
import json
import os
from pathlib import Path
import tempfile
import time
assert os.environ.get('CAB_TEST_FIXTURE')=='1'
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
import django
django.setup()
from cab_platform.client import Client,ClientError
from cab_platform.core.models import Change,StatisticsDocument,ProjectStatistics,Run

c=Client()
def wait(check,label):
    deadline=time.monotonic()+55
    while time.monotonic()<deadline:
        try:
            if check():return
        except (ClientError,FileNotFoundError):pass
        time.sleep(.2)
    raise RuntimeError('statistics-fixture-timeout:'+label)
wait(lambda:c.get('health')['state']=='READY','ready')
root=Path(tempfile.mkdtemp(prefix='cab-statistics-service-'));base=root/'openspec/changes';uncoded=base/'uncoded';legacy=base/'archive/2026-11-13-legacy';uncoded.mkdir(parents=True);legacy.mkdir(parents=True)
(uncoded/'tasks.md').write_text('- [ ] 1. Pas encore codé\n');(legacy/'tasks.md').write_text('- [x] 1. Vérifié\n')
report=legacy/'STATISTICS.md';report.write_text('# Historique manuel\n\n| Mesure | Valeur |\n| --- | --- |\n| Tokens d’entrée | 125 |\n')
project=c.command('project.register',{'root':str(root)})['project_id']
wait(lambda:ProjectStatistics.objects.filter(project_id=project,inventory_complete=True).exists() and (root/'STATISTICS.md').exists(),'initial-auto-global')
assert Change.objects.filter(project_id=project).count()==2;assert not (uncoded/'STATISTICS.md').exists()
report.write_text(report.read_text().replace('125','275'))
wait(lambda:StatisticsDocument.objects.filter(source__change__project_id=project,source__change__identifier='legacy',metrics__key='tokens_input',metrics__value='275').exists(),'inotify-file-to-pg')
row=StatisticsDocument.objects.get(source__change__project_id=project,source__change__identifier='legacy');assert row.revisions.count()>=2
working=base/'working';working.mkdir();(working/'tasks.md').write_text('- [x] 1. Travail observé\n');(root/'source').write_text('fixture')
c.command('run.begin',{'project_id':project,'run_id':'AUTO','session_id':'SID-AUTO','mode':'direct','change':'working','paths':['source'],'criteria':['fixture'],'decisions_resolved':True,'resources':[]})
wait(lambda:(working/'STATISTICS.md').exists(),'active-auto-report')
source_id=StatisticsDocument.objects.get(source__change__project_id=project,source__change__identifier='working').source_id
archived=base/'archive/2026-11-13-working';working.rename(archived)
wait(lambda:'état local : `archived`' in (archived/'STATISTICS.md').read_text(),'archive-auto-amend')
assert StatisticsDocument.objects.get(source__change__project_id=project,source__change__identifier='working').source_id==source_id
assert not (root/'.STATISTICS.lock').exists();assert not (root/'STATISTICS_CONTRIBUTIONS.json').exists()
state=ProjectStatistics.objects.get(project_id=project);assert 43200<=(state.next_full_sync-state.last_full_sync).total_seconds()<=86400
wait(lambda:c.command('statistics.project',{'project_id':project})['global_in_sync'],'global-file-pg-hash')
view=c.command('statistics.project',{'project_id':project});assert view['actual_global_marker']['valid'];assert view['global_sources_current']
document=c.command('statistics.change',{'project_id':project,'change':'working'})['sources'][0];assert document['in_sync'] and document['actual_marker']['valid']
# Précondition de clôture isolée : la politique de revue est qualifiée ailleurs.
Run.objects.filter(project_id=project,run_id='AUTO').update(state='ACCEPTED')
closure={'project_id':project,'run_id':'AUTO','branch':'TERMINÉ','receipt_id':'AUTO-CLOSE'}
result=c.command('run.close',closure);assert result['report'].endswith('/STATISTICS.md');assert result==c.command('run.close',closure)
proof={'version':c.get('health')['version'],'automatic_catalogue':True,'unstarted_without_report':True,'automatic_global_created':True,'manual_file_to_pg_inotify':True,'statistics_history_preserved':True,'active_report_service_generated':True,'archive_report_service_amended':True,'source_identity_preserved_on_archive':True,'daily_random_12_24h_persisted':True,'no_file_lock_or_global_register':True,'markers_and_full_hash_verified':True,'closure_report_service_owned':True,'closure_idempotent':True}
print(json.dumps(proof))
