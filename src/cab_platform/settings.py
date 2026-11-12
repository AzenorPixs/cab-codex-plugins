import os
from urllib.parse import urlsplit
from .paths import runtime_config as config,secret
cfg=config()
SECRET_KEY=secret('django-secret')
DEBUG=False
ALLOWED_HOSTS=list(dict.fromkeys(['localhost','127.0.0.1','[::1]','testserver',*cfg.get('web_allowed_hosts',[]),*[('['+urlsplit(url).hostname+']') if ':' in urlsplit(url).hostname else urlsplit(url).hostname for url in cfg.get('web_public_urls',[]) if urlsplit(url).hostname]]))
CSRF_TRUSTED_ORIGINS=cfg.get('web_csrf_trusted_origins',[])
ROOT_URLCONF='cab_platform.urls'
INSTALLED_APPS=['django.contrib.auth','django.contrib.contenttypes','django.contrib.sessions','cab_platform.core']
MIDDLEWARE=['cab_platform.core.middleware.PeerMiddleware','django.middleware.security.SecurityMiddleware','django.contrib.sessions.middleware.SessionMiddleware','django.middleware.csrf.CsrfViewMiddleware','django.contrib.auth.middleware.AuthenticationMiddleware']
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE='Strict'
CSRF_COOKIE_SAMESITE='Strict'
SECURE_CONTENT_TYPE_NOSNIFF=True
PASSWORD_HASHERS=['django.contrib.auth.hashers.Argon2PasswordHasher','django.contrib.auth.hashers.PBKDF2PasswordHasher']
USE_TZ=True
TIME_ZONE='UTC'
DEFAULT_AUTO_FIELD='django.db.models.BigAutoField'
DATA_UPLOAD_MAX_MEMORY_SIZE=2*1024*1024
DATABASES={'default':{'ENGINE':'django.db.backends.postgresql','NAME':cfg.get('database','cab'),'USER':cfg.get('migrator_user' if os.environ.get('CAB_MIGRATE')=='1' else 'database_user','cab_app'),'PASSWORD':cfg.get('migrator_password' if os.environ.get('CAB_MIGRATE')=='1' else 'database_password',''),'HOST':cfg.get('database_host','127.0.0.1'),'PORT':cfg.get('database_port',5433),'CONN_MAX_AGE':0,'OPTIONS':{'connect_timeout':5,'application_name':'cab3'}}}
STATIC_URL='/assets/'
# Tous les messages du service suivent le même filtre expurgé, y compris Django.
LOGGING_CONFIG=None
