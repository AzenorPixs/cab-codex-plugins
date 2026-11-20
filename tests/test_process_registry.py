from unittest import TestCase
from unittest.mock import patch
from uuid import uuid4

from cab_platform import __version__, process_registry as registry
from cab_platform.core.models import Maintenance, ObservedBinary


class BinaryRegistryTests(TestCase):
    def test_binary_stays_in_table_after_stop_until_normal_start(self):
        row={'pid':987654,'uid':0,'boot':'fixture','start':'999','parent_pid':1}
        with patch.object(registry,'identity',return_value=row), patch.object(registry,'processes',return_value=[]), patch.object(registry,'executable',return_value='/usr/bin/cab'):
            registry.refresh({row['pid']:'cab'})
        tracked=ObservedBinary.objects.get(pid=row['pid'])
        self.assertEqual((tracked.executable,tracked.role,tracked.active),('/usr/bin/cab','cab',True))
        with patch.object(registry,'identity',return_value=None), patch.object(registry,'processes',return_value=[]), patch.object(registry,'observed_dead',return_value=True):
            registry.refresh({})
        tracked.refresh_from_db()
        self.assertFalse(tracked.active)
        self.assertIsNotNone(tracked.stopped)
        key=f'debian-upgrade-{__version__}-{uuid4().int}'
        job=Maintenance.objects.create(pk=key,state='PREPARED')
        with patch.object(registry,'read_json',return_value={'transaction_id':key,'state':'PREPARED'}):
            self.assertTrue(registry.initialize())
            self.assertTrue(ObservedBinary.objects.filter(pk=tracked.pk).exists())
            job.state='COMPLETED';job.save()
            self.assertFalse(registry.initialize())
            self.assertFalse(ObservedBinary.objects.filter(pk=tracked.pk).exists())
