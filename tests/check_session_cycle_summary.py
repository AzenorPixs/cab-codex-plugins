"""Qualification réelle sur PostgreSQL 17 éphémère, sans accès à la base CAB."""
import os
from pathlib import Path
import socket
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'src'),str(ROOT/'tests'),'/usr/lib/cab/python-vendor']
os.environ['PSYCOPG_IMPL']='python'
PG=Path('/usr/lib/postgresql/17/bin')
os.environ['CAB_EFFECTS_FIXTURE']='1'


def main():
    scratch=Path(os.environ.get('TMPDIR',str(ROOT/'.cab-tests')))
    scratch.mkdir(exist_ok=True)
    with TemporaryDirectory(prefix='cycle-summary-',dir=scratch) as folder:
        base=Path(folder)
        with socket.socket() as listener:
            listener.bind(('127.0.0.1',0))
            port=listener.getsockname()[1]
        data=base/'pg'
        subprocess.run([str(PG/'initdb'),'-D',str(data),'-A','trust','--no-locale','--encoding=UTF8'],check=True,stdout=subprocess.DEVNULL)
        subprocess.run([str(PG/'pg_ctl'),'-D',str(data),'-l',str(base/'postgres.log'),'-o',f'-h 127.0.0.1 -p {port} -k {base}', '-w','start'],check=True,stdout=subprocess.DEVNULL)
        try:
            database_name='cab_effects_fixture_cycles'
            subprocess.run([str(PG/'createdb'),'-h','127.0.0.1','-p',str(port),database_name],check=True)
            import py_compile
            for name in ('src/cab_platform/change_stage_metrics.py','src/cab_platform/time_projection.py','src/cab_platform/web_views.py','src/cab_platform/core/api.py','src/cab_platform/core/models.py','src/cab_platform/core/migrations/0052_run_cycle_summary.py','src/cab_platform/core/migrations/0053_cycle_token_usage.py','src/cab_platform/core/migrations/0061_cycle_cache_write_tokens.py','src/cab_platform/collectors.py','src/cab_platform/cycle_tokens.py','src/cab_platform/measurement_sources.py','src/cab_platform/stage_actions.py','src/cab_platform/mcp.py','tests/test_cycle_tokens.py','tests/test_stage_actions.py','tests/test_session_cycle_summary.py', 'tests/check_session_cycle_summary.py'):
                py_compile.compile(str(ROOT/name),cfile=str(base/(Path(name).name+'c')),doraise=True)
            from django.conf import settings
            settings.configure(SECRET_KEY='isolated-fixture',USE_TZ=True,
                INSTALLED_APPS=['django.contrib.auth','django.contrib.contenttypes','django.contrib.sessions','cab_platform.core'],
                DATABASES={'default':{'ENGINE':'django.db.backends.postgresql','NAME':database_name,'HOST':'127.0.0.1','PORT':port}},
                DEFAULT_AUTO_FIELD='django.db.models.BigAutoField')
            import django
            django.setup()
            from django.core.management import call_command
            call_command('migrate',verbosity=0)
            from django.db import connection
            from django.db.migrations.executor import MigrationExecutor
            from cab_platform.core.models import CycleTokenUsage, Run
            state=MigrationExecutor(connection).loader.project_state()
            assert state.apps.get_model('cab_core','Run')._meta.get_field('cycle_summary').deconstruct()[1:] == Run._meta.get_field('cycle_summary').deconstruct()[1:]
            token_state=state.apps.get_model('cab_core','CycleTokenUsage')
            assert {field.name: field.deconstruct()[1:] for field in token_state._meta.fields} == {
                field.name: field.deconstruct()[1:] for field in CycleTokenUsage._meta.fields}
            suite=unittest.TestSuite(unittest.defaultTestLoader.loadTestsFromName(module) for module in (
                'test_session_cycle_summary','test_time_projection','test_publication_cycle','test_stage_protocol','test_stage_work_time','test_cycle_attribution','test_cycle_tokens','test_stage_actions','test_measurement_sources'))
            result=unittest.TextTestRunner(verbosity=2).run(suite)
            return result.wasSuccessful() and not result.skipped
        finally:
            from django.db import connections
            connections.close_all()
            subprocess.run([str(PG/'pg_ctl'),'-D',str(data),'-m','fast','-w','stop'],check=True,stdout=subprocess.DEVNULL)


if __name__=='__main__':
    sys.exit(0 if main() else 1)
