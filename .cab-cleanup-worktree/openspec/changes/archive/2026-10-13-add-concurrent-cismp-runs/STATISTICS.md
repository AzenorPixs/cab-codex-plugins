# STATISTIQUES — CAB 1.0.0, RUN CISMP concurrents

Date : 2026-10-13, Europe/Paris.
Session : SCM directe dans /home/devops/datas/cab.
Change : add-concurrent-cismp-runs.
Archive : 2026-10-13-add-concurrent-cismp-runs.
État : TERMINÉ pour cet objectif source ; aucun déploiement.
Fin de relevé documentaire : 2026-10-13 18:31:27 Europe/Paris.

Ce rapport est produit au titre de l'obligation d'archivage, sans invoquer
coding-session-statistics ni activer de télémétrie de pilotage SCM.
Les mesures absentes sont N/A et ne sont pas reconstruites rétroactivement.
Les refus simulés des tests ne sont pas des décisions CAB métier du développeur.

## 1. Statistiques générales et décisions

| Mesure | Valeur | Preuve ou limite |
|---|---:|---|
| Tests distincts de la dernière passe | 155 | 48 Python + 106 Node simulés/registre + 1 contrôle natif |
| Tests réussis | 155 | Comptes des suites ci-dessous |
| Échecs finaux | 0 | Dernière passe uniquement |
| Réussite de la dernière passe | 100 % | 155 / 155 |
| Capacités OpenSpec finales | 8 / 8 | openspec validate --all --strict après synchronisation |
| Prompts pilotés mis à jour | 72 | 9 types dans chacun des 8 projets |
| Protocoles locaux traités | 8 | 4 existants modifiés, 4 créés |
| Fichiers PROMPTS hors sélection préservés | 96 | Empreintes initiales conservées, dont 16 CISM/CAISM et 8 INDEX |
| Fichiers finaux du périmètre | 136 | Manifeste en section 3 |
| Fichiers existants modifiés | 107 | Comparaison d'empreintes hors Git |
| Chemins nouveaux par rapport au relevé initial | 29 | Inclut les artefacts créés puis archivés et ce rapport |
| Archivages de ce change | 1 | CLI exit 0 ; aucun réarchivage |
| Début exact / durée active | N/A | Aucun relevé initial de durée instrumenté |
| Tokens et consommation par modèle | N/A | Pas de métriques natives de cette SCM disponibles |
| Quota initial, final et variation exclusive | N/A | Non relevés ; les quotas de compte sont partagés |
| Mandats et décisions CAB métier de cette SCM | N/A | SCM directe ; aucun pilotage de développement délégué |
| Nombre exhaustif d'appels outils / messages | N/A | Pas de télémétrie SCM activée |

Le développeur a validé l'architecture, son implémentation autonome, les
spécifications nécessaires, la version 1.0.0 et l'archivage de ce seul change.
Il a demandé tous les prompts pilotés de tous les projets et exclu CISM,
CAISM et les prompts directs. Le broker unique est retenu pour un contexte
OpenCode commun, avec propriété des changes, ressources, générations,
barrière stable de publication et réconciliation de référence.

À sa demande, les modifications ont été suspendues pendant la session OpenCode
existante. Surveillance hôte en lecture seule à cinq minutes : PID 1109509,
démarrage observé Mon Oct 12 18:29:52 2026. Attente observée approximativement
de 11:18 à 16:39 Europe/Paris ; son absence a ensuite été constatée sur l'hôte.
L'automatisation de surveillance a été mise PAUSED avant reprise.
Cette attente n'est pas du temps de codage mesuré. La vue sandbox, qui ne
montrait pas ce processus, n'a jamais été utilisée pour conclure à sa fermeture.

Le développeur a ensuite autorisé OpenCode pour les tests. OpenCode 1.19.0
a été lancé uniquement dans une configuration et des données temporaires
isolées, sans appel de fournisseur ou modèle. Les services installés et
l'ancien RUN n'ont pas été repris ni modifiés par ces tests.

## 2. Types de messages et d'outils

