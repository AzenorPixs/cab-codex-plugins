from django.urls import path,re_path
from .core.api import api
from .web_views import frontend,sync_sessions,sync_project,sync_connectors,sync_agents,sync_agent_users,sync_cab_version,sync_interface_preferences
urlpatterns=[path('api/v1/sync/interface-preferences',sync_interface_preferences),path('api/v1/sync/cab-version',sync_cab_version),path('api/v1/sync/agent-users',sync_agent_users),path('api/v1/sync/agents',sync_agents),path('api/v1/sync/connectors',sync_connectors),path('api/v1/sync/sessions',sync_sessions),path('api/v1/sync/project',sync_project),path('api/v1/',api.urls),re_path(r'^(?P<path>.*)$',frontend)]
