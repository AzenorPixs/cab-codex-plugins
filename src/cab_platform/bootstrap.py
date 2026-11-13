"""Amorçage déclenché exclusivement par le parcours HTTP authentifié."""
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys
from . import __version__
from .paths import CONFIG,STATE,atomic_json,config,private_dir,read_json,secret,runtime_config

class BootstrapError(Exception):pass

def status():
    cfg=runtime_config()
    if not cfg.get('initialized'):return {'state':'UNINITIALIZED','initialized':False,'version':__version__,'port':8790}
    try:
        import psycopg
        with psycopg.connect(dbname=cfg['database'],user=cfg['database_user'],password=cfg['database_password'],host=cfg['database_host'],port=cfg['database_port'],connect_timeout=3) as conn:
            with conn.cursor() as cursor:cursor.execute('SELECT count(*) FROM django_migrations');count=cursor.fetchone()[0]
        import httpx
        try:
            response=httpx.get('http://127.0.0.1:'+str(cfg.get('electric_port',8791))+'/v1/health',timeout=1)
            electric=response.status_code==200
        except httpx.HTTPError:electric=False
        return {'state':'READY' if electric else 'SYNC_UNAVAILABLE','initialized':True,'version':__version__,'migrations':count,'electric':electric,'port':8790}
    except psycopg.Error:return {'state':'DATABASE_UNAVAILABLE','initialized':True,'version':__version__,'port':8790}

def validate_token(token):
    return isinstance(token,str) and hmac.compare_digest(token,secret('bootstrap-token'))

def _psql(port,sql,database='postgres'):
    command=['/usr/sbin/runuser','-u','postgres','--','/usr/bin/psql','-X','-v','ON_ERROR_STOP=1','-h','/var/run/postgresql','-p',str(port),'-d',database,'-Atq']
    p=subprocess.run(command,input=sql,text=True,capture_output=True,timeout=60)
    if p.returncode:raise BootstrapError('postgres-administration-failed')
    return p.stdout.strip()

