from django.db import migrations, models


KEY_FIELDS = """
    'day', item.metrics->'day', 'week', item.metrics->'week',
    'month', item.metrics->'month', 'credits', item.metrics->'credits',
    'valid', item.valid, 'checked_at', item.checked_at, 'refreshed_at', item.refreshed_at,
    'queued', item.refresh_requested, 'checking', item.checking_at IS NOT NULL,
    'check_error', item.check_error, 'metrics_error', item.metrics_error, 'metrics', item.metrics
"""
OLD_KEY_FIELDS = "'day', NULL, 'week', NULL, 'month', NULL, 'credits', NULL"
FILE_FIELDS = ", 'attempted_at', item.attempted_at, 'last_refresh_error', item.last_refresh_error"


def projection(key_fields, file_fields):
    return f"""
    CREATE OR REPLACE FUNCTION cab_agent_catalog_key(item agent_api_keys) RETURNS jsonb
    LANGUAGE sql IMMUTABLE AS $$
    SELECT jsonb_build_object('id', item.id, 'provider_id', item.provider_id, {key_fields})
    $$;
    CREATE OR REPLACE FUNCTION cab_agent_catalog_file(item agent_catalog_files) RETURNS jsonb
    LANGUAGE sql IMMUTABLE AS $$
    SELECT jsonb_build_object('id', item.id, 'provider_id', item.provider_id, 'url', item.url,
      'valid', item.valid, 'adjusting', item.adjusting, 'state', item.state,
      'error', item.error, 'refreshed_at', item.refreshed_at {file_fields})
    $$;
    UPDATE agent_catalog_projection p SET data = cab_agent_catalog_key(k)
      FROM agent_api_keys k WHERE p.id = 'key:' || k.id;
    UPDATE agent_catalog_projection p SET data = cab_agent_catalog_file(f)
      FROM agent_catalog_files f WHERE p.id = 'file:' || f.id;
    """


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0062_openai_catalog')]
    operations = [
        migrations.AddField('agentapikey', 'valid', models.BooleanField(null=True, default=None)),
        migrations.AddField('agentapikey', 'checked_at', models.DateTimeField(null=True)),
        migrations.AddField('agentapikey', 'refreshed_at', models.DateTimeField(null=True)),
        migrations.AddField('agentapikey', 'refresh_after', models.DateTimeField(null=True, db_index=True)),
        migrations.AddField('agentapikey', 'refresh_requested', models.BooleanField(default=True)),
        migrations.AddField('agentapikey', 'checking_at', models.DateTimeField(null=True)),
        migrations.AddField('agentapikey', 'check_error', models.CharField(max_length=80, blank=True, default='')),
        migrations.AddField('agentapikey', 'metrics_error', models.CharField(max_length=80, blank=True, default='')),
        migrations.AddField('agentapikey', 'metrics', models.JSONField(default=dict)),
        migrations.AddField('agentcatalogfile', 'attempted_at', models.DateTimeField(null=True)),
        migrations.AddField('agentcatalogfile', 'last_refresh_error',
                            models.CharField(max_length=80, blank=True, default='')),
        migrations.RunSQL(projection(KEY_FIELDS, FILE_FIELDS), projection(OLD_KEY_FIELDS, '')),
    ]
