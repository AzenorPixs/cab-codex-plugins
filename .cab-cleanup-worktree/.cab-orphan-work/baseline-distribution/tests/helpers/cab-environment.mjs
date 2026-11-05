// Une fixture ne doit jamais hériter des chemins ou transports d'un CAB réel.
export const fixtureEnvironment = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !key.startsWith('OC_Codex_') && !key.startsWith('OC_CGPT_') && !key.startsWith('CGPT_')));