| Catégorie | Résultat observé |
|---|---|
| Analyse et éditions | Sources, tests, spécifications, documentation, prompts et protocoles autorisés |
| Réservations concurrentes | Un propriétaire pour un même change ou une même intention ; ressources et dépendances contrôlées |
| Permissions | once exact, corrélation native session/RUN/change/génération ; aucun partage entre RUN |
| Récupération | Candidate et preuves conservées, autres RUN préservés, génération renouvelée après transfert |
| Intégration | Jalon stable de la cohorte, exclusion commune, suspension des nouvelles opérations, réconciliation de référence |
| MCP réel temporaire | 3 validations parallèles dans un seul processus broker et 3 permissions simulées exactes |
| OpenCode natif temporaire | 3 sessions API distinctes et 1 seul broker source 1.0.0 ; pas de travail de modèle |
| Git / commit / push / branche | Non exécutés, aucun état Git inspecté |
| Installation de profil / services | Non exécutées ; seuls des processus de test isolés ont été lancés |
| Sondes et télémétrie de pilotage | Non activées, conformément à SCM |
| Comptes de messages, NDOC, refus humains | N/A, aucune instrumentation exhaustive de SCM |

Des essais intermédiaires ont révélé des attentes de tests encore en 0.87.2
ou avec anciennes routes, un ordre de diagnostic de configuration à préserver,
et le nettoyage/critère d'attente du test MCP temporaire. Ils ont été corrigés ;
les essais interrompus ou échoués ne sont pas comptés comme réussites finales.
La revue de concurrence a ajouté les contrôles de lecture sous verrou,
de contexte persistant, de binding natif et de barrière stable avant publication.

## 3. Fichiers modifiés

| Projet | Chemins du périmètre final |
|---|---:|
| cab | 66 |
| diu | 10 |
| pfd | 10 |
| pixs | 10 |
| pixs-template | 10 |
| pldap | 10 |
| template | 10 |
| tools-codex | 10 |
| Total | 136 |

Hors OpenSpec, le relevé établit 100 fichiers existants modifiés et 16 fichiers
nouveaux : douze sources/tests/référence CAB et quatre protocoles. OpenSpec
ajoute huit références traitées et douze artefacts d'archive, rapport compris.
Les sept références préexistantes sont comprises parmi les fichiers modifiés.
Les onze artefacts du change ont été créés puis déplacés par l'archive CLI.
Aucun autre fichier n'a été renommé ou supprimé dans le périmètre source.

Les fichiers AGENTS.md et DEVOPS.md sont inchangés, avec empreintes conservées.
Les 96 fichiers PROMPTS hors sélection, dont tous les prompts directs, sont
inchangés. Les contrôles portent sur les contenus, sans inspection Git.
Tous les fichiers du manifeste sont contrôlés UTF-8/LF ; le contrôle des motifs
de credentials sur les sources modifiées n'a trouvé aucun ajout correspondant.

<details>
<summary>Manifeste exhaustif des 136 chemins relatifs à /home/devops/datas</summary>

