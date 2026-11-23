from django.db import migrations, models
from django.db.models import deletion


REGISTER = """
CREATE FUNCTION cab_register_reservation(owner bigint, origin text, origin_id bigint,
    resource_kind text, label text, begins timestamptz) RETURNS void LANGUAGE sql AS $$
    INSERT INTO resource_reservations
        (run_id, project_id, session_id, change, source, source_id, kind,
         description, count, started, expires, warned)
    SELECT id, project_id, session_id, change, origin, origin_id, resource_kind,
           label, 1, begins, clock_timestamp() + interval '300 seconds', false
    FROM runs WHERE id = owner
    ON CONFLICT (source, source_id) DO NOTHING;
$$;

CREATE FUNCTION cab_reservation_released(owner bigint, origin text, origin_id bigint,
    label text) RETURNS void LANGUAGE sql AS $$
    INSERT INTO cab_core_event (project_id, run_id, kind, data, created)
    SELECT project_id, id, 'reservation-released',
           jsonb_build_object('source', origin, 'source_id', origin_id,
                              'description', label, 'delivery', 'PENDING'),
           clock_timestamp()
    FROM runs WHERE id = owner;
$$;

CREATE FUNCTION cab_track_file_reservation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.active = OLD.active THEN RETURN NULL; END IF;
    IF TG_OP = 'DELETE' OR NOT NEW.active THEN
        IF OLD.active THEN
            PERFORM cab_reservation_released(
                coalesce(
                    (SELECT run_id FROM resource_reservations WHERE source = 'git' AND source_id = OLD.id),
                    (SELECT id FROM runs WHERE project_id = OLD.project_id
                        AND change_record_id = indexes.change_id AND coding_session_id = indexes.session_id
                        ORDER BY id DESC LIMIT 1),
                    indexes.initial_run_id
                ), 'git', OLD.id, OLD.path)
            FROM git_session_indexes AS indexes WHERE indexes.id = OLD.git_index_id;
            DELETE FROM resource_reservations WHERE source = 'git' AND source_id = OLD.id;
        END IF;
    ELSE
        PERFORM cab_register_reservation(
            coalesce(
                (SELECT id FROM runs WHERE project_id = NEW.project_id
                    AND change_record_id = indexes.change_id AND coding_session_id = indexes.session_id
                    ORDER BY id DESC LIMIT 1),
                indexes.initial_run_id
            ), 'git', NEW.id, 'file', NEW.path, NEW.created)
        FROM git_session_indexes AS indexes WHERE indexes.id = NEW.git_index_id;
    END IF;
    RETURN NULL;
END;
$$;
CREATE TRIGGER cab_file_reservation AFTER INSERT OR UPDATE OF active OR DELETE
    ON git_file_reservations FOR EACH ROW EXECUTE FUNCTION cab_track_file_reservation();

CREATE FUNCTION cab_track_resource_lease() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    key_prefix text;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.state = OLD.state THEN RETURN NULL; END IF;
    IF TG_OP = 'DELETE' OR NEW.state <> 'HELD' THEN
        IF OLD.state = 'HELD' THEN
            PERFORM cab_reservation_released(OLD.run_id, 'lease', OLD.id, OLD.resource_id);
            DELETE FROM resource_reservations WHERE source = 'lease' AND source_id = OLD.id;
        END IF;
    ELSE
        key_prefix := split_part(NEW.resource_id, ':', 1);
        PERFORM cab_register_reservation(NEW.run_id, 'lease', NEW.id,
            CASE WHEN key_prefix IN ('docker', 'lxc', 'browser', 'file') THEN key_prefix ELSE 'resource' END,
            NEW.resource_id, NEW.created);
    END IF;
    RETURN NULL;
END;
$$;
CREATE TRIGGER cab_resource_lease AFTER INSERT OR UPDATE OF state OR DELETE
    ON cab_core_lease FOR EACH ROW EXECUTE FUNCTION cab_track_resource_lease();

SELECT cab_register_reservation(i.initial_run_id, 'git', f.id, 'file', f.path, f.created)
    FROM git_file_reservations f JOIN git_session_indexes i ON i.id = f.git_index_id WHERE f.active;
SELECT cab_register_reservation(l.run_id, 'lease', l.id,
    CASE WHEN split_part(l.resource_id, ':', 1) IN ('docker', 'lxc', 'browser', 'file')
         THEN split_part(l.resource_id, ':', 1) ELSE 'resource' END,
    l.resource_id, l.created)
    FROM cab_core_lease l WHERE l.state = 'HELD';

"""

UNREGISTER = """
DROP TRIGGER cab_file_reservation ON git_file_reservations;
DROP TRIGGER cab_resource_lease ON cab_core_lease;
DROP FUNCTION cab_track_file_reservation();
DROP FUNCTION cab_track_resource_lease();
DROP FUNCTION cab_reservation_released(bigint, text, bigint, text);
DROP FUNCTION cab_register_reservation(bigint, text, bigint, text, text, timestamptz);
"""


class Migration(migrations.Migration):
    dependencies = [('cab_core', '0053_cycle_token_usage')]

    operations = [
        migrations.CreateModel(
            name='ResourceReservation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('run', models.ForeignKey(on_delete=deletion.CASCADE, to='cab_core.run')),
                ('project_id', models.CharField(db_index=True, max_length=64)),
                ('session_id', models.CharField(max_length=200)),
                ('change', models.CharField(max_length=200)),
                ('source', models.CharField(max_length=8)),
                ('source_id', models.PositiveBigIntegerField()),
                ('kind', models.CharField(max_length=16)),
                ('description', models.CharField(max_length=1800)),
                ('count', models.PositiveBigIntegerField(default=1)),
                ('started', models.DateTimeField()),
                ('expires', models.DateTimeField(db_index=True)),
                ('warned', models.BooleanField(default=False)),
            ],
            options={
                'db_table': 'resource_reservations',
                'constraints': [models.UniqueConstraint(fields=('source', 'source_id'), name='cab_reservation_source')],
            },
        ),
        migrations.RunSQL(REGISTER, UNREGISTER),
    ]
