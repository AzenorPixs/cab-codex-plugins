import sys
import unittest
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'src'))
suite = unittest.TestSuite()
for pattern in ('test_mcp_bridge.py', 'test_unobserved_mcp_recovery.py'):
    suite.addTests(unittest.defaultTestLoader.discover(str(root / 'tests'), pattern=pattern))
raise SystemExit(not unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful())
