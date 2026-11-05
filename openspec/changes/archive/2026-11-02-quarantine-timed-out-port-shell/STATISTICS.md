### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent de codage OpenCode identifiable — session SCM directe | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex orchestrateur | N/A — télémétrie de version indisponible | OpenAI | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

- Change : `quarantine-timed-out-port-shell`, archive `2026-11-02-quarantine-timed-out-port-shell`, CAB 2.1.81.
- Session SCM directe ; aucun RUN CAB métier ni permission native `once` n’a été lancé pour ce change.
- Tests finaux : Node 778/809 réussis, 31 ignorés, 0 échec ; Python 87/87 réussis ; OpenSpec strict 18/18 avant archive et 17/17 après.
- Tokens, cache, coût, compactions, TTMT et débit : N/A — télémétrie de cette session SCM directe non disponible. Les sondes périodiques ne s’appliquent pas à cette session.
- Le correctif conserve l’opération shell timeoutée et le verrou port write ; il ajoute seulement une voie read même RUN sous quarantine vérifiée.

## 2. Types de messages et d’outils

- Totaux par rôle, type d’outil, approbation et résultat : N/A — export agrégé complet de la conversation indisponible.
- Refus de permission CAB : 0 observé dans cette session. Erreurs de vérification : un timeout initial de fixture lors du premier run Node, réussi au test isolé puis dans le run complet de confirmation ; non compté comme refus.

## 3. Fichiers modifiés

- 80 chemins observés au diff, dans l’archive ou dans le présent rapport. Répartition : Cadrage et métadonnées 7 (8.8%), Code et plugins 52 (65.0%), Commandes 2 (2.5%), OpenSpec 8 (10.0%), Tests 11 (13.8%).
- Le nombre de tentatives d’écriture approuvées/refusées/en erreur par fichier est N/A : la télémétrie d’écriture par chemin n’est pas disponible. Les chemins ci-dessous correspondent aux fichiers modifiés, archivés ou au rapport.

| Chemin absolu | État observé |
|---|---|
| `/home/devops/datas/cab/.codex/commands/CAB.md` | Modifié ou archivé |
| `/home/devops/datas/cab/.codex/commands/CABU.md` | Modifié ou archivé |
| `/home/devops/datas/cab/BUILD.md` | Modifié ou archivé |
| `/home/devops/datas/cab/CHANGELOG.md` | Modifié ou archivé |
| `/home/devops/datas/cab/DEVOPS.md` | Modifié ou archivé |
| `/home/devops/datas/cab/PROJECT.md` | Modifié ou archivé |
| `/home/devops/datas/cab/README.md` | Modifié ou archivé |
| `/home/devops/datas/cab/TECHNICAL.md` | Modifié ou archivé |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-quarantine-timed-out-port-shell/STATISTICS.md` | Modifié ou archivé |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-quarantine-timed-out-port-shell/design.md` | Modifié ou archivé |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-quarantine-timed-out-port-shell/proposal.md` | Modifié ou archivé |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-quarantine-timed-out-port-shell/specs/concurrent-run-coordination/spec.md` | Modifié ou archivé |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-quarantine-timed-out-port-shell/tasks.md` | Modifié ou archivé |
| `/home/devops/datas/cab/openspec/specs/codex-integration-distribution/spec.md` | Modifié ou archivé |
| `/home/devops/datas/cab/openspec/specs/concurrent-run-coordination/spec.md` | Modifié ou archivé |
| `/home/devops/datas/cab/openspec/specs/opencode-v2-transport/spec.md` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_journal.py` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_router.py` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_server.py` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-approval-metadata.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-artifact-proof.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-context-portability.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-forward-repair.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-import-observations.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-transition.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-management.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-policy.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prepare-model-policy.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-provider-connect.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-stage.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-source-read.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update-credential.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/component-update.md` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/concurrent-runs.md` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/monitor-service.md` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/native-coding-recovery.md` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-monitor.service` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service` | Modifié ou archivé |
| `/home/devops/datas/cab/plugins/cabu/.codex-plugin/plugin.json` | Modifié ou archivé |
| `/home/devops/datas/cab/pyproject.toml` | Modifié ou archivé |
| `/home/devops/datas/cab/src/cgpt_approval_bridge_journal.py` | Modifié ou archivé |
| `/home/devops/datas/cab/src/cgpt_approval_bridge_router.py` | Modifié ou archivé |
| `/home/devops/datas/cab/src/cgpt_approval_bridge_server.py` | Modifié ou archivé |
| `/home/devops/datas/cab/tests/active-component-update.test.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/tests/concurrent-controller.test.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/tests/controller-service-distribution.test.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/tests/helpers/opencode-v2-test-server.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/tests/maintenance-bootstrap.test.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/tests/monitor-service-start.test.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/tests/native-opencode.test.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/tests/resource-coordination.test.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/tests/test_crash_recovery.py` | Modifié ou archivé |
| `/home/devops/datas/cab/tests/test_session_reset.py` | Modifié ou archivé |
| `/home/devops/datas/cab/tests/web-monitor.test.mjs` | Modifié ou archivé |

