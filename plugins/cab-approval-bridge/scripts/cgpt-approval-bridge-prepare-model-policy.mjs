import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareControllerModelPolicy, VERSION as POLICY_VERSION } from './cgpt-approval-bridge-model-policy.mjs';

export const VERSION = '2.1.21';

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (POLICY_VERSION !== VERSION) throw Object.assign(new Error(), { code: 'pllm-module-version-mismatch' });
    const input = {}, environment = {};
    for (const key of ['OC_Codex_PLLM_CATALOG', 'OC_CGPT_PLLM_CATALOG']) {
      if (Object.hasOwn(process.env, key)) environment[key] = process.env[key];
    }
    const flags = { '--pllm-skill-root': 'activeSkillRoot', '--catalog-path': 'catalogPath' };
    for (let i = 2; i < process.argv.length; i += 2) {
      const key = flags[process.argv[i]];
      if (!key || Object.hasOwn(input, key) || !process.argv[i + 1]) {
        throw Object.assign(new Error(), { code: 'pllm-preparation-arguments-invalid' });
      }
      input[key] = process.argv[i + 1];
    }
    if (input.catalogPath !== undefined) environment.OC_Codex_PLLM_CATALOG = input.catalogPath;
    const prepared = prepareControllerModelPolicy({ environment, activeSkillRoot: input.activeSkillRoot });
    process.stdout.write(JSON.stringify(prepared) + '\n');
  } catch (error) {
    process.stderr.write(JSON.stringify({ error: /^pllm-/.test(error.code || '') ? error.code : 'pllm-preparation-unavailable' }) + '\n');
    process.exitCode = 1;
  }
}
