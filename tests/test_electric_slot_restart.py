"""Vérifie le parcours d’administration de la réplication avant redémarrage."""
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))

from cab_platform import bootstrap, maintenance
from cab_platform.client import ClientError


class ElectricSlotRestartTests(unittest.TestCase):
    def setUp(self):
        self.cfg = {'initialized': True, 'database': 'cab', 'database_port': 5433}

    @patch.object(maintenance, 'atomic_json')
    @patch.object(maintenance.subprocess, 'run')
    @patch('cab_platform.postgresql.ensure')
    @patch.object(bootstrap, '_psql', side_effect=['f', ''])
    def test_role_setting_is_applied_to_the_cab_database(self, psql, ensure, migrate, write):
        migrate.return_value.returncode = 0
        with patch.object(maintenance, 'config', return_value=self.cfg):
            self.assertEqual(maintenance.installed()['state'], 'CONFIGURED')

        psql.assert_any_call(5433, maintenance.INCOMPATIBLE_ELECTRIC_SLOT_SQL, 'cab')
        port, sql, database = psql.call_args.args
        self.assertEqual((port, database), (5433, 'cab'))
        self.assertTrue(sql.startswith("ALTER ROLE cab_electric IN DATABASE cab SET lc_messages TO 'C';"))
        self.assertNotIn('pg_drop_replication_slot', sql)
        self.assertNotIn('ALTER SYSTEM', sql)
        ensure.assert_called_once()
        write.assert_called_once()

    @patch.object(maintenance, 'atomic_json')
    @patch.object(maintenance.subprocess, 'run')
    @patch('cab_platform.postgresql.ensure')
    @patch.object(bootstrap, '_psql', return_value='t')
    def test_invalid_slot_refuses_installation_before_modifying_database(self, psql, ensure, migrate, write):
        with patch.object(maintenance, 'config', return_value=self.cfg):
            with self.assertRaisesRegex(ClientError, '^electric-replication-slot-incompatible$'):
                maintenance.installed()

        psql.assert_called_once_with(5433, maintenance.INCOMPATIBLE_ELECTRIC_SLOT_SQL, 'cab')
        ensure.assert_called_once()
        migrate.assert_not_called()
        write.assert_not_called()

    @patch.object(maintenance, 'atomic_json')
    @patch.object(bootstrap, '_psql')
    def test_uninitialized_installation_does_not_access_slot(self, psql, write):
        with patch.object(maintenance, 'config', return_value={}):
            self.assertEqual(maintenance.installed()['state'], 'BOOTSTRAP_ONLY')

        psql.assert_not_called()
        write.assert_called_once()
