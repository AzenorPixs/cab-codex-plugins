"""La préparation d’atelier ne recrée pas un fichier supprimé du cadrage."""
from pathlib import Path
import tempfile
import unittest
from cab_platform.transports.sandbox import sandbox_command,AtelierError

class DeletedGrantTests(unittest.TestCase):
    def test_missing_framed_file_is_not_mounted_or_recreated(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);atelier=root/'.cab-tests/change/RUN';atelier.mkdir(parents=True);missing=root/'SGS.md'
            args={'request_id':'R','run_id':'RUN','reservation_version':1,'session_id':'SID','change_id':'change','directory':str(root),'argv':['/bin/true'],'timeout_ms':1000}
            grant={'status':'AUTHORIZED_ATELIER','directory':str(root),'atelier':str(atelier),'runtimeRoots':[],'autonomy':{'protocol':'autonomous-change-v1','mandateId':'RUN','paths':[str(missing)]}}
            result=sandbox_command(args,grant);self.assertNotIn(str(missing),result['argv']);self.assertFalse(missing.exists())
            missing.symlink_to(root/'elsewhere')
            with self.assertRaises(AtelierError):sandbox_command(args,grant)

if __name__=='__main__':unittest.main()
