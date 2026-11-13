"""Signaux réels sur des enfants de fixture exclusivement, aucun client utilisateur."""
import asyncio
import os
import signal
import sys
import unittest
from unittest.mock import patch
from cab_platform import worker_stop as w

FAST={'graceful_timeout_seconds':.1,'term_timeout_seconds':.1,'kill_timeout_seconds':1,'allow_sigkill':True}

class PolicyTests(unittest.TestCase):
    def test_bounds_and_boolean(self):
        self.assertEqual(w.policy()['term_timeout_seconds'],10)
        for value in [{'allow_sigkill':1},{'term_timeout_seconds':0},{'kill_timeout_seconds':float('nan')},{'unknown':True}]:
            with self.assertRaises(ValueError):w.policy(value)

class StopTests(unittest.IsolatedAsyncioTestCase):
    async def spawn(self,stubborn=False):
        code='import sys;sys.stdin.read()' if not stubborn else 'import signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);print("READY",flush=True);time.sleep(60)'
        process=await asyncio.create_subprocess_exec(sys.executable,'-B','-c',code,stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE)
        if stubborn:await process.stdout.readline()
        return process
    async def finish_fixture(self,process):
        if process.returncode is None:process.kill()
        await process.wait()
    async def test_graceful_exit_without_signal(self):
        p=await self.spawn()
        try:
            with patch.object(w,'cab_process',return_value='codex'):result=await w.stop_child(p,'codex',FAST,lambda:True)
            self.assertEqual(result['state'],'STOPPED');self.assertEqual(result['stages'],['stdin-eof'])
        finally:await self.finish_fixture(p)
    async def test_stubborn_child_reaches_real_sigkill(self):
        p=await self.spawn(True)
        try:
            with patch.object(w,'cab_process',return_value='codex'):result=await w.stop_child(p,'codex',FAST,lambda:True)
            self.assertEqual(result['stages'],['stdin-eof','SIGTERM','SIGKILL']);self.assertEqual(p.returncode,-signal.SIGKILL);self.assertEqual(result['state'],'STOPPED')
        finally:await self.finish_fixture(p)
    async def test_disabled_kill_keeps_child_alive(self):
        p=await self.spawn(True)
        try:
            with patch.object(w,'cab_process',return_value='codex'):result=await w.stop_child(p,'codex',{**FAST,'allow_sigkill':False},lambda:True)
            self.assertEqual(result['reason'],'sigkill-disabled');self.assertIsNone(p.returncode);self.assertNotIn('SIGKILL',result['stages'])
        finally:await self.finish_fixture(p)
    async def test_inflight_or_wrong_mode_refuses_without_signal(self):
        p=await self.spawn(True)
        try:
            with patch.object(w,'cab_process',return_value='codex'):result=await w.stop_child(p,'codex',FAST,lambda:False)
            self.assertEqual(result['state'],'REFUSED');self.assertEqual(result['stages'],[])
            with patch.object(w,'cab_process',return_value=None):result=await w.stop_child(p,'codex',FAST,lambda:True)
            self.assertEqual(result['state'],'REFUSED');self.assertIsNone(p.returncode)
            saved=w.identity(p.pid)
            with patch.object(w,'cab_process',return_value='codex'),patch.object(w,'identity',side_effect=[saved,saved,{**saved,'start':'changed'}]):result=await w.stop_child(p,'codex',FAST,lambda:True)
            self.assertEqual(result['state'],'REFUSED');self.assertEqual(result['stages'],[])
        finally:await self.finish_fixture(p)
    async def test_boundary_lost_after_graceful_wait_blocks_sigterm(self):
        p=await self.spawn(True);checks=iter([True,True,False])
        try:
            with patch.object(w,'cab_process',return_value='codex'):result=await w.stop_child(p,'codex',FAST,lambda:next(checks,False))
            self.assertEqual(result['state'],'DEFERRED');self.assertEqual(result['stages'],['stdin-eof']);self.assertIsNone(p.returncode)
        finally:await self.finish_fixture(p)

if __name__=='__main__':unittest.main()