- `cab/.codex/commands/cab.md`
- `cab/BUILD.md`
- `cab/CHANGELOG.md`
- `cab/ORCHESTRATED_CODING.md`
- `cab/PROJECT.md`
- `cab/PROMPTS/ACSMP.md`
- `cab/PROMPTS/ACSP.md`
- `cab/PROMPTS/CISMP.md`
- `cab/PROMPTS/DOPP.md`
- `cab/PROMPTS/ISMP.md`
- `cab/PROMPTS/PPSCP.md`
- `cab/PROMPTS/RSMP.md`
- `cab/PROMPTS/SCMP.md`
- `cab/PROMPTS/SPCMP.md`
- `cab/README.md`
- `cab/TECHNICAL.md`
- `cab/openspec/changes/archive/2026-10-13-add-concurrent-cismp-runs/STATISTIQUES.md`
- `cab/openspec/changes/archive/2026-10-13-add-concurrent-cismp-runs/design.md`
- `cab/openspec/changes/archive/2026-10-13-add-concurrent-cismp-runs/proposal.md`
- `cab/openspec/changes/archive/2026-10-13-add-concurrent-cismp-runs/specs/approval-persistence/spec.md`
- `cab/openspec/changes/archive/2026-10-13-add-concurrent-cismp-runs/specs/approval-workflow/spec.md`
- `cab/openspec/changes/archive/2026-10-13-add-concurrent-cismp-runs/specs/archive-session-statistics/spec.md`
- `cab/openspec/changes/archive/2026-10-13-add-concurrent-cismp-runs/specs/codex-integration-distribution/spec.md`
- `cab/openspec/changes/archive/2026-10-13-add-concurrent-cismp-runs/specs/concurrent-run-coordination/spec.md`
- `cab/openspec/changes/archive/2026-10-13-add-concurrent-cismp-runs/specs/controller-transport/spec.md`
- `cab/openspec/changes/archive/2026-10-13-add-concurrent-cismp-runs/specs/persistent-job-supervision/spec.md`
- `cab/openspec/changes/archive/2026-10-13-add-concurrent-cismp-runs/specs/supervision-remediation/spec.md`
- `cab/openspec/changes/archive/2026-10-13-add-concurrent-cismp-runs/tasks.md`
- `cab/openspec/specs/approval-persistence/spec.md`
- `cab/openspec/specs/approval-workflow/spec.md`
- `cab/openspec/specs/archive-session-statistics/spec.md`
- `cab/openspec/specs/codex-integration-distribution/spec.md`
- `cab/openspec/specs/concurrent-run-coordination/spec.md`
- `cab/openspec/specs/controller-transport/spec.md`
- `cab/openspec/specs/persistent-job-supervision/spec.md`
- `cab/openspec/specs/supervision-remediation/spec.md`
- `cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json`
- `cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs`
- `cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs`
- `cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs`
- `cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs`
- `cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py`
- `cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py`
- `cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py`
- `cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs`
- `cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs`
- `cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs`
- `cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md`
- `cab/plugins/cab-approval-bridge/skills/approval-bridge/references/concurrent-runs.md`
- `cab/plugins/cab-approval-bridge/skills/approval-bridge/references/session-reset.md`
- `cab/plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md`
- `cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service`
- `cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service`
- `cab/pyproject.toml`
- `cab/src/cgpt_approval_bridge_journal.py`
- `cab/src/cgpt_approval_bridge_router.py`
- `cab/src/cgpt_approval_bridge_server.py`
- `cab/tests/concurrent-controller.test.mjs`
- `cab/tests/concurrent-run-registry.test.mjs`
- `cab/tests/concurrent-supervisor.test.mjs`
- `cab/tests/controller-service-distribution.test.mjs`
- `cab/tests/native-opencode.test.mjs`
- `cab/tests/test_concurrent_broker.py`
- `cab/tests/test_crash_recovery.py`
- `cab/tests/test_piloted_prompts.py`
- `cab/tests/test_session_reset.py`
- `diu/ORCHESTRATED_CODING.md`
- `diu/PROMPTS/ACSMP.md`
- `diu/PROMPTS/ACSP.md`
- `diu/PROMPTS/CISMP.md`
- `diu/PROMPTS/DOPP.md`
- `diu/PROMPTS/ISMP.md`
- `diu/PROMPTS/PPSCP.md`
- `diu/PROMPTS/RSMP.md`
- `diu/PROMPTS/SCMP.md`
- `diu/PROMPTS/SPCMP.md`
- `pfd/ORCHESTRATED_CODING.md`
- `pfd/PROMPTS/ACSMP.md`
- `pfd/PROMPTS/ACSP.md`
- `pfd/PROMPTS/CISMP.md`
- `pfd/PROMPTS/DOPP.md`
- `pfd/PROMPTS/ISMP.md`
- `pfd/PROMPTS/PPSCP.md`
- `pfd/PROMPTS/RSMP.md`
- `pfd/PROMPTS/SCMP.md`
- `pfd/PROMPTS/SPCMP.md`
- `pixs-template/ORCHESTRATED_CODING.md`
- `pixs-template/PROMPTS/ACSMP.md`
- `pixs-template/PROMPTS/ACSP.md`
- `pixs-template/PROMPTS/CISMP.md`
- `pixs-template/PROMPTS/DOPP.md`
- `pixs-template/PROMPTS/ISMP.md`
- `pixs-template/PROMPTS/PPSCP.md`
- `pixs-template/PROMPTS/RSMP.md`
- `pixs-template/PROMPTS/SCMP.md`
- `pixs-template/PROMPTS/SPCMP.md`
- `pixs/ORCHESTRATED_CODING.md`
- `pixs/PROMPTS/ACSMP.md`
- `pixs/PROMPTS/ACSP.md`
- `pixs/PROMPTS/CISMP.md`
- `pixs/PROMPTS/DOPP.md`
- `pixs/PROMPTS/ISMP.md`
- `pixs/PROMPTS/PPSCP.md`
- `pixs/PROMPTS/RSMP.md`
- `pixs/PROMPTS/SCMP.md`
- `pixs/PROMPTS/SPCMP.md`
- `pldap/ORCHESTRATED_CODING.md`
- `pldap/PROMPTS/ACSMP.md`
- `pldap/PROMPTS/ACSP.md`
- `pldap/PROMPTS/CISMP.md`
- `pldap/PROMPTS/DOPP.md`
- `pldap/PROMPTS/ISMP.md`
- `pldap/PROMPTS/PPSCP.md`
- `pldap/PROMPTS/RSMP.md`
- `pldap/PROMPTS/SCMP.md`
- `pldap/PROMPTS/SPCMP.md`
- `template/ORCHESTRATED_CODING.md`
- `template/PROMPTS/ACSMP.md`
- `template/PROMPTS/ACSP.md`
- `template/PROMPTS/CISMP.md`
- `template/PROMPTS/DOPP.md`
- `template/PROMPTS/ISMP.md`
- `template/PROMPTS/PPSCP.md`
- `template/PROMPTS/RSMP.md`
- `template/PROMPTS/SCMP.md`
- `template/PROMPTS/SPCMP.md`
- `tools-codex/ORCHESTRATED_CODING.md`
- `tools-codex/PROMPTS/ACSMP.md`
- `tools-codex/PROMPTS/ACSP.md`
- `tools-codex/PROMPTS/CISMP.md`
- `tools-codex/PROMPTS/DOPP.md`
- `tools-codex/PROMPTS/ISMP.md`
- `tools-codex/PROMPTS/PPSCP.md`
- `tools-codex/PROMPTS/RSMP.md`
- `tools-codex/PROMPTS/SCMP.md`
- `tools-codex/PROMPTS/SPCMP.md`