def initialize(data,token):
    if not validate_token(token):raise BootstrapError('bootstrap-authorization-required')
    import fcntl
    private_dir(STATE);fd=os.open(STATE/'bootstrap.lock',os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600)
    try:
        fcntl.flock(fd,fcntl.LOCK_EX)
        cfg=config()
        if cfg.get('initialized'):return status()
        username=data.get('username','admin');password=data.get('password','')
        if not re.fullmatch(r'[A-Za-z0-9_.-]{1,80}',username):raise BootstrapError('administrator-credentials-invalid')
        import psycopg
        from psycopg import sql
        port=int(data.get('database_port',5433))
        if not 1024<=port<=65535:raise BootstrapError('postgres-port-invalid')
        # Le DSN de qualification est fourni par l’administrateur du processus,
        # jamais par un client Web. Production : cluster local dédié.
        admin_dsn=os.environ.get('CAB_POSTGRES_ADMIN_DSN')
        if admin_dsn:
            admin=psycopg.connect(admin_dsn,autocommit=True,connect_timeout=5)
            info=admin.info;host=info.host;port=info.port
        else:
            rows=subprocess.run(['/usr/bin/pg_lsclusters','--no-header'],text=True,capture_output=True,check=True).stdout.splitlines()
            found=next((line.split() for line in rows if line.split()[:2]==['17','cab']),None)
            if not found:
                p=subprocess.run(['/usr/bin/pg_createcluster','17','cab','--port',str(port),'--start'],text=True,capture_output=True,timeout=120)
                if p.returncode:raise BootstrapError('postgres-cluster-creation-failed')
            else:
                port=int(found[2])
                subprocess.run(['/usr/bin/pg_ctlcluster','17','cab','start'],capture_output=True,timeout=60)
            _psql(port,"ALTER SYSTEM SET wal_level='logical';\n")
            subprocess.run(['/usr/bin/pg_ctlcluster','17','cab','restart'],capture_output=True,check=True,timeout=60)
            admin=_LocalAdmin(port)
            host='127.0.0.1'
        try:
            passwords={name:secrets.token_urlsafe(40) for name in ['cab_migrate','cab_app','cab_electric']}
            with admin.cursor() as cursor:
                cursor.execute("SELECT 1 FROM pg_database WHERE datname='cab'")
                exists=cursor.fetchone()
                if exists and not cfg.get('initializing'):raise BootstrapError('existing-cab-database-requires-reconciliation')
                for role in ['cab_owner','cab_migrate','cab_app','cab_electric']:
                    cursor.execute('SELECT 1 FROM pg_roles WHERE rolname=%s',(role,))
                    if not cursor.fetchone():cursor.execute(sql.SQL('CREATE ROLE {}').format(sql.Identifier(role)))
                for role,password_value in passwords.items():cursor.execute(sql.SQL('ALTER ROLE {} LOGIN PASSWORD {}').format(sql.Identifier(role),sql.Literal(password_value)))
                cursor.execute('GRANT cab_owner TO cab_migrate')
                cursor.execute('ALTER ROLE cab_electric REPLICATION')
                if not exists:cursor.execute('CREATE DATABASE cab OWNER cab_owner')
            cfg.update(initializing=True,database='cab',database_host=host,database_port=port,database_user='cab_app',database_password=passwords['cab_app'],migrator_user='cab_migrate',migrator_password=passwords['cab_migrate'],electric_user='cab_electric',electric_password=passwords['cab_electric'],electric_secret=secrets.token_urlsafe(48),schema_version=1,version=__version__)
            atomic_json(CONFIG,cfg)
            db_admin=psycopg.connect(dbname='cab',user=admin.info.user,password=admin.info.password,host=host,port=port,autocommit=True) if admin_dsn else _LocalAdmin(port,'cab')
            try:
                with db_admin.cursor() as cursor:
                    cursor.execute('GRANT ALL ON SCHEMA public TO cab_migrate')
                    cursor.execute('GRANT USAGE ON SCHEMA public TO cab_app,cab_electric')
                env={**os.environ,'DJANGO_SETTINGS_MODULE':'cab_platform.settings','CAB_MIGRATE':'1'}
                p=subprocess.run([sys.executable,'-m','django','migrate','--noinput'],env=env,text=True,capture_output=True,timeout=120)
                if p.returncode:raise BootstrapError('django-migration-failed')
                with db_admin.cursor() as cursor:
                    cursor.execute('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO cab_app')
                    cursor.execute('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO cab_app')
                    cursor.execute('ALTER DEFAULT PRIVILEGES FOR ROLE cab_migrate IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO cab_app')
                    cursor.execute('ALTER DEFAULT PRIVILEGES FOR ROLE cab_migrate IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO cab_app')
                    cursor.execute('GRANT SELECT ON cab_core_sessionprojection TO cab_electric')
                    cursor.execute('GRANT SELECT ON project_metadata_projection TO cab_electric')
                    cursor.execute('GRANT SELECT ON mcp_connector_projection TO cab_electric')
                    cursor.execute('ALTER TABLE mcp_connector_projection REPLICA IDENTITY FULL')
                    cursor.execute('REVOKE cab_migrate FROM cab_electric')
                    cursor.execute('ALTER TABLE cab_core_sessionprojection REPLICA IDENTITY FULL')
                    cursor.execute("SELECT 1 FROM pg_publication WHERE pubname='electric_publication_default'")
                    if not cursor.fetchone():cursor.execute('CREATE PUBLICATION electric_publication_default FOR TABLE cab_core_sessionprojection')
                    cursor.execute("SELECT 1 FROM pg_publication_tables WHERE pubname='electric_publication_default' AND tablename='project_metadata_projection'")
                    if not cursor.fetchone():cursor.execute('ALTER PUBLICATION electric_publication_default ADD TABLE project_metadata_projection')
                    cursor.execute('GRANT CREATE ON DATABASE cab TO cab_electric')
                    cursor.execute("SELECT 1 FROM pg_publication_tables WHERE pubname='electric_publication_default' AND tablename='mcp_connector_projection'")
                    if not cursor.fetchone():cursor.execute('ALTER PUBLICATION electric_publication_default ADD TABLE mcp_connector_projection')
                    cursor.execute('ALTER PUBLICATION electric_publication_default OWNER TO cab_electric')
                    cursor.execute('REVOKE CREATE ON DATABASE cab FROM cab_electric')
            finally:db_admin.close()
            # L’API du processus courant reconnecte le nouveau compte après migration.
            from django.conf import settings
            from django.db import connections
            settings.DATABASES['default'].update(NAME='cab',USER='cab_app',PASSWORD=passwords['cab_app'],HOST=host,PORT=port)
            connections.close_all();connections['default'].settings_dict.update(settings.DATABASES['default'])
            from django.contrib.auth import get_user_model
            user,created=get_user_model().objects.get_or_create(username=username,defaults={'is_staff':True,'is_superuser':True})
            if not created and not user.is_superuser:raise BootstrapError('administrator-identity-conflict')
            user.set_password(password);user.save()
            if cfg.get('legacy_manifest'):
                from .migration import import_manifest
                import_manifest(Path(cfg['legacy_manifest']))
            from .integration import initialize_profiles
            initialize_profiles(cfg.get('integrations',[]))
            cfg.update(initialized=True,initializing=False);atomic_json(CONFIG,cfg)
            return status()
        finally:admin.close()
    finally:os.close(fd)

class _LocalAdmin:
    """Administration SQL via identitéOSpostgres, sans modifier son mot de passe."""
    def __init__(self,port,database='postgres'):self.port=port;self.database=database;self.last=''
    def cursor(self):return self
    def __enter__(self):return self
    def __exit__(self,*args):pass
    def execute(self,query,params=None):
        from psycopg import sql
        if params:
            pieces=str(query).split('%s')
            if len(pieces)!=len(params)+1:raise BootstrapError('admin-query-invalid')
            query=sql.SQL('{}').format(sql.SQL(pieces[0]))
            for i,value in enumerate(params):query+=sql.Literal(value)+sql.SQL(pieces[i+1])
        self.last=_psql(self.port,query.as_string() if hasattr(query,'as_string') else query,self.database)
    def fetchone(self):return (self.last,) if self.last else None
    def close(self):pass
