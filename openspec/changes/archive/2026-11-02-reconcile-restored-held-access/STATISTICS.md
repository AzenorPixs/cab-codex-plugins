### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent de codage OpenCode identifiable — session SCM directe | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Codex orchestrateur | N/A — non exposée par la télémétrie disponible | OpenAI | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

- Change : `reconcile-restored-held-access`, archive `2026-11-02-reconcile-restored-held-access`, CAB 2.1.80.
- Session SCM directe ; aucun RUN CAB, agent de codage OpenCode, permission native ou `once` n’a été lancé pour ce change.
- Résultats finaux : Node 776/807 réussis, 31 ignorés, 0 échec ; Python 87/87 réussis ; OpenSpec strict 18/18 avant archive et 17/17 après archive.
- Tokens d’entrée/sortie, cache, coût, compactions, TTMT et débit : N/A — télémétrie de cette session directe non disponible. Les sondes statistiques ne s’appliquent pas à une session SCM directe.
- Décisions humaines : mandat SCM, incrément de version et CABU autorisés dans le contexte actif ; aucune permission CAB native utilisée.

## 2. Types de messages et d’outils

- Répartition par rôle, partie de message, agent, type d’outil et résultat d’approbation : N/A — l’historique disponible ici ne fournit pas un export agrégé complet. Aucun refus de permission CAB ou accès web n’a été observé.
- Les erreurs techniques de validation intermédiaires et leurs reprises sont décrites en section 4 ; elles ne sont pas comptées comme refus.

## 3. Fichiers modifiés

- 79 chemins apparaissent dans le diff ou l’archive (rapport compris). Par catégorie : Cadrage et métadonnées 6 (7.6%), Code et plugins 52 (65.8%), Commandes 2 (2.5%), OpenSpec 10 (12.7%), Tests 9 (11.4%).
- Le nombre de tentatives d’écriture approuvées/refusées/en erreur par fichier est N/A : cette télémétrie n’est pas exposée dans cette session SCM. Les chemins ci-dessous sont les changements effectivement observés dans le diff et l’archive.

| Chemin absolu | État observé |
|---|---|
| `/home/devops/datas/cab/.codex/commands/CAB.md` | Modifié ou archivé |
| `/home/devops/datas/cab/.codex/commands/CABU.md` | Modifié ou archivé |
| `/home/devops/datas/cab/BUILD.md` | Modifié ou archivé |
| `/home/devops/datas/cab/CHANGELOG.md` | Modifié ou archivé |
| `/home/devops/datas/cab/PROJECT.md` | Modifié ou archivé |
| `/home/devops/datas/cab/README.md` | Modifié ou archivé |
| `/home/devops/datas/cab/TECHNICAL.md` | Modifié ou archivé |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-reconcile-restored-held-access/.openspec.yaml` | Modifié ou archivé |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-reconcile-restored-held-access/README.md` | Modifié ou archivé |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-reconcile-restored-held-access/STATISTICS.md` | Modifié ou archivé |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-reconcile-restored-held-access/design.md` | Modifié ou archivé |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-reconcile-restored-held-access/proposal.md` | Modifié ou archivé |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-reconcile-restored-held-access/specs/concurrent-run-coordination/spec.md` | Modifié ou archivé |
| `/home/devops/datas/cab/openspec/changes/archive/2026-11-02-reconcile-restored-held-access/tasks.md` | Modifié ou archivé |
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
| `/home/devops/datas/cab/tests/maintenance-bootstrap.test.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/tests/monitor-service-start.test.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/tests/native-opencode.test.mjs` | Modifié ou archivé |
| `/home/devops/datas/cab/tests/test_crash_recovery.py` | Modifié ou archivé |
| `/home/devops/datas/cab/tests/test_session_reset.py` | Modifié ou archivé |
| `/home/devops/datas/cab/tests/web-monitor.test.mjs` | Modifié ou archivé |

## 4. Commandes

| Vérification ou opération | Résultat |
|---|---|
| `node --check` contrôleur et registre de coordination | Réussi |
| `node --test tests/*.test.mjs` | 776 réussis, 31 ignorés, 0 échec sur 807 |
| `pytest -q tests` | 87 réussis |
| `npx --yes @fission-ai/openspec@latest validate --all --strict` avant archive | 18/18 réussis |
| `npx --yes @fission-ai/openspec@latest archive reconcile-restored-held-access --yes` | Archivé ; delta appliqué |
| Validation OpenSpec stricte après archive | 17/17 réussis |
| Première collecte `pytest -q` à la racine | Échec de collecte : doublons de modules dans les artefacts historiques sous `output/`; relance ciblée `pytest -q tests` réussie |
| Première invocation `openspec validate` sans CLI installé | Commande indisponible ; validation exécutée via `npx` |
| Première validation complète Node pendant exécution parallèle | Échecs de fixture/version attendue ; références mises à jour, puis suite complète finale réussie |
| Publication Git, CICD et CABU | En attente au moment de rédaction de ce rapport |

## 5. Accès web

- Accès web via navigateur ou outil de recherche : 0. URL approuvée, refusée ou visitée : aucune.
- Le validateur OpenSpec a été exécuté via `npx` et le registre npm ; ce téléchargement est rapporté comme commande, pas comme navigation web.

## 6. Synthèse globale

| Domaine vérifiable | Total | Réussi | Ignoré | Échec |
|---|---:|---:|---:|---:|
| Tests Node | 807 (100 %) | 776 (96,2 %) | 31 (3,8 %) | 0 (0 %) |
| Tests Python | 87 (100 %) | 87 (100 %) | 0 (0 %) | 0 (0 %) |
| Tests cumulés Node + Python | 894 (100 %) | 863 (96,5 %) | 31 (3,5 %) | 0 (0 %) |
| Validation OpenSpec finale | 17 (100 %) | 17 (100 %) | 0 (0 %) | 0 (0 %) |

| Durée de la session de codage | Valeur |
|---|---|
| Début | 2026-11-02 11:07:03 Europe/Paris — horodatage du tour Codex |
| Fin — après archivage | 2026-11-02 13:41:28 Europe/Paris — horodatage après archivage |
| Durée globale (pauses et attentes incluses) | 02 h 34 min 25 s |

| Mesure du quota Codex sur 7 jours | Horodatage du relevé | Quota utilisé | Réinitialisation |
|---|---|---:|---|
| Avant — début de session | N/A — session SCM directe, relevé non collecté | N/A | N/A |
| Après — après archivage | N/A — session SCM directe, relevé non collecté | N/A | N/A |
| Différence après − avant | — | N/A | — |

La variation de quota partagée n’est pas mesurée et ne peut pas être attribuée à cette session. Le rapport a été produit après l’archivage. Au moment de sa rédaction, le dépôt source est qualifié, mais commit/publication et activation CABU restent en attente ; aucun effet métier n’a été exécuté. Aucun secret n’a été consulté ni ajouté au dépôt.
