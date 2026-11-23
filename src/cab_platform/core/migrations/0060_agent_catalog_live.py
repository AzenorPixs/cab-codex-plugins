from django.db import migrations, models
from django.db.models import deletion


PROJECTION = """
ALTER TABLE agent_catalog_projection REPLICA IDENTITY FULL;

CREATE FUNCTION cab_agent_catalog_provider(item agent_providers) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
SELECT jsonb_build_object('id', item.id, 'name', item.name, 'api_url', item.api_url, 'models_url', item.models_url)
$$;

CREATE FUNCTION cab_agent_catalog_key(item agent_api_keys) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
SELECT jsonb_build_object('id', item.id, 'provider_id', item.provider_id,
                          'day', NULL, 'week', NULL, 'month', NULL, 'credits', NULL)
$$;

CREATE FUNCTION cab_agent_catalog_model(item agent_models) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
SELECT COALESCE(item.details->'summary', '{}'::jsonb)
       || jsonb_build_object('id', item.id, 'provider_id', item.provider_id, 'identifier', item.identifier)
$$;

CREATE FUNCTION cab_agent_catalog_file(item agent_catalog_files) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
SELECT jsonb_build_object('id', item.id, 'provider_id', item.provider_id, 'url', item.url,
                          'valid', item.valid, 'adjusting', item.adjusting, 'state', item.state, 'error', item.error, 'refreshed_at', item.refreshed_at)
$$;

CREATE FUNCTION cab_project_agent_catalog() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    row_key text;
    row_data jsonb;
    row_kind text := TG_ARGV[0];
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM agent_catalog_projection WHERE id = row_kind || ':' || OLD.id;
        RETURN OLD;
    END IF;
    row_key := row_kind || ':' || NEW.id;
    CASE row_kind
        WHEN 'provider' THEN row_data := cab_agent_catalog_provider(NEW);
        WHEN 'key' THEN row_data := cab_agent_catalog_key(NEW);
        WHEN 'model' THEN row_data := cab_agent_catalog_model(NEW);
        WHEN 'file' THEN row_data := cab_agent_catalog_file(NEW);
        WHEN 'policy' THEN row_data := to_jsonb(NEW);
    END CASE;
    INSERT INTO agent_catalog_projection (id, kind, data) VALUES (row_key, row_kind, row_data)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
        WHERE agent_catalog_projection.data IS DISTINCT FROM EXCLUDED.data;
    RETURN NEW;
END;
$$;

INSERT INTO agent_catalog_projection(id, kind, data)
    SELECT 'provider:' || id, 'provider', cab_agent_catalog_provider(p) FROM agent_providers p
    UNION ALL SELECT 'key:' || id, 'key', cab_agent_catalog_key(k) FROM agent_api_keys k
    UNION ALL SELECT 'model:' || id, 'model', cab_agent_catalog_model(m) FROM agent_models m
    UNION ALL SELECT 'policy:' || id, 'policy', to_jsonb(p) FROM agent_model_policies p;

CREATE TRIGGER cab_catalog_providers AFTER INSERT OR UPDATE OR DELETE ON agent_providers
    FOR EACH ROW EXECUTE FUNCTION cab_project_agent_catalog('provider');
CREATE TRIGGER cab_catalog_keys AFTER INSERT OR UPDATE OR DELETE ON agent_api_keys
    FOR EACH ROW EXECUTE FUNCTION cab_project_agent_catalog('key');
CREATE TRIGGER cab_catalog_models AFTER INSERT OR UPDATE OR DELETE ON agent_models
    FOR EACH ROW EXECUTE FUNCTION cab_project_agent_catalog('model');
CREATE TRIGGER cab_catalog_policies AFTER INSERT OR UPDATE OR DELETE ON agent_model_policies
    FOR EACH ROW EXECUTE FUNCTION cab_project_agent_catalog('policy');
CREATE TRIGGER cab_catalog_files AFTER INSERT OR UPDATE OR DELETE ON agent_catalog_files
    FOR EACH ROW EXECUTE FUNCTION cab_project_agent_catalog('file');

INSERT INTO agent_catalog_files (id, provider_id, url, sha256, valid, adjusting, state, error, refresh_after, generation, scan_requested)
VALUES ('completion', NULL, 'https://models.dev/api.json', '', false, false, 'queued', '', CURRENT_TIMESTAMP, 1, true);
INSERT INTO agent_catalog_files (id, provider_id, url, sha256, valid, adjusting, state, error, refresh_after, generation, scan_requested)
SELECT 'provider-' || id, id, models_url, '', false, false,
       CASE WHEN models_url = '' THEN 'idle' ELSE 'queued' END, '',
       CASE WHEN models_url = '' THEN NULL ELSE CURRENT_TIMESTAMP END, 1, false
FROM agent_providers;
"""

REVERSE = """
DROP TRIGGER cab_catalog_providers ON agent_providers;
DROP TRIGGER cab_catalog_keys ON agent_api_keys;
DROP TRIGGER cab_catalog_models ON agent_models;
DROP TRIGGER cab_catalog_policies ON agent_model_policies;
DROP TRIGGER cab_catalog_files ON agent_catalog_files;
DROP FUNCTION cab_project_agent_catalog();
DROP FUNCTION cab_agent_catalog_provider(agent_providers);
DROP FUNCTION cab_agent_catalog_key(agent_api_keys);
DROP FUNCTION cab_agent_catalog_model(agent_models);
DROP FUNCTION cab_agent_catalog_file(agent_catalog_files);
"""


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0059_model_policy_providers')]
    operations = [
        migrations.CreateModel(
            name='AgentCatalogFile',
            fields=[
                ('id', models.CharField(max_length=40, primary_key=True, serialize=False)),
                ('url', models.URLField(max_length=2048, blank=True)),
                ('sha256', models.CharField(max_length=64, blank=True, default='')),
                ('valid', models.BooleanField(default=False)),
                ('adjusting', models.BooleanField(default=False)),
                ('state', models.CharField(max_length=16, default='idle')),
                ('error', models.CharField(max_length=80, blank=True, default='')),
                ('refreshed_at', models.DateTimeField(null=True)),
                ('refresh_after', models.DateTimeField(null=True)),
                ('generation', models.PositiveBigIntegerField(default=1)),
                ('scan_requested', models.BooleanField(default=False)),
                ('provider', models.OneToOneField(null=True, on_delete=deletion.CASCADE, to='cab_core.agentprovider')),
            ],
            options={'db_table': 'agent_catalog_files'},
        ),
        migrations.CreateModel(
            name='AgentCatalogProjection',
            fields=[
                ('id', models.CharField(max_length=64, primary_key=True, serialize=False)),
                ('kind', models.CharField(max_length=16, db_index=True)),
                ('data', models.JSONField()),
            ],
            options={'db_table': 'agent_catalog_projection'},
        ),
        migrations.RunSQL(PROJECTION, REVERSE),
    ]
