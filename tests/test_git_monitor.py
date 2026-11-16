"""Vérifications ciblées de la file de surveillance Git."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from cab_platform.git_monitor_logic import mark_pending, next_ready


class GitMonitorTests(unittest.TestCase):
    def setUp(self):
        self.settings = {'quiet_seconds': 7, 'interval_seconds': 30, 'maximum_seconds': 70}
        self.pending = {}

    def test_regroupe_et_attend_les_sept_secondes(self):
        mark_pending(self.pending, 'cab', 0)
        mark_pending(self.pending, 'cab', 6)
        self.assertEqual(self.pending, {'cab': (0, 6)})
        self.assertIsNone(next_ready(self.pending, {}, self.settings, 12))
        self.assertEqual(next_ready(self.pending, {}, self.settings, 13), 'cab')

    def test_respecte_intervalle_minimal(self):
        mark_pending(self.pending, 'cab', 1)
        self.assertIsNone(next_ready(self.pending, {'cab': 0}, self.settings, 29))
        self.assertEqual(next_ready(self.pending, {'cab': 0}, self.settings, 30), 'cab')

    def test_activite_continue_declenche_apres_maximum(self):
        mark_pending(self.pending, 'cab', 0)
        mark_pending(self.pending, 'cab', 69)
        self.assertIsNone(next_ready(self.pending, {}, self.settings, 69))
        self.assertEqual(next_ready(self.pending, {}, self.settings, 70), 'cab')

    def test_projet_attendant_intervalle_ne_bloque_pas_autre_projet(self):
        mark_pending(self.pending, 'cab', 0)
        mark_pending(self.pending, 'pixs', 0)
        self.assertEqual(next_ready(self.pending, {'cab': 10}, self.settings, 20), 'pixs')


if __name__ == '__main__':
    unittest.main()
