# Qualification

Le 10 novembre 2026, le change précise la coordination des bancs, les restrictions, les preuves et les protections CAB.

- `openspec validate examine-available-test-environments --strict` : réussi après correction d’une exigence trop longue.
- `node --test tests/autonomy.test.mjs tests/test-environment-contract.test.mjs tests/protocol-distribution.test.mjs` : 11 tests réussis. Les nouveaux tests contrôlent le contrat écrit et ses deux copies, pas la décision d’un LLM.
- `python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-build-contract.py --plugin-root plugins/cab-approval-bridge` : contrôle des deux paquets réussi.
- Scénario 1CISMP1 : revue du contrat sur échec local, LXC pertinent, restriction Desktop et portée de preuve ; aucune exécution réelle d’un agent ni qualification Secret Service n’est revendiquée.

Cohérence : `PROJECT.md` et `CHANGELOG.md` mis à jour ; `TECHNICAL.md`, `BUILD.md` et `README.md` inchangés, leurs interfaces, construction et présentation générale ne changent pas. `AGENTS.md` et `DEVOPS.md` comportent des changements préexistants ou concurrents externes à ce change. La carte et le registre ne requièrent aucun code de lot inventé ; l’archivage conserve les preuves du change. Les prompts restent externes et inchangés.
