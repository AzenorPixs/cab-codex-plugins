import unittest
from unittest.mock import Mock
from artifact_attestation import ProofError,selected_package,checked_asset

class ArtifactProofTests(unittest.TestCase):
    def setUp(self):self.package={'name':'cab_3.9.4_amd64.deb','version':'3.9.4','size':123,'sha256':'a'*64}
    def test_exact_version_selected(self):self.assertEqual(selected_package([self.package],'3.9.4'),self.package)
    def test_ambiguous_package_refused(self):
        with self.assertRaises(ProofError):selected_package([self.package,self.package],'3.9.4')
    def test_remote_digest_verified(self):
        fallback=Mock();asset={**self.package,'digest':'sha256:'+'a'*64}
        self.assertEqual(checked_asset(self.package,asset,fallback),'a'*64);fallback.assert_not_called()
    def test_remote_without_digest_is_downloaded(self):
        fallback=Mock(return_value='a'*64)
        self.assertEqual(checked_asset(self.package,self.package,fallback),'a'*64);fallback.assert_called_once()
    def test_different_digest_is_refused(self):
        with self.assertRaises(ProofError):checked_asset(self.package,{**self.package,'digest':'sha256:'+'b'*64},Mock())
    def test_wrong_size_is_refused_before_download(self):
        fallback=Mock()
        with self.assertRaises(ProofError):checked_asset(self.package,{**self.package,'size':999},fallback)
        fallback.assert_not_called()

if __name__=='__main__':unittest.main()
