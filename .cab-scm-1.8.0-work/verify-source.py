import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

root = Path('/home/devops/datas/cab')
work = root / '.cab-scm-1.8.0-work'
baseline = json.loads((work / 'baseline.json').read_text())
paths = set(baseline)
for directory in ['src', 'tests', 'plugins/cab-approval-bridge/scripts',
                  'plugins/cab-approval-bridge/broker', 'plugins/cab-approval-bridge/web-monitor',
                  'plugins/cab-approval-bridge/systemd']:
    for path in (root / directory).rglob('*'):
        if path.is_file() and not path.is_symlink() and path.suffix in {'.py', '.mjs', '.html', '.css', '.service'} and '__pycache__' not in path.parts:
            paths.add(str(path.relative_to(root)))
changed, added, removed, syntax, encoding = [], [], [], [], []
for name in sorted(paths):
    path = root / name
    if not path.exists():
        removed.append(name)
        continue
    data = path.read_bytes()
    if name in baseline and hashlib.sha256(data).hexdigest() == baseline[name]:
        continue
    (changed if name in baseline else added).append(name)
    try:
        data.decode('utf-8')
        assert not data.startswith(b'\xef\xbb\xbf') and b'\r' not in data
    except (UnicodeDecodeError, AssertionError):
        raise SystemExit('Encodage invalide : ' + name)
    encoding.append(name)
    if path.suffix == '.mjs':
        command = ['/home/devops/node/current/bin/node', '--check', str(path)]
    elif path.suffix == '.py':
        command = ['/home/devops/python/current/bin/python3', '-m', 'py_compile', str(path)]
    else:
        continue
    result = subprocess.run(command, capture_output=True, text=True,
                            env={**os.environ, 'PYTHONPYCACHEPREFIX': str(work / 'syntax-pycache')})
    syntax.append({'file': name, 'exit': result.returncode})
    if result.returncode:
        raise SystemExit(result.stderr)
assert not removed, removed
original = Path('/home/ade/.codex/plugins/cache/cab_codex_plugins/cab-approval-bridge/1.7.1+codex.20261020164727/scripts/cgpt-approval-bridge-job-context.mjs').read_text()
current = (root / 'plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs').read_text()
guards = {}
for name in ['checkRecoveryRetry', 'checkRecoveryPreflight', 'checkNativeAsk', 'nativeAskGuard', 'transmitApprovedOperation']:
    pattern = r'^(?:async )?function ' + name + r'\([^\n]*\)[^\n]*\{[\s\S]*?^}'
    before = re.search(pattern, original, re.M).group()
    after = re.search(pattern, current, re.M).group()
    assert before == after, name
    guards[name] = {'identical_to_original': True, 'sha256': hashlib.sha256(after.encode()).hexdigest()}
copies = []
for name in ['cgpt_approval_bridge_server.py', 'cgpt_approval_bridge_router.py', 'cgpt_approval_bridge_journal.py']:
    assert (root / 'src' / name).read_bytes() == (root / 'plugins/cab-approval-bridge/broker' / name).read_bytes()
    copies.append(name)
result = {'changed': changed, 'added': added, 'removed': removed, 'syntax': syntax,
          'encoding_utf8_lf': encoding, 'guards': guards, 'broker_copies_identical': copies,
          'limitation': 'Comparaison aux chemins de la base autorisee et aux seuls repertoires source concernes ; aucun etat Git inspecte.'}
(work / 'source-final.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'changed': len(changed), 'added': len(added), 'removed': len(removed), 'syntax': len(syntax), 'guards': guards, 'copies': len(copies)}, ensure_ascii=False))
