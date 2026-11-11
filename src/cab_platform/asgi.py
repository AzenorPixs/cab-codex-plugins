import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','cab_platform.settings')
from django.core.asgi import get_asgi_application
application=get_asgi_application()
