"""Vérifie la découverte locale des écoutes IPv4 d’OpenCode."""
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cab_platform.settings')
import django
django.setup()

from cab_platform.opencode_recovery import listeners


class OpenCodeListenerTests(unittest.TestCase):
    def test_only_owned_listeners_accessible_from_loopback_are_selected(self):
        entries = [
            ('00000000:1000', '0A', 123),
            ('0100007F:1001', '0A', 124),
            ('0100A8C0:1002', '0A', 125),
            ('00000000:1003', '01', 126),
            ('00000000:1004', '0A', 127),
        ]
        table = '\n'.join(['header', *(
            f'{index}: {address} 00000000:0000 {state} 0:0 0:0 0 0 0 {inode}'
            for index, (address, state, inode) in enumerate(entries)
        )])
        with patch.object(Path, 'iterdir', return_value=list(range(123, 127))), \
                patch('os.readlink', side_effect=lambda fd: f'socket:[{fd}]'), \
                patch.object(Path, 'read_text', return_value=table):
            self.assertEqual(listeners(12345), [4096, 4097])


if __name__ == '__main__':
    unittest.main(verbosity=2)
