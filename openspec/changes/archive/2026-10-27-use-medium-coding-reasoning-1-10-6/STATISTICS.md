# Statistiques SCM — CAB 1.10.6 medium par défaut

## 1. Statistiques générales et décisions

Projet Codex Approval Bridge, identifiant `cab`. Session directe SCM portant
sur le choix automatique de `medium` et l'incrément source de 1.10.5 à 1.10.6.
Les niveaux explicitement fournis restent prioritaires. Aucun RUN CAB, agent
délégué, permission native, service actif ou télémétrie SCMP n'a été créé.

La première borne temporelle n'a pas été instrumentée. Fin de mesure après
archivage et vérifications : 27 octobre 2026, 12:46 UTC. Durée intégrale,
tokens, quotas, modèle exact et nombre exhaustif d'appels : N/A, absence de
mesure instrumentée initiale ; aucune reconstruction rétroactive.

## 2. Types de messages et d'outils

Lectures ciblées, édition des sources, documentation, tests, validation et
archivage OpenSpec. Compteurs exhaustifs de messages, outils, approbations et
refus : N/A, non instrumentés.

Suite JavaScript complète : 413 tests déclarés, 387 réussis, zéro échec et
26 ignorés par leurs gardes. Le test OpenCode natif isolé a aussi réussi
séparément. Suite Python : 73 tests réussis, zéro échec. Qualification Web
headless : Chromium et Firefox réussis. Compilation syntaxique Python :
12 fichiers réussis. Les tests ciblés sont inclus dans les suites complètes
et ne sont pas additionnés.

## 3. Fichiers modifiés

La politique de modèle, le contrôleur, le superviseur, les commandes `/CAB`,
`/CABU` et `cab`, les skills distribués, les versions du broker et des modules,
les unités systemd, l'interface Web, les tests et les cadrages ont été alignés.
Le plugin porte un cachebuster neuf. Les versions antérieures qualifiées,
notamment le broker chargé 1.10.5, restent admises pour la maintenance.

OpenSpec : le change `use-medium-coding-reasoning-1-10-6` est archivé dans ce
dossier ; les spécifications courantes de politique, distribution et mise à
jour des composants sont synchronisées. Un contrôle post-archivage a trouvé
un scénario historique de repli encore formulé avec les anciens niveaux ; la
spécification courante et le delta archivé ont été corrigés, sans nouvel
archivage. Le rapport est le fichier ajouté après l'archive.

`PROJECT.md`, `TECHNICAL.md`, `BUILD.md`, `README.md`, `CHANGELOG.md` et
`ORCHESTRATED_CODING.md` décrivent la version et la règle courantes. `AGENTS.md`
et `DEVOPS.md` sont restés inchangés. Le dépôt avait des changements locaux
antérieurs ; l'inventaire Git exhaustif sera examiné pendant l'étape SCM de
commit autorisée.

## 4. Commandes et validations

- `node --test tests/model-policy.test.mjs` : 18 réussis après correction d'une
  preuve de fixture qui portait encore l'ancienne variante.
- `node --test tests/concurrent-controller.test.mjs` : 75 réussis.
- `node --test tests/concurrent-supervisor.test.mjs` : 5 réussis.
- `node --test tests/controller-service-distribution.test.mjs` : 27 réussis.
- `node --test tests/active-component-update.test.mjs` : 24 réussis après
  normalisation des permissions du répertoire temporaire copié ; les gardes
  de sécurité du code produit restent inchangées.
- `node --test tests/*.test.mjs` : 413 déclarés, 387 réussis, zéro échec,
  26 ignorés par leurs conditions de test.
- `CAB_TEST_OPENCODE=/home/devops/.opencode/bin/opencode node --test
  tests/native-opencode.test.mjs` : un test natif réussi dans un contexte
  temporaire isolé.
- `node tests/web-monitor-browser.mjs` : Chromium et Firefox headless réussis.
- `python3 -m unittest discover -s tests -p 'test_*.py'` : 73 réussis.
- `python3 -m py_compile src/cgpt_approval_bridge_server.py
  src/cgpt_approval_bridge_router.py src/cgpt_approval_bridge_journal.py
  plugins/cab-approval-bridge/broker/cgpt_approval_bridge_server.py
  plugins/cab-approval-bridge/broker/cgpt_approval_bridge_router.py
  plugins/cab-approval-bridge/broker/cgpt_approval_bridge_journal.py
  plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py
  plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py
  plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py
  tests/test_crash_recovery.py tests/test_session_reset.py` : réussi.
- `/home/devops/.local/npm/bin/openspec validate
  use-medium-coding-reasoning-1-10-6 --type change --strict` : réussi avant
  archivage.
- `/home/devops/.local/npm/bin/openspec validate --all --strict` : 15 éléments
  valides avant archivage ; 14 spécifications valides après archivage et
  correction post-archive.
- `/home/devops/.local/npm/bin/openspec archive
  use-medium-coding-reasoning-1-10-6 --yes --json` : réussi ; `specsUpdated`
  vrai, quatre exigences ajoutées, une modifiée et une retirée.
- UTF-8, fins LF et absence de BOM vérifiés sur les 134 fichiers candidats des
  périmètres de code, documentation et OpenSpec concernés.

Un premier passage des tests du sélecteur et des preuves broker a échoué à
cause d'anciennes valeurs de fixture et des permissions héritées par un
répertoire temporaire. Les fixtures ont été corrigées dans le périmètre des
tests, puis leurs suites et la suite complète ont réussi. Aucun test ni garde
de production n'a été désactivé ou affaibli.

## 5. Accès web et ressources

Aucune recherche Web ni évaluation de fournisseur. Le test OpenCode natif a
utilisé un binaire local avec configuration et workspace temporaires ; les
deux navigateurs ont exécuté leurs tests headless. Aucun service CAB, cache,
installation, profil ou RUN réel n'a été modifié. Accès réseau externe et
compteurs exhaustifs : N/A, non instrumentés. Le commit et les publications
conditionnelles n'étaient pas encore exécutés à la date de ce rapport.

## 6. Synthèse globale

Les nouveaux jobs automatiques demandent `medium` par défaut. Un niveau
explicitement fourni reste prioritaire ; une incompatibilité native prouvée
fait examiner la candidate PLLM suivante. Le prévol exact et la conservation
du choix pendant les reprises sont maintenus. Les sources distribuées sont
alignées sur 1.10.6, sans activation ni déploiement runtime.

Les tests JavaScript, Python et navigateurs, la compilation Python, la
validation OpenSpec et l'archivage ont réussi après correction des fixtures.
Le rapport d'archive a six sections et ses totaux reflètent les sorties
observées. Les étapes Git conditionnelles suivent cette vérification et
restent distinctes de l'archivage et de la préparation source.