## 4. Commandes

| Vérification ou opération | Résultat |
|---|---|
| `node --check` contrôleur et registre de coordination | Réussi |
| Test ciblé timeout quarantine HTTP | Réussi, parcours positif, stale digest, session/permission, persistance, partage same-RUN et refus des conflits |
| Test ciblé registre timeout quarantine | Réussi, read same-RUN accepté ; write et RUN étrangers en attente |
| `node --test tests/*.test.mjs` | 778 réussis, 31 ignorés, 0 échec sur 809 |
| `pytest -q tests` | 87 réussis |
| `npx --yes @fission-ai/openspec@latest validate --all --strict` avant archive | 18/18 réussis |
| `npx --yes @fission-ai/openspec@latest archive quarantine-timed-out-port-shell --yes` | Archivé ; deux deltas appliqués |
| Validation OpenSpec stricte après archive | 17/17 réussis |
| Première suite Node complète | Un timeout de démarrage de fixture ; le test a réussi isolément puis la suite de confirmation a réussi |
| Publication Git et CABU | En attente au moment de la rédaction de ce rapport |

## 5. Accès web

- Recherche web et navigation d’application : 0 pendant cette session SCM. URL visitée ou refusée : aucune.
- Aucun secret, credential ou fichier sensible n’a été consulté par cette session.

## 6. Synthèse globale

| Domaine vérifiable | Total | Réussi | Ignoré | Échec |
|---|---:|---:|---:|---:|
| Tests Node | 809 (100 %) | 778 (96,2 %) | 31 (3,8 %) | 0 (0 %) |
| Tests Python | 87 (100 %) | 87 (100 %) | 0 (0 %) | 0 (0 %) |
| Tests cumulés Node + Python | 896 (100 %) | 865 (96,5 %) | 31 (3,5 %) | 0 (0 %) |
| Validation OpenSpec après archive | 17 (100 %) | 17 (100 %) | 0 (0 %) | 0 (0 %) |

| Durée de la session de codage | Valeur |
|---|---|
| Début | 2026-11-02 14:35:59 CET |
| Fin — après archivage | 2026-11-02 15:18:09 CET |
| Durée globale (pauses et attentes incluses) | 00 h 42 min 10 s |

| Mesure du quota Codex sur 7 jours | Horodatage du relevé | Quota utilisé | Réinitialisation |
|---|---|---:|---|
| Avant — début de session | N/A — session SCM directe, relevé non collecté | N/A | N/A |
| Après — après archivage | N/A — session SCM directe, relevé non collecté | N/A | N/A |
| Différence après − avant | — | N/A | — |

Le quota partagé et sa variation n’ont pas été mesurés et ne sont pas attribués à cette session. Au moment de rédaction, le change est qualifié et archivé ; commit, publication et CABU restent en attente. Aucun test métier C12 n’a été exécuté ici, aucune permission `once` n’a été rejouée et aucun secret n’a été consulté.
