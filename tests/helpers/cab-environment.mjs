import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Une fixture ne doit jamais hériter des chemins ou transports d'un CAB réel.
const fixtureDirectory = mkdtempSync(join(tmpdir(), 'cab-v2-fixture-'));
const fixturePassword = join(fixtureDirectory, 'opencode.password');
writeFileSync(fixturePassword, 'synthetic-v2-test-password\n', { mode: 0o600 });
chmodSync(fixturePassword, 0o600);
process.once('exit', () => rmSync(fixtureDirectory, { recursive: true, force: true }));
process.env.OC_Codex_OPENCODE_PASSWORD_FILE = fixturePassword;
delete process.env.CREDENTIALS_DIRECTORY;

export const fixtureEnvironment = {
  ...Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !key.startsWith('OC_Codex_') && !key.startsWith('OC_CGPT_') && !key.startsWith('CGPT_') && key !== 'CREDENTIALS_DIRECTORY')),
  OC_Codex_OPENCODE_PASSWORD_FILE: fixturePassword,
};
