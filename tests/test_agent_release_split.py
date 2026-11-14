"""Le catalogue GitHub CLI ne devient pas la version de l'application."""
import gzip
import io
import unittest
from unittest.mock import patch
from cab_platform.agent_releases import fetch_chatgpt,fetch
class AgentReleaseSplitTests(unittest.TestCase):
    def test_chatgpt_uses_apt_package_version(self):
        data=b'Package: chatgpt\nArchitecture: amd64\nVersion: 26.1111.21308\n\nPackage: other\nArchitecture: amd64\nVersion: 999\n'
        with patch('cab_platform.agent_releases.urlopen',return_value=io.BytesIO(gzip.compress(data))) as http:
            result=fetch_chatgpt();self.assertEqual(result['version'],'26.1111.21308');self.assertEqual(result['provider_label'],'APT ChatGPT')
            self.assertIn('/dists/stable/main/binary-amd64/Packages.gz',http.call_args.args[0].full_url)
    def test_cli_uses_official_latest_rust_tag(self):
        data=b'{"tag_name":"rust-v0.169.0","html_url":"https://github.com/openai/codex/releases/tag/rust-v0.169.0"}'
        with patch('cab_platform.agent_releases.urlopen',return_value=io.BytesIO(data)) as http:
            result=fetch('openai/codex');self.assertEqual(result['version'],'0.169.0');self.assertEqual(result['provider_label'],'GitHub')
            self.assertTrue(http.call_args.args[0].full_url.endswith('/releases/latest'))
if __name__=='__main__':unittest.main()
