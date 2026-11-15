from django.urls import path,re_path
from .core.api import api
from .web_views import frontend,sync_sessions,sync_project,sync_connectors,sync_agents,sync_agent_users
urlpatterns=[path('api/v1/sync/agent-users',sync_agent_users),path('api/v1/sync/agents',sync_agents),path('api/v1/sync/connectors',sync_connectors),path('api/v1/sync/sessions',sync_sessions),path('api/v1/sync/project',sync_project),path('api/v1/',api.urls),re_path(r'^(?P<path>.*)$',frontend)]
