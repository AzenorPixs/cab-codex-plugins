# Qualification

Le 10 novembre 2026, les tests ciblés valident les répertoires normalisés de groupe, les reçus en 0770, les anciens reçus privés, les liens, les droits autres et l’identité de groupe.

- `python3 -B tests/test_atelier_permissions.py` : 4 tests réussis.
- `CAB_TEST_FOREIGN_UID=1002 node --test tests/atelier-native.test.mjs tests/autonomy.test.mjs tests/protocol-distribution.test.mjs` : 11 tests réussis ; deux UID réels, isolation, catalogue et absence de rejeu.
- `openspec validate --specs --strict` : 24 spécifications validées.
- L’accès au groupe qualifié est une frontière explicite : un membre de ce groupe a les droits 0770. Aucun droit n’est accordé aux autres comptes.
- Cette correction concerne les jobs et fichiers de l’atelier ; elle ne prouve pas que tous les autres composants CAB créent leurs fichiers en 0770.

Cadrages : PROJECT, TECHNICAL et CHANGELOG actualisés ; BUILD et README restent applicables sans changement de construction ou d’interface. DEVOPS et AGENTS comportent des modifications préexistantes distinctes. La carte est actualisée, sans attribution de code inventée. La vérification du service et de l’atelier Pixs suit publication et CABU ; les preuves locales ne valent pas activation.

Le moteur SGS a également été adapté pour accepter `--file-mode 0770` ; son test CLI passe et le rapport individuel a été effectivement publié en mode 0770. Cette mise en cohérence SGS a été identifiée après l’archivage initial ; sa spécification globale est synchronisée et validée. Le delta global a été tenté et refusé pour contrat/couple incompatible ; aucune reconstruction n’a été faite.