</details>

## 4. Commandes

Dernière passe de tests :

| Commande | Tests | Résultat |
|---|---:|---|
| `node tests/concurrent-run-registry.test.mjs` | 11 | Réussie |
| `node tests/concurrent-controller.test.mjs` | 8 | Réussie |
| `node tests/concurrent-supervisor.test.mjs` | 1 | Réussie |
| `node tests/controller-configuration.test.mjs` | 13 | Réussie |
| `node tests/controller-job-restoration.test.mjs` | 27 | Réussie |
| `node tests/controller-healthcheck-compatibility.test.mjs` | 6 | Réussie |
| `node tests/controller-service-distribution.test.mjs` | 13 | Réussie |
| `node tests/controller-session-recovery.test.mjs` | 16 | Réussie |
| `node tests/persistent-job-supervisor.test.mjs` | 11 | Réussie |
| `python3 -m unittest discover -s tests -p 'test_*.py'` | 48 | Réussie |
| `CAB_TEST_OPENCODE=/home/devops/.opencode/bin/opencode node tests/native-opencode.test.mjs` | 1 | Réussie |
| Total | 155 | Réussie |

Autres validations exécutées et réussies :

- python3 -m py_compile : dix fichiers Python modifiés.
- node --check : sept modules JavaScript distribués.
- Mise à jour des prompts en revue seule après application : aucune modification proposée.
- Contrôles d'empreintes, périmètre, UTF-8/LF et motifs de credentials.
- /home/devops/.opencode/bin/opencode --version : 1.19.0.
- /home/devops/.local/npm/bin/openspec validate add-concurrent-cismp-runs --strict avant archivage.
- /home/devops/.local/npm/bin/openspec archive add-concurrent-cismp-runs --yes : exit 0.
- /home/devops/.local/npm/bin/openspec validate --all --strict : 8/8 après corrections documentaires.

