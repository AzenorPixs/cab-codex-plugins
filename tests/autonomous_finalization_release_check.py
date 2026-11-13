"""Tests purs exécutés par CAB à la révision livrée, sans lecture d'anciens logs."""
from pathlib import Path
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
suite=unittest.defaultTestLoader.discover(str(ROOT/'tests'),pattern='test_finalization_contract.py')
result=unittest.TextTestRunner().run(suite)
if not result.wasSuccessful():raise SystemExit(1)
