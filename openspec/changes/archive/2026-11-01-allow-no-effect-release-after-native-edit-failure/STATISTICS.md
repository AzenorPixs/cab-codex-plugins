### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent OpenCode identifié comme auteur du change CAB | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex orchestrateur | N/A — télémétrie exacte non exposée | N/A | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

| Mesure | Valeur | Part / cause |
|---|---:|---|
| Durée calendaire complète | N/A | Heure de début SCM non collectée |
| Messages, appels d’outils et décisions | N/A | Aucun export exhaustif de télémétrie |
| Node.js | 706 réussis / 737 | 95,8 % réussis ; 31 ignorés (4,2 %) ; 0 échec |
| Python | 87 réussis / 87 | 100 % ; 0 échec |
| OpenSpec strict | 17 réussies / 17 | 100 % ; 0 échec avant archivage |
| Archives strictes | 118 réussies / 118 | 100 % ; 0 échec après archivage |
| C12, accès après échec natif edit | RELEASED / NO_EFFECT | Confirmation de session après CABU 2.1.52 ; révision/hash inchangés, aucune édition ou once rejouée |
| Tokens, cache, coût, TTMT et débit | N/A | Télémétrie d’agent absente |

Les dénominateurs des suites sont indépendants et ne sont pas additionnés. Le
reçu d'accès RELEASED et la reprise rapportée par son propriétaire sont des
preuves runtime distinctes des tests locaux.

## 2. Types de messages et d’outils

N/A — session SCM directe sans export complet des messages, rôles, parties,
terminaisons, refus et décisions. Aucun total n’est reconstruit à partir des
sorties de commande.

## 3. Fichiers modifiés

Un commit source versionné 2.1.52 couvre 77 chemins versionnés distincts, hors `DEVOPS.md` généré. Les nombres
d’écritures autorisées, refusées et en erreur par chemin sont N/A faute de
journal exhaustif. Les chemins ci-dessous sont ceux du diff SCM, pas un
comptage d’appels d’édition.

| Chemin relatif | Écritures approuvées | Refusées | Erreurs |
|---|---:|---:|---:|
| `.codex/commands/CAB.md` | N/A | N/A | N/A |
| `.codex/commands/CABU.md` | N/A | N/A | N/A |
| `BUILD.md` | N/A | N/A | N/A |
| `CHANGELOG.md` | N/A | N/A | N/A |
| `DEVELOPMENT_MAP.md` | N/A | N/A | N/A |
| `PROJECT.md` | N/A | N/A | N/A |
| `README.md` | N/A | N/A | N/A |
| `TECHNICAL.md` | N/A | N/A | N/A |
| `openspec/changes/allow-no-effect-release-after-native-edit-failure/.openspec.yaml` | N/A | N/A | N/A |
| `openspec/changes/allow-no-effect-release-after-native-edit-failure/README.md` | N/A | N/A | N/A |
| `openspec/changes/allow-no-effect-release-after-native-edit-failure/design.md` | N/A | N/A | N/A |
| `openspec/changes/allow-no-effect-release-after-native-edit-failure/proposal.md` | N/A | N/A | N/A |
| `openspec/changes/allow-no-effect-release-after-native-edit-failure/specs/concurrent-run-coordination/spec.md` | N/A | N/A | N/A |
| `openspec/changes/allow-no-effect-release-after-native-edit-failure/tasks.md` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/.codex-plugin/plugin.json` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/broker/cgpt_approval_bridge_journal.py` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/broker/cgpt_approval_bridge_router.py` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/broker/cgpt_approval_bridge_server.py` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-approval-metadata.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-artifact-proof.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-context-portability.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-forward-repair.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-import-observations.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-transition.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-management.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-policy.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prepare-model-policy.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-provider-connect.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-stage.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-source-read.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update-credential.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/skills/approval-bridge/references/component-update.md` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/skills/approval-bridge/references/concurrent-runs.md` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/skills/approval-bridge/references/monitor-service.md` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/skills/approval-bridge/references/native-coding-recovery.md` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-monitor.service` | N/A | N/A | N/A |
| `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service` | N/A | N/A | N/A |
| `plugins/cabu/.codex-plugin/plugin.json` | N/A | N/A | N/A |
| `pyproject.toml` | N/A | N/A | N/A |
| `src/cgpt_approval_bridge_journal.py` | N/A | N/A | N/A |
| `src/cgpt_approval_bridge_router.py` | N/A | N/A | N/A |
| `src/cgpt_approval_bridge_server.py` | N/A | N/A | N/A |
| `tests/active-component-update.test.mjs` | N/A | N/A | N/A |
| `tests/concurrent-controller.test.mjs` | N/A | N/A | N/A |
| `tests/controller-service-distribution.test.mjs` | N/A | N/A | N/A |
| `tests/maintenance-bootstrap.test.mjs` | N/A | N/A | N/A |
| `tests/monitor-service-start.test.mjs` | N/A | N/A | N/A |
| `tests/native-opencode.test.mjs` | N/A | N/A | N/A |
| `tests/resource-coordination.test.mjs` | N/A | N/A | N/A |
| `tests/test_crash_recovery.py` | N/A | N/A | N/A |
| `tests/test_session_reset.py` | N/A | N/A | N/A |
| `tests/web-monitor.test.mjs` | N/A | N/A | N/A |

## 4. Commandes

Décompte exhaustif des commandes et refus : N/A. Vérifications qualifiantes
observées :

- `node --test --test-concurrency=1 tests/*.test.mjs` — 706/737 réussis, 31 ignorés, aucun échec.
- `python3 -m unittest discover -s tests -v` — 87/87 réussis.
- `openspec validate --all --strict --no-interactive` — 17/17 réussis.
- `openspec validate --archived --strict --no-interactive` — 118/118 réussis.
- Vérifications syntaxe Node, compilation Python, concordance des modules broker et `git diff --check` — réussies.
- CABU 2.1.52 — `COMPLETED`, quatre composants alignés et broker connecté/READY.
- Le propriétaire C12 a confirmé la restitution `NO_EFFECT` sur l’accès existant ; aucune permission ou commande n’a été rejouée.

## 5. Accès web

N/A — aucune consultation web n'a servi à la qualification de ce change.

## 6. Synthèse globale

| Indicateur | Valeur |
|---|---|
| Début de session | N/A — relevé initial absent |
| Fin de qualification runtime | CABU 2.1.52 terminé ; contrôleur, superviseur, monitor et broker vérifiés en 2.1.52 |
| Durée globale | N/A — début vérifiable absent |
| Quota Codex avant / après | N/A — relevés absents |
| Chemins SCM distincts | 77 |
| Version source publiée | 2.1.52 |
| Résultat propriétaire | C12 confirme `RELEASED` / `NO_EFFECT`, fencing 13578, révision attendue/courante 13575, empreinte identique |
| RUN et permissions | L’accès libéré sans replay ; le propriétaire reprend son RUN |

Résultat : l’issue native d’un edit en erreur est distinguée de la fin technique.
`NO_EFFECT` a été rendu après relecture du transcript exact et vérification des
révisions, sans incrément de révision ni `pendingWrite`. Les issues réussies,
les erreurs shell, les révisions divergentes et les preuves manquantes,
dupliquées ou divergentes restent bloquantes.