L'archivage a ajouté 15 exigences, modifié 6 exigences et créé la capacité
concurrent-run-coordination. Aucun retrait ni renommage d'exigence.
L'avertissement de conseil « plus de 10 deltas » était non bloquant : le change
transverse conserve un contrat et une version communs, avec lots de tâches
distincts et testés.

Le premier contrôle strict après archive a détecté un Purpose auto-généré
placeholder et une exigence allongée après fusion. Le Purpose a été rédigé et
l'obligation de création de session déplacée dans son scénario sans changer
son comportement. Les références et le delta de cette archive sont alignés.
Le contrôle final est 8/8 ; il n'y a pas eu de second archivage.

Le détail exhaustif des commandes exploratoires, des contrôles de processus
et des répétitions n'est pas instrumenté : N/A. Aucun résultat non exécuté
n'est présenté comme réussi.

## 5. Accès web

Documentation primaire consultée pour la séparation contexte/MCP et le test natif :

- [Serveur OpenCode](https://docs.opencode.ai/docs/server/)
- [Configuration OpenCode](https://docs.opencode.ai/docs/config/)
- [MCP local OpenCode](https://docs.opencode.ai/docs/mcp-servers/)
- [CLI et variables OpenCode](https://docs.opencode.ai/docs/cli/)
- [MCP OpenCode 1.19.0](https://raw.githubusercontent.com/anomalyco/opencode/v1.19.0/packages/opencode/src/mcp/index.ts)
- [État par contexte OpenCode 1.19.0](https://raw.githubusercontent.com/anomalyco/opencode/v1.19.0/packages/opencode/src/effect/instance-state.ts)

Des chemins de source dev/flag/global ont répondu 404 ; ils n'ont pas servi
de preuve positive. Nombre exhaustif de requêtes et octets transférés : N/A.
Aucun accès web n'a servi à envoyer du code du projet, des données de session
ou un secret à un service tiers.

## 6. Synthèse globale

L'objectif source CAB 1.0.0 est livré et ce seul change est archivé. Le broker
unique et le contexte OpenCode commun servent plusieurs sessions ; le registre
attribue exclusivement les changes et intentions et contrôle les ressources.
Les permissions, décisions, reprises et gates restent séparés. La publication
commune attend un jalon stable et réconcilie les autres RUN après évolution
de référence. Le quota de compte et les autres mesures communes ne sont pas
attribués arbitrairement à un change.

La compatibilité historique conserve ses interfaces pour un contexte unique ;
un ancien job armé doit être réconcilié avant admission concurrente. La reprise
des anciens checkpoints est explicitement décrite. Les 72 prompts pilotés et
huit protocoles sont synchronisés ; CISM, CAISM et les prompts directs restent
exclus et préservés.

Bilan documentaire détaillé : tasks.md de cette archive, matrice par fichier.
PROJECT.md, TECHNICAL.md, BUILD.md, README.md, CHANGELOG.md, commande, skills,
protocole et OpenSpec sont mis à jour. AGENTS.md et DEVOPS.md sont inchangés
avec justification et preuve d'empreinte. Aucun document obligatoire n'est absent.

Limites : profil à un contexte de répertoire partagé ; worktrees, charge au-delà
des trois sessions testées et codage réel avec appels de modèle ne sont pas
qualifiés par cette SCM. Aucun déploiement, installation utilisateur, opération
Git ou publication de release n'a été effectué. Le test natif est terminé et
ses processus temporaires ont été fermés. Les métriques de tokens, quotas et
messages restent N/A motivées. Aucun blocage restant dans le périmètre validé.
