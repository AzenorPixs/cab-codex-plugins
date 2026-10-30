import { constants } from 'node:fs';
import { open, lstat, mkdir, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';

export const VERSION = '2.1.15';
const fail = code => { throw Object.assign(new Error(code), { code }); };

async function safeDirectories(path, create = false) {
  let current = '/';
  for (const part of resolve(path).split('/').filter(Boolean)) {
    current = join(current, part);
    if (create) {
      try { await mkdir(current, { mode: 0o700 }); }
      catch (cause) { if (cause.code !== 'EEXIST') fail('update-credential-directory-unsafe'); }
    }
    const metadata = await lstat(current);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) fail('update-credential-directory-unsafe');
  }
}
async function readBounded(path, privateFile) {
  let handle;
  try {
    await safeDirectories(dirname(path));
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const metadata = await handle.stat(), limit = privateFile ? 4096 : 1024 * 1024;
    if (!metadata.isFile() || metadata.nlink !== 1 || metadata.size > limit || metadata.size < 1 ||
        (privateFile ? metadata.uid !== process.getuid() || (metadata.mode & 0o077) || !(metadata.mode & 0o400) : metadata.mode & 0o002)) {
      fail('update-credential-unsafe');
    }
    const bytes = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < bytes.length) {
      const result = await handle.read(bytes, length, bytes.length - length, null);
      if (!result.bytesRead) break;
      length += result.bytesRead;
    }
    if (length > limit) fail('update-credential-unsafe');
    const data = bytes.subarray(0, length), text = data.toString('utf8');
    if (!Buffer.from(text, 'utf8').equals(data)) fail('update-credential-unsafe');
    return text;
  } catch (cause) {
    if (cause.code?.startsWith('update-')) throw cause;
    fail(cause.code === 'ENOENT' ? 'update-credential-missing' : 'update-credential-unsafe');
  } finally { await handle?.close(); }
}
function password(text) {
  const value = text.endsWith('\n') ? text.slice(0, -1) : text;
  if (!value || /[\r\n\0]/.test(value) || Buffer.byteLength(value) > 4095) fail('update-credential-invalid');
  return value;
}
function envPassword(text) {
  const lines = text.split('\n').filter(line => /^\s*(?:export\s+)?OPENCODE_PASSWORD\b/.test(line));
  if (lines.length !== 1) fail('update-credential-source-ambiguous');
  const match = /^\s*(?:export\s+)?OPENCODE_PASSWORD\s*=\s*(.*?)\s*$/.exec(lines[0]);
  if (!match) fail('update-credential-source-ambiguous');
  let value = match[1];
  if (/^['"]/.test(value)) {
    if (value.length < 2 || value.at(-1) !== value[0]) fail('update-credential-source-ambiguous');
    value = value.slice(1, -1);
  } else if (/\s/.test(value)) fail('update-credential-source-ambiguous');
  if (/[\\`$'"\r\0]/.test(value)) fail('update-credential-source-ambiguous');
  return password(value);
}

// Cette fonction ne retourne jamais le credential ; seules des identités de source publiques sont admises.
export async function prepareUpdateCredential({ home, workspace, serviceWorkspace = workspace, passwordEnvFile }) {
  const target = join(home, '.config/cab-approval-bridge/opencode.password');
  let supplied;
  if (passwordEnvFile !== undefined) {
    if (typeof passwordEnvFile !== 'string' || !isAbsolute(passwordEnvFile) ||
        ![workspace, serviceWorkspace].some(root => resolve(passwordEnvFile) === join(root, 'project.env'))) {
      fail('update-credential-source-refused');
    }
    supplied = envPassword(await readBounded(resolve(passwordEnvFile), false));
  }
  try {
    const existing = password(await readBounded(target, true));
    if (supplied !== undefined && existing !== supplied) fail('update-credential-conflict');
    return { status: 'existing' };
  } catch (cause) {
    if (cause.code !== 'update-credential-missing' || supplied === undefined) throw cause;
  }
  await safeDirectories(dirname(target), true);
  const parent = await lstat(dirname(target));
  if (parent.uid !== process.getuid() || (parent.mode & 0o022)) fail('update-credential-directory-unsafe');
  let handle, created = false;
  try {
    handle = await open(target, 'wx', 0o600); created = true;
    await handle.chmod(0o600); await handle.writeFile(supplied + '\n'); await handle.sync();
  } catch (cause) {
    if (created) await unlink(target);
    if (cause.code === 'EEXIST') return prepareUpdateCredential({ home, workspace, serviceWorkspace, passwordEnvFile });
    fail('update-credential-provision-failed');
  } finally { await handle?.close(); }
  return { status: 'provisioned' };
}
