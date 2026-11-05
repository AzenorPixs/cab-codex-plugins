# Statistiques du change

### Agents de codage — relevé sgs-cab-2.3.2-scm-final-01

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A | OpenAI | N/A | N/A | N/A | N/A |

### Agents orchestrateurs — relevé sgs-cab-2.3.2-scm-final-01

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

### Relevé sgs-cab-2.3.2-scm-final-01

Change archivé ; mesures limitées aux preuves de ce relevé.

Portée : cumulative.

Agent coder : codex, modèle N/A, raisonnement N/A.

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Durée globale | 3586 | Étendue calendaire du mandat commun CAB/prompts ; interruption incluse, durée active non mesurée |
| Durée hors pauses et attentes | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tokens d’entrée | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tokens de sortie | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tokens de raisonnement | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tokens de cache lus | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tokens de cache écrits | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Total natif des tokens | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Compactions achevées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Demandes d’autorisation distinctes | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Demandes approuvées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Demandes refusées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Demandes expirées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Demandes annulées | N/A | Mesure absente ou périmètre exhaustif non identifiable |

| Élément documenté | Valeur | Preuve |
| --- | --- | --- |
| Périmètre | Quatre corrections, suivi à l’amorçage avec deux rôles et nettoyage terminal statistique | proposal.md et QUALIFICATION.md |
| Archivage | Archive normale réussie, sans saut de validation | openspec/changes/archive/2026-11-06-fix-sgs-report-isolation-and-compatibility |
| Session | Codex codeur direct ; aucun orchestrateur ou RUN CAB créé pour ce mandat | Métadonnées natives, SESSION_OBSERVATION.json |

#### Qualification et périmètres distincts

| Contrôle | Résultat | Preuve |
| --- | --- | --- |
| Python CAB | 193réussis | output/sgs-fixes-2.3.2/python-final-results.txt |
| Node CAB | 1319cas,31ignorés ;1288verdicts exécutés finaux réussis | qualification-campaign.json : suite complète1287pass/1fail puis cas de fixture corrigé et revalidé |
| SGS ciblé | 57réussis, inclus dans193Python | test_sgs.py |
| Distribution/nettoyage | 85contrôles ciblés réussis, sans addition au total | Node ciblé, états TERMINÉ et BLOQUÉ |
| Navigateurs | Chromium/Firefox réussis | web-monitor-browser-results.json |
| Prompts | 12/12contrats cohérents, amorçage et nettoyage inclus | output/sgs-contracts-1.0.3/contract-results.json |
| OpenSpec | CAB22éléments, prompts6 avant archive ; commandes strictes réussies | Qualification locale ; éléments distincts des exécutions |
| Archive cab | 2026-11-06-fix-sgs-report-isolation-and-compatibility | OpenSpec archive --yes --json, specsUpdated=true |

La qualification finale conserve les campagnes en échec et les reprises. Aucun code de retour non nul n’est transformé en réussite. La suite complète Node et la reprise ciblée du cas modifié sont deux exécutions distinctes.

## 2. Types de messages et d’outils

### Relevé sgs-cab-2.3.2-scm-final-01

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Messages des codeurs | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Messages utilisateur | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Messages assistant | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels d’outils des codeurs | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels terminés | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Erreurs techniques | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels en cours | N/A | Mesure absente ou périmètre exhaustif non identifiable |

Les rôles sont identifiés depuis le départ du suivi ; cette session directe n’ajoute aucun orchestrateur fictif. La mesure native non disponible reste N/A.

## 3. Fichiers modifiés

### Relevé sgs-cab-2.3.2-scm-final-01

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Écritures effectivement exécutées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Fichiers distincts touchés par change | N/A | Mesure absente ou périmètre exhaustif non identifiable |

#### Fichiers suivis amendés dans le projet au relevé

| Chemin | Portée |
| --- | --- |
| /home/devops/datas/cab/.codex/commands/CAB.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/.codex/commands/CABU.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/.codex/commands/SGS.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/BUILD.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/CHANGELOG.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/DEVELOPMENT_MAP.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/DEVOPS.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/PROJECT.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/README.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/TECHNICAL.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/openspec/BATCH_CODES.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/openspec/specs/concurrent-run-coordination/spec.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/openspec/specs/global-project-statistics/spec.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_journal.py | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_router.py | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_server.py | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cab_sgs.py | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-approval-metadata.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-artifact-proof.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-cleanup.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-context-portability.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-continuity.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-efficiency.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-erasure-manager.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-forward-repair.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-import-observations.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-manifest-extensions.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-transition.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-management.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-native-instances.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-policy.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-replies.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-port-recovery.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prepare-model-policy.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-provider-connect.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-recovery-evidence.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-recovery.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runtime-migration.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-lifecycle.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-stage.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-source-read.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-state-layout.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update-credential.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/change-erasure.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/distribution-validation.json | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/protocol-coordination.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/protocol-lifecycle.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/technical-mandates.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/sgs/SKILL.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/sgs/references/schema.md | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-monitor.service | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/plugins/cabu/.codex-plugin/plugin.json | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/pyproject.toml | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/src/cgpt_approval_bridge_journal.py | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/src/cgpt_approval_bridge_router.py | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/src/cgpt_approval_bridge_server.py | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/active-component-update.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/approval-metadata.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/autonomous-recovery.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/change-erasure.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/concurrent-controller.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/concurrent-run-registry.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/controller-service-distribution.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/maintenance-bootstrap.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/monitor-service-start.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/native-instances.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/native-opencode.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/opencode-v2-client.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/protocol-continuity.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/provider-connect.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/resource-coordination.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/shell-lifecycle.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/test_crash_recovery.py | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/test_session_reset.py | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/test_sgs.py | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/web-monitor-browser.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |
| /home/devops/datas/cab/tests/web-monitor.test.mjs | Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet |

## 4. Commandes

### Relevé sgs-cab-2.3.2-scm-final-01

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Commandes exécutées | N/A | Les exécutions observées couvrent le mandat commun aux deux projets ; aucune ventilation exclusive par change n’est établie. Voir la liste native conservée. |
| Commandes réussies | N/A | Les exécutions observées couvrent le mandat commun aux deux projets ; aucune ventilation exclusive par change n’est établie. Voir la liste native conservée. |
| Commandes en échec | N/A | Les exécutions observées couvrent le mandat commun aux deux projets ; aucune ventilation exclusive par change n’est établie. Voir la liste native conservée. |
| Tests exécutés dans le bilan final | 1481 | 193 tests Python et1288verdicts Node finaux ;31ignorés exclus et reprises non additionnées ; qualification-campaign.json conserve le code brut1 de la suite et la contre-vérification du seul cas corrigé |
| Tests finaux réussis | 1481 | 193 tests Python et1288verdicts Node finaux ;31ignorés exclus et reprises non additionnées ; qualification-campaign.json conserve le code brut1 de la suite et la contre-vérification du seul cas corrigé |
| Tests finaux échoués | 0 | 193 tests Python et1288verdicts Node finaux ;31ignorés exclus et reprises non additionnées ; qualification-campaign.json conserve le code brut1 de la suite et la contre-vérification du seul cas corrigé |
| Fichiers ayant passé un contrôle syntaxique | 24 | 193 tests Python et1288verdicts Node finaux ;31ignorés exclus et reprises non additionnées ; qualification-campaign.json conserve le code brut1 de la suite et la contre-vérification du seul cas corrigé |
| Validations OpenSpec standard réussies | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Validations OpenSpec standard échouées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Validations OpenSpec strictes réussies | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Validations OpenSpec strictes échouées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tâches OpenSpec prouvées et terminées | 7 | Sept tâches validées sur leurs critères ; voir tasks.md et QUALIFICATION.md |

#### Commandes natives du mandat commun, aperçus bornés

| Identifiant | Tour | Aperçu | Code | État |
| --- | --- | --- | --- | --- |
| exec-51be46d2-cb63-4be9-a5ed-cd82865a3736 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'git status --short \| head -12' | 0 | completed |
| exec-1b926f94-5180-4b7c-9d47-924dc304b54d | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'ls output/sgs-fixes-2.3.2; test ! -f output/sgs-fixes-2.3.2/node-results.json \|\| cat output/sgs-fixes- | 0 | completed |
| exec-6d4abe57-1235-4f2d-8da7-92fbb5c4a8c1 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess p=Path('output/sgs-fixes-2.3.2/node-tes | 0 | completed |
| exec-f6d12ee4-1f8d-47a2-8a39-e6108b03d370 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "git -C /home/devops/datas/prompts status --short \| tail -12; git diff --stat \| tail -2; head -14 opens | 0 | completed |
| exec-162f9694-0000-44ac-a79f-07b6b0bfd3c1 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import hashlib,json,re roots=[Path('/home/devops/datas/ca | 0 | completed |
| exec-407787e3-c0bf-4c8b-bd9c-e5bb9043db30 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path root=Path('/home/devops/datas/prompts');names=['ACSP','CG | 0 | completed |
| exec-073db89e-9d2f-4085-8989-4ce11d9554bf | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,tempfile,os,json files=[str(p) for base | 0 | completed |
| exec-32ca1ef5-8ff9-4745-9e3f-784d7431b4ac | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'git diff --check' | 0 | completed |
| exec-e3e7dc88-9a20-4397-9939-8dd3f5bb21c9 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'git diff --check' | 0 | completed |
| exec-507b2ee2-f1f7-429d-99f4-43c7ca879545 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "rg -n 'purge\|delete\|remove\|statistics' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statis | 0 | completed |
| exec-7a83434d-8d3f-4694-96dc-9912aa9cc5ac | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'cat plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs' | 0 | completed |
| exec-3cf60917-13c0-4cb0-8fda-02b3b63a1e08 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "rg -n 'class RunStatistics\|constructor\|observe\\(\|admission\|track\\(\|context\\(\|contexts\|this.runs\|que | 0 | completed |
| exec-32f2000b-75a3-4c73-93df-e9a060774bd2 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "rg -n 'statistics\|observations\|contexts\|tombstone\|suppres' plugins/cab-approval-bridge/scripts/cgpt-ap | 0 | completed |
| exec-ba73d78a-547e-4bf0-91a0-01acac982e05 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "sed -n '1,175p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs; sed -n '1 | 0 | completed |
| exec-077d0f1a-0d7c-4292-8354-21a2e6b093ff | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "sed -n '98,158p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs; cat plug | 0 | completed |
| exec-bcef0dd4-2825-4c6b-9c8d-77c1305b0f47 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "sed -n '150,176p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs; | 0 | completed |
| exec-9121da6e-0a4c-4a16-8266-dc06cbdd87b7 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "sed -n '35,68p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs; s | 0 | completed |
| exec-271e4f1e-01bb-4189-91a1-6ebb440ce347 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path lines=Path('output/sgs-fixes-2.3.2/node-tests.log').read_ | 0 | completed |
| exec-aa0b8c19-7f86-47b8-a0ab-7b36ae5771d7 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "rg -n 'aucun refus à fabriquer' tests/*.test.mjs; sed -n '110,127p' plugins/cab-approval-bridge/script | 0 | completed |
| exec-6e816e54-083b-4b4a-89ec-1133370c1747 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path cab=Path('/home/devops/datas/cab');prompts=Path('/home/de | 0 | completed |
| exec-58bb128f-a7ec-41cc-9f94-9c7843c34f54 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate fix-sgs-report-isolation-and-compatibility --strict --no | 0 | completed |
| exec-0482e65d-e463-45f6-8422-f6c792ee7812 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate align-sgs-session-contracts --strict --no-interactive' | 0 | completed |
| exec-6f87edbb-5ae7-44d3-9af5-ec985c505b11 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/scripts/cgpt-approval | 0 | completed |
| exec-c8c80c0a-7c58-4334-8c28-9237d6d3778c | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'node --test tests/change-erasure.test.mjs' | 1 | failed |
| exec-dda0782f-11b2-4f17-9cc0-5f735184c671 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/scripts/cgpt-approval | 0 | completed |
| exec-65a60577-e03b-4565-b14e-5d8e73c34724 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'node --test tests/change-erasure.test.mjs' | 0 | completed |
| exec-816776f4-a53f-4069-a749-7a19fed3fdbc | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "node --test --test-name-pattern 'retrait non émis : aucun refus à fabriquer' tests/concurrent-controll | 0 | completed |
| exec-3c4284c1-1cde-40e8-bbac-de7b4f6771f8 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/scripts/cgpt-approval | 0 | completed |
| exec-b5d24579-f44a-420d-a4d6-3b6432ba631c | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'node --test tests/change-erasure.test.mjs tests/statistics-maintenance.test.mjs' | 0 | completed |
| exec-31b11f31-9624-40d3-808c-f2e48e0b695f | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path root=Path('/home/devops/datas/prompts');names=['ACSP','CG | 0 | completed |
| exec-a24f836c-fe03-4e63-b6dd-391951dfd803 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'git diff --check' | 0 | completed |
| exec-e5697599-0da3-4061-8799-4b566034d4d9 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'git diff --check' | 0 | completed |
| exec-1f117f4f-eac9-4a2b-83c6-0f25f085df25 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,time,json out=Path('output/sgs-fixes-2. | 1 | failed |
| exec-f192e830-30ce-458b-bd08-b8c598c2b8f3 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "sed -n '309,333p' tests/controller-service-distribution.test.mjs; sed -n '96,116p' tests/concurrent-co | 0 | completed |
| exec-a0fbcc87-4eb4-4c80-aa05-cfc601926192 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "node --test --test-name-pattern 'Code Mode brut : matrice' tests/concurrent-controller.test.mjs" | 0 | completed |
| exec-a3051709-b4bb-4d86-b1c9-acca1c9e867f | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "sed -n '26,54p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-erasure-manager.mjs; rg -n 'S | 0 | completed |
| exec-fcaaca38-8ee0-45e4-adde-921289d10322 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import json,hashlib p=Path('plugins/cab-approval-bridge/s | 0 | completed |
| exec-2c998af7-d1a4-43d1-93ba-432b62ed4aac | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import re,json root=Path('/home/devops/datas/prompts');na | 0 | completed |
| exec-9c23abba-5915-4e10-a7a5-03dcb7c839aa | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'node --test tests/controller-service-distribution.test.mjs tests/protocol-distribution.test.mjs tests/ | 0 | completed |
| exec-8e8a631a-ba96-45f9-b6fb-bab67e11411f | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'git fetch --no-tags github main' | 0 | completed |
| exec-7502b78a-c037-407e-8fa8-3bc434f3f914 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'git fetch --no-tags github main' | 128 | failed |
| exec-a15cb467-aa0c-4c1d-97cf-e5ebb7c48bbe | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'git status --short \| tail -12; git -C /home/devops/datas/prompts status --short \| tail -10; git -C /ho | 0 | completed |
| exec-a53a52ee-5386-4f39-896f-0ab411e5b84e | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'git rev-parse HEAD; git -C /home/devops/datas/prompts rev-parse HEAD; git -C /home/devops/datas/prompt | 0 | completed |
| exec-f871e0ad-55e7-4759-9a49-3032969a93e0 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import json paths=json.loads(\"[\\\".STATISTICS.session.j | 0 | completed |
| exec-ccb3d96a-0704-4ae1-81ab-f375f6e510dd | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import re,subprocess,json pairs=[(Path('/home/devops/data | 0 | completed |
| exec-e18bc782-a9e7-499d-962c-818dacad6f3c | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_validate.py plugins/cab-ap | 0 | completed |
| exec-fe15fce1-c6e4-4a9d-aef0-226a4ea45a93 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive' | 0 | completed |
| exec-7b3c4614-31b6-43bb-9e78-71ab20bf2b82 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive' | 0 | completed |
| exec-80e1b30d-a796-4518-a4bf-4627f27685de | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path for root,version in [(Path('/home/devops/datas/cab'),'2.3 | 0 | completed |
| exec-ace26576-1508-4d6d-a916-b94c3bcae7ee | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,tempfile,os,json files=[str(p) for base | 0 | completed |
| exec-e938e411-93a1-4d4f-8d8f-c56497976103 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path lines=Path('output/sgs-fixes-2.3.2/node-final.log').read_ | 0 | completed |
| exec-db6be142-0f83-4302-8522-e3411189c25e | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "sed -n '695,735p' tests/concurrent-controller.test.mjs; rg -n 'run-not-quiescent\|native-session-not-qu | 0 | completed |
| exec-f5af7954-4754-43b0-8dae-b47559948b0c | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "sed -n '2788,2830p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs; sed -n '4 | 0 | completed |
| exec-19d54fd2-bc20-40ec-96cc-362646c78ae9 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('tests/concurrent-controller.test.mjs');s=p.read_t | 0 | completed |
| exec-c5086912-1336-488e-afb6-5909938fdcfd | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc 'git diff --check' | 0 | completed |
| exec-d39f6478-053c-4994-bda9-027d3f0e35d9 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "node --test --test-name-pattern 'réconcilie un accès HELD restauré' tests/concurrent-controller.test.m | 0 | completed |
| exec-5f2b79f8-d64f-490f-8826-2a67f31d6a4b | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,json names=subprocess.check_output(['gi | 0 | completed |
| exec-d66b9d3c-5631-4741-8a8a-f3a936c26c68 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,json,time out=Path('output/sgs-fixes-2. | 1 | failed |
| exec-0b4d77ab-b555-47ae-b3ca-8f5c2e207f1b | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess for root in [Path('/home/devops/datas/c | 0 | completed |
| exec-7eaaf388-5cb5-49ed-8365-f3d44c74049d | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess,json from pathlib import Path r=subprocess.run(['node','--test', | 0 | completed |
| exec-467ee219-60c5-4157-9386-5e4c1c79077d | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import re,json root=Path('/home/devops/datas/prompts');na | 0 | completed |
| exec-41c56a0c-c1a3-4ee9-bf5c-4927f8bc66d1 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess r=subprocess.run(['python3','-B','-m',' | 0 | completed |
| exec-069e86f9-09f3-4e36-be22-73fb0ab3c22e | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import json,re out=Path('output/sgs-fixes-2.3.2');full=js | 0 | completed |
| exec-487a782e-089e-41ee-9922-f3611689239c | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec archive fix-sgs-report-isolation-and-compatibility --yes --json' | 0 | completed |
| exec-0d04ca87-0adf-46f3-8dbc-214baaa3e0f6 | 01a1adf9-4b60-7d83-ac40-f0ed199ddcb3 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec archive align-sgs-session-contracts --yes --json' | 0 | completed |
| exec-134e9f0d-d14d-432c-868f-ca18ef1bb3d0 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc 'git status --short' | 0 | completed |
| exec-cab9dedf-a3b1-4876-a6bc-1f2b18576cf1 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc 'git status --short' | 0 | completed |
| exec-3becf386-5578-4e58-a0ac-7dfc53a1e07d | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "rg -n 'Dossier des prompts\|Index des prompts\|/bin/openspec' DEVOPS.md; head -16 pyproject.toml; ls ope | 0 | completed |
| exec-43d6f4a1-0acd-4193-bbc4-797eaa2c026b | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "rg -n 'Dossier des prompts\|Index des prompts\|/bin/openspec' DEVOPS.md; ls openspec/changes; rg --files | 0 | completed |
| exec-9b59a28b-a059-470f-8330-d01b6705d3ff | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import re for root in ['/home/devops/datas/cab','/home/de | 0 | completed |
| exec-27ccdab8-35cc-4b91-85ea-b8b9b2192169 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "sed -n '1,95p' /home/devops/datas/prompts/AGENTS.md; sed -n '130,160p' /home/devops/datas/prompts/TECH | 0 | completed |
| exec-dc0c7044-8417-4291-8359-ecf77469822f | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "sed -n '1,120p' openspec/specs/global-project-statistics/spec.md; rg -n '"'^  (closing\|reportTarget\|re | 0 | completed |
| exec-c9cf5dc9-6f97-48bf-bad3-360c418224e7 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "sed -n '1590,1655p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs | 0 | completed |
| exec-ad98bcb4-d373-42b6-9ac8-2c1680b4be94 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "sed -n '1458,1484p' plugins/cab-approval-bridge/scripts/cab_sgs.py; sed -n '1540,1584p' plugins/cab-ap | 0 | completed |
| exec-f2413e29-8b4d-4771-b8c8-6c97f80e402c | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "sed -n '170,210p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs; sed -n '385,463p' | 0 | completed |
| exec-10a5d503-f47a-45c3-846d-5d47aa707bd5 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/prompt/scripts/resolve | 0 | completed |
| exec-eb4299d5-3f88-4efc-91db-e7f27bd3063b | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc 'sudo -n -l -- /usr/local/bin/diu projects cicd cab 2.3.2' | 0 | completed |
| exec-27862f85-9a00-44a0-bdac-324313bbbff6 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc 'sudo -n -l -- /usr/local/bin/diu projects cicd prompts 1.0.3' | 0 | completed |
| exec-18c1b861-496f-48b7-bb6e-6068672412d8 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "sed -n '1742,1765p' plugins/cab-approval-bridge/scripts/cab_sgs.py; sed -n '350,371p' plugins/cab-appr | 0 | completed |
| exec-c4d7df9e-7419-47ed-99bb-55a393fa17b1 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "rg -n '"'^### Requirement:'"' openspec/specs/concurrent-run-coordination/spec.md \| tail -12; head -20  | 0 | completed |
| exec-36aa83c9-a5f5-4b9f-aee1-c0161703995f | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import re cab=Path('/home/devops/datas/cab');prompts=Path | 0 | completed |
| exec-5b5e5c5e-64a3-4b8f-9d2c-e1e69d3bca02 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate fix-sgs-report-isolation-and-compatibility --strict --no | 0 | completed |
| exec-ca49fec2-516e-4868-aef5-3fe91a9a737f | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate align-sgs-session-contracts --strict --no-interactive' | 0 | completed |
| exec-7be55c48-00d8-4df9-8e80-ba7fe568a1c0 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/scripts/cab_sgs.py'); | 0 | completed |
| exec-9897f884-0062-4bb8-b21b-0390366b1048 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 1 | failed |
| exec-2e955665-4201-4ebd-996e-85994b595521 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/scripts/cgpt-approval | 0 | completed |
| exec-9165379f-bd71-48bd-9f7c-3e461c538de9 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc 'node --test tests/concurrent-run-registry.test.mjs tests/resource-coordination.test.mjs' | 0 | completed |
| exec-3081c9ef-732b-491b-be70-b415f837f8d4 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "sed -n '326,356p' tests/resource-coordination.test.mjs; sed -n '430,455p' tests/test_sgs.py; sed -n '4 | 0 | completed |
| exec-22b95121-6853-4dc0-a6d4-7bbb73aa28b1 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/scripts/cgpt-approval | 1 | failed |
| exec-0af3e989-ede1-44a5-a9da-91c0ee2c2f0a | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('tests/test_sgs.py');s=p.read_text();a=s.index('   | 0 | completed |
| exec-6391c4d2-f7a0-4f93-b186-d4722959b914 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 0 | completed |
| exec-ea657536-05b4-4899-86f9-489b041dbae1 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc 'node --test tests/concurrent-run-registry.test.mjs tests/resource-coordination.test.mjs' | 0 | completed |
| exec-909a6be6-c413-409b-a299-b48664fba176 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('tests/resource-coordination.test.mjs');s=p.read_t | 0 | completed |
| exec-c510e318-f451-49c7-9e02-d8c445345a12 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path root=Path('/home/devops/datas/prompts') files=['ACSP','CG | 0 | completed |
| exec-3a2a8adc-a79b-4d1f-8d9a-dfdef140322d | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/skills/sgs/SKILL.md') | 0 | completed |
| exec-ea7582ba-d108-43f0-b028-88e051a8cf43 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc 'node --test tests/resource-coordination.test.mjs' | 1 | failed |
| exec-5de28480-d352-4cb0-b3e5-2359fbb07075 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path root=Path('/home/devops/datas/prompts') startup=''' Initi | 0 | completed |
| exec-61d5c6b7-6335-4da1-9353-678c711e256b | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "rg -n 'resources.length "'!== 1\|resources.length === 1\|seul.*STATISTICS\|seul.*STATISTIQUES'"' plugins/ | 0 | completed |
| exec-422ece35-6023-45c6-ac5a-15a868629123 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('tests/resource-coordination.test.mjs');s=p.read_t | 0 | completed |
| exec-fb5316c7-4144-4308-b823-9290fb5322a7 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "node --test --test-name-pattern 'legacy REPORT\|SGS REPORT\|report target' tests/resource-coordination.t | 0 | completed |
| exec-2f8e82a6-df22-421a-80dd-1bde6f282b97 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc 'git -C /home/devops/datas/prompts remote -v; git -C /home/devops/datas/prompts diff --check' | 0 | completed |
| exec-0e3c828a-9056-40d1-8ed5-e2d441c96d0f | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,json,hashlib from datetime import datet | 0 | completed |
| exec-e2c7a41b-389f-4a4a-b86a-6fef6e8cf2f8 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess from pathlib import Path r=subprocess.run(['python3','-B','-m',' | 0 | completed |
| exec-d03fcbfd-dd7a-407c-9549-349701771e2b | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path root=Path('/home/devops/datas/prompts');names=['ACSP','CG | 0 | completed |
| exec-04243d95-c6f9-45db-a72b-19739e5cc450 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,os out=Path('output/sgs-fixes-2.3.2').r | 0 | completed |
| exec-b3ec4fda-296d-4d23-b4d5-e5762d25ce46 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import json,hashlib p=Path('plugins/cab-approval-bridge/s | 0 | completed |
| exec-2cf604a4-1430-4cea-b86a-ddee8e9dda68 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive' | 0 | completed |
| exec-e8cb115b-b294-4c46-b2e6-a901e9eee623 | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive' | 0 | completed |
| exec-435ce08c-860d-4b0c-81ab-6cade3fb7efc | 01a1addc-c298-7963-8eed-4e46fdd686dd | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess,json,time,re from pathlib import Path out=Path('output/sgs-fixes | -1 | failed |

## 5. Accès web

### Relevé sgs-cab-2.3.2-scm-final-01

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Appels aux outils web | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels web réussis | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Recherches web | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Consultations web | N/A | Mesure absente ou périmètre exhaustif non identifiable |

## 6. Synthèse globale

### Relevé sgs-cab-2.3.2-scm-final-01

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Écritures de fichiers | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Commandes | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Web | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Autres outils | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Total | N/A | Mesure absente ou périmètre exhaustif non identifiable |

| Élément documenté | Valeur | Preuve |
| --- | --- | --- |
| Livraison | Workflow DIU cab 2.3.2 autorisé après les rapports ; aucun résultat futur anticipé | QUALIFICATION.md |
| Nettoyage | Preuves stdin et candidat local non persistants ; aucun état CAB privé de production lu ou supprimé | Tests synthétiques, aucun RUN CAB créé par ce mandat |

#### Mesures et limites de collecte

| Élément | État |
| --- | --- |
| Agents | Codex codeur direct ; orchestration absente |
| Modèle, raisonnement, tokens, coûts | N/A : sources exactes non exposées |
| Commandes | Historique commun conservé, sans attribution arbitraire |
| Temps | Étendue calendaire du mandat commun ; pauses et service non ventilés |
| Global | DELTA distinct après vérification du rapport, jamais REBUILD automatique |
| Nettoyage CAB réel | Aucun RUN créé pour ce mandat ; qualification sur données contrôlées |

Le rapport est la preuve durable. Le nettoyage statistique est intégré au protocole des sessions/CAB avec préservation des pairs ; il est qualifié synthétiquement et aucun effacement d’un runtime de production n’est revendiqué ici. Le résultat du delta et de DIU est relevé séparément après cette génération.


<!-- CAB_SGS_SESSIONS_V1
{
  "format": "cab-sgs-1",
  "sessions": [
    {
      "agent_details": [
        {
          "model": "N/A",
          "provider": "OpenAI",
          "reasoning": "N/A",
          "role": "coder",
          "service_percent": "N/A",
          "throughput": "N/A",
          "ttmt": "N/A",
          "version": "N/A"
        }
      ],
      "contribution": {
        "agents": [
          {
            "agent": "codex",
            "model": "N/A",
            "reasoning": "N/A",
            "role": "coder"
          }
        ],
        "bounds": {
          "end": "1793921874",
          "start": "1793918288"
        },
        "breakdowns": {},
        "costs": {},
        "metrics": {
          "commands": {
            "evidence": [],
            "reason": "Les exécutions observées couvrent le mandat commun aux deux projets ; aucune ventilation exclusive par change n’est établie. Voir la liste native conservée.",
            "state": "unavailable",
            "value": null
          },
          "commands_failure": {
            "evidence": [],
            "reason": "Les exécutions observées couvrent le mandat commun aux deux projets ; aucune ventilation exclusive par change n’est établie. Voir la liste native conservée.",
            "state": "unavailable",
            "value": null
          },
          "commands_success": {
            "evidence": [],
            "reason": "Les exécutions observées couvrent le mandat commun aux deux projets ; aucune ventilation exclusive par change n’est établie. Voir la liste native conservée.",
            "state": "unavailable",
            "value": null
          },
          "compactions": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "domain_command": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "domain_other": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "domain_total": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "domain_web": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "domain_write": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "duration": {
            "evidence": [
              {
                "line": 1,
                "note": "Étendue calendaire du mandat commun CAB/prompts ; interruption incluse, durée active non mesurée"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "3586"
          },
          "files_touched": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "messages": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "messages_assistant": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "messages_user": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "net_duration": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "openspec_standard_failure": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "openspec_standard_success": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "openspec_strict_failure": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "openspec_strict_success": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "permissions": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "permissions_approved": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "permissions_cancelled": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "permissions_expired": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "permissions_rejected": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "syntax_files": {
            "evidence": [
              {
                "line": 1,
                "note": "193 tests Python et1288verdicts Node finaux ;31ignorés exclus et reprises non additionnées ; qualification-campaign.json conserve le code brut1 de la suite et la contre-vérification du seul cas corrigé"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "24"
          },
          "tasks": {
            "evidence": [
              {
                "line": 1,
                "note": "Sept tâches validées sur leurs critères ; voir tasks.md et QUALIFICATION.md"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "7"
          },
          "tests": {
            "evidence": [
              {
                "line": 1,
                "note": "193 tests Python et1288verdicts Node finaux ;31ignorés exclus et reprises non additionnées ; qualification-campaign.json conserve le code brut1 de la suite et la contre-vérification du seul cas corrigé"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "1481"
          },
          "tests_failure": {
            "evidence": [
              {
                "line": 1,
                "note": "193 tests Python et1288verdicts Node finaux ;31ignorés exclus et reprises non additionnées ; qualification-campaign.json conserve le code brut1 de la suite et la contre-vérification du seul cas corrigé"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "0"
          },
          "tests_success": {
            "evidence": [
              {
                "line": 1,
                "note": "193 tests Python et1288verdicts Node finaux ;31ignorés exclus et reprises non additionnées ; qualification-campaign.json conserve le code brut1 de la suite et la contre-vérification du seul cas corrigé"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "1481"
          },
          "tokens_cache_read": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tokens_cache_write": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tokens_input": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tokens_output": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tokens_reasoning": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tokens_total": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tools": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tools_completed": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tools_error": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tools_running": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "web": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "web_open": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "web_search": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "web_success": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "writes": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          }
        },
        "performance": [],
        "proof_ids": [],
        "sessions": [],
        "web_calls": []
      },
      "details": {
        "1": [
          {
            "label": "Périmètre",
            "proof": "proposal.md et QUALIFICATION.md",
            "value": "Quatre corrections, suivi à l’amorçage avec deux rôles et nettoyage terminal statistique"
          },
          {
            "label": "Archivage",
            "proof": "openspec/changes/archive/2026-11-06-fix-sgs-report-isolation-and-compatibility",
            "value": "Archive normale réussie, sans saut de validation"
          },
          {
            "label": "Session",
            "proof": "Métadonnées natives, SESSION_OBSERVATION.json",
            "value": "Codex codeur direct ; aucun orchestrateur ou RUN CAB créé pour ce mandat"
          }
        ],
        "6": [
          {
            "label": "Livraison",
            "proof": "QUALIFICATION.md",
            "value": "Workflow DIU cab 2.3.2 autorisé après les rapports ; aucun résultat futur anticipé"
          },
          {
            "label": "Nettoyage",
            "proof": "Tests synthétiques, aucun RUN CAB créé par ce mandat",
            "value": "Preuves stdin et candidat local non persistants ; aucun état CAB privé de production lu ou supprimé"
          }
        ]
      },
      "id": "sgs-cab-2.3.2-scm-final-01",
      "input_sha256": "28687c84b9a9dac61fb4afa30bd11495f4f67f06e9ac99862c004fb875dcd282",
      "notes": {
        "1": [
          "La qualification finale conserve les campagnes en échec et les reprises. Aucun code de retour non nul n’est transformé en réussite. La suite complète Node et la reprise ciblée du cas modifié sont deux exécutions distinctes."
        ],
        "2": [
          "Les rôles sont identifiés depuis le départ du suivi ; cette session directe n’ajoute aucun orchestrateur fictif. La mesure native non disponible reste N/A."
        ],
        "6": [
          "Le rapport est la preuve durable. Le nettoyage statistique est intégré au protocole des sessions/CAB avec préservation des pairs ; il est qualifié synthétiquement et aucun effacement d’un runtime de production n’est revendiqué ici. Le résultat du delta et de DIU est relevé séparément après cette génération."
        ]
      },
      "scope": "cumulative",
      "state": "archived",
      "tables": {
        "1": [
          {
            "columns": [
              "Contrôle",
              "Résultat",
              "Preuve"
            ],
            "rows": [
              [
                "Python CAB",
                "193réussis",
                "output/sgs-fixes-2.3.2/python-final-results.txt"
              ],
              [
                "Node CAB",
                "1319cas,31ignorés ;1288verdicts exécutés finaux réussis",
                "qualification-campaign.json : suite complète1287pass/1fail puis cas de fixture corrigé et revalidé"
              ],
              [
                "SGS ciblé",
                "57réussis, inclus dans193Python",
                "test_sgs.py"
              ],
              [
                "Distribution/nettoyage",
                "85contrôles ciblés réussis, sans addition au total",
                "Node ciblé, états TERMINÉ et BLOQUÉ"
              ],
              [
                "Navigateurs",
                "Chromium/Firefox réussis",
                "web-monitor-browser-results.json"
              ],
              [
                "Prompts",
                "12/12contrats cohérents, amorçage et nettoyage inclus",
                "output/sgs-contracts-1.0.3/contract-results.json"
              ],
              [
                "OpenSpec",
                "CAB22éléments, prompts6 avant archive ; commandes strictes réussies",
                "Qualification locale ; éléments distincts des exécutions"
              ],
              [
                "Archive cab",
                "2026-11-06-fix-sgs-report-isolation-and-compatibility",
                "OpenSpec archive --yes --json, specsUpdated=true"
              ]
            ],
            "title": "Qualification et périmètres distincts"
          }
        ],
        "3": [
          {
            "columns": [
              "Chemin",
              "Portée"
            ],
            "rows": [
              [
                "/home/devops/datas/cab/.codex/commands/CAB.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/.codex/commands/CABU.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/.codex/commands/SGS.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/BUILD.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/CHANGELOG.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/DEVELOPMENT_MAP.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/DEVOPS.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/PROJECT.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/README.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/TECHNICAL.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/openspec/BATCH_CODES.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/openspec/specs/concurrent-run-coordination/spec.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/openspec/specs/global-project-statistics/spec.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_journal.py",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_router.py",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_server.py",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cab_sgs.py",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-approval-metadata.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-artifact-proof.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-cleanup.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-context-portability.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-continuity.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-efficiency.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-erasure-manager.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-forward-repair.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-import-observations.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-manifest-extensions.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-transition.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-management.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-native-instances.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-policy.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-replies.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-port-recovery.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prepare-model-policy.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-provider-connect.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-recovery-evidence.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-recovery.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runtime-migration.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-lifecycle.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-stage.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-source-read.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-state-layout.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update-credential.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/change-erasure.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/distribution-validation.json",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/protocol-coordination.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/protocol-lifecycle.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/technical-mandates.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/sgs/SKILL.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/sgs/references/schema.md",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-monitor.service",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/plugins/cabu/.codex-plugin/plugin.json",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/pyproject.toml",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/src/cgpt_approval_bridge_journal.py",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/src/cgpt_approval_bridge_router.py",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/src/cgpt_approval_bridge_server.py",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/active-component-update.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/approval-metadata.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/autonomous-recovery.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/change-erasure.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/concurrent-controller.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/concurrent-run-registry.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/controller-service-distribution.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/maintenance-bootstrap.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/monitor-service-start.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/native-instances.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/native-opencode.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/opencode-v2-client.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/protocol-continuity.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/provider-connect.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/resource-coordination.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/shell-lifecycle.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/test_crash_recovery.py",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/test_session_reset.py",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/test_sgs.py",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/web-monitor-browser.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ],
              [
                "/home/devops/datas/cab/tests/web-monitor.test.mjs",
                "Évolution liée au mandat ou travail préexistant conservé par le commit SCM complet"
              ]
            ],
            "title": "Fichiers suivis amendés dans le projet au relevé"
          }
        ],
        "4": [
          {
            "columns": [
              "Identifiant",
              "Tour",
              "Aperçu",
              "Code",
              "État"
            ],
            "rows": [
              [
                "exec-51be46d2-cb63-4be9-a5ed-cd82865a3736",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'git status --short | head -12'",
                "0",
                "completed"
              ],
              [
                "exec-1b926f94-5180-4b7c-9d47-924dc304b54d",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'ls output/sgs-fixes-2.3.2; test ! -f output/sgs-fixes-2.3.2/node-results.json || cat output/sgs-fixes-",
                "0",
                "completed"
              ],
              [
                "exec-6d4abe57-1235-4f2d-8da7-92fbb5c4a8c1",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess p=Path('output/sgs-fixes-2.3.2/node-tes",
                "0",
                "completed"
              ],
              [
                "exec-f6d12ee4-1f8d-47a2-8a39-e6108b03d370",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"git -C /home/devops/datas/prompts status --short | tail -12; git diff --stat | tail -2; head -14 opens",
                "0",
                "completed"
              ],
              [
                "exec-162f9694-0000-44ac-a79f-07b6b0bfd3c1",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import hashlib,json,re roots=[Path('/home/devops/datas/ca",
                "0",
                "completed"
              ],
              [
                "exec-407787e3-c0bf-4c8b-bd9c-e5bb9043db30",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path root=Path('/home/devops/datas/prompts');names=['ACSP','CG",
                "0",
                "completed"
              ],
              [
                "exec-073db89e-9d2f-4085-8989-4ce11d9554bf",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,tempfile,os,json files=[str(p) for base",
                "0",
                "completed"
              ],
              [
                "exec-32ca1ef5-8ff9-4745-9e3f-784d7431b4ac",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'git diff --check'",
                "0",
                "completed"
              ],
              [
                "exec-e3e7dc88-9a20-4397-9939-8dd3f5bb21c9",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'git diff --check'",
                "0",
                "completed"
              ],
              [
                "exec-507b2ee2-f1f7-429d-99f4-43c7ca879545",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"rg -n 'purge|delete|remove|statistics' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statis",
                "0",
                "completed"
              ],
              [
                "exec-7a83434d-8d3f-4694-96dc-9912aa9cc5ac",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'cat plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs'",
                "0",
                "completed"
              ],
              [
                "exec-3cf60917-13c0-4cb0-8fda-02b3b63a1e08",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"rg -n 'class RunStatistics|constructor|observe\\\\(|admission|track\\\\(|context\\\\(|contexts|this.runs|que",
                "0",
                "completed"
              ],
              [
                "exec-32f2000b-75a3-4c73-93df-e9a060774bd2",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"rg -n 'statistics|observations|contexts|tombstone|suppres' plugins/cab-approval-bridge/scripts/cgpt-ap",
                "0",
                "completed"
              ],
              [
                "exec-ba73d78a-547e-4bf0-91a0-01acac982e05",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"sed -n '1,175p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs; sed -n '1",
                "0",
                "completed"
              ],
              [
                "exec-077d0f1a-0d7c-4292-8354-21a2e6b093ff",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"sed -n '98,158p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs; cat plug",
                "0",
                "completed"
              ],
              [
                "exec-bcef0dd4-2825-4c6b-9c8d-77c1305b0f47",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"sed -n '150,176p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs;",
                "0",
                "completed"
              ],
              [
                "exec-9121da6e-0a4c-4a16-8266-dc06cbdd87b7",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"sed -n '35,68p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs; s",
                "0",
                "completed"
              ],
              [
                "exec-271e4f1e-01bb-4189-91a1-6ebb440ce347",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path lines=Path('output/sgs-fixes-2.3.2/node-tests.log').read_",
                "0",
                "completed"
              ],
              [
                "exec-aa0b8c19-7f86-47b8-a0ab-7b36ae5771d7",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"rg -n 'aucun refus à fabriquer' tests/*.test.mjs; sed -n '110,127p' plugins/cab-approval-bridge/script",
                "0",
                "completed"
              ],
              [
                "exec-6e816e54-083b-4b4a-89ec-1133370c1747",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path cab=Path('/home/devops/datas/cab');prompts=Path('/home/de",
                "0",
                "completed"
              ],
              [
                "exec-58bb128f-a7ec-41cc-9f94-9c7843c34f54",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate fix-sgs-report-isolation-and-compatibility --strict --no",
                "0",
                "completed"
              ],
              [
                "exec-0482e65d-e463-45f6-8422-f6c792ee7812",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate align-sgs-session-contracts --strict --no-interactive'",
                "0",
                "completed"
              ],
              [
                "exec-6f87edbb-5ae7-44d3-9af5-ec985c505b11",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/scripts/cgpt-approval",
                "0",
                "completed"
              ],
              [
                "exec-c8c80c0a-7c58-4334-8c28-9237d6d3778c",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'node --test tests/change-erasure.test.mjs'",
                "1",
                "failed"
              ],
              [
                "exec-dda0782f-11b2-4f17-9cc0-5f735184c671",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/scripts/cgpt-approval",
                "0",
                "completed"
              ],
              [
                "exec-65a60577-e03b-4565-b14e-5d8e73c34724",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'node --test tests/change-erasure.test.mjs'",
                "0",
                "completed"
              ],
              [
                "exec-816776f4-a53f-4069-a749-7a19fed3fdbc",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'retrait non émis : aucun refus à fabriquer' tests/concurrent-controll",
                "0",
                "completed"
              ],
              [
                "exec-3c4284c1-1cde-40e8-bbac-de7b4f6771f8",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/scripts/cgpt-approval",
                "0",
                "completed"
              ],
              [
                "exec-b5d24579-f44a-420d-a4d6-3b6432ba631c",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'node --test tests/change-erasure.test.mjs tests/statistics-maintenance.test.mjs'",
                "0",
                "completed"
              ],
              [
                "exec-31b11f31-9624-40d3-808c-f2e48e0b695f",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path root=Path('/home/devops/datas/prompts');names=['ACSP','CG",
                "0",
                "completed"
              ],
              [
                "exec-a24f836c-fe03-4e63-b6dd-391951dfd803",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'git diff --check'",
                "0",
                "completed"
              ],
              [
                "exec-e5697599-0da3-4061-8799-4b566034d4d9",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'git diff --check'",
                "0",
                "completed"
              ],
              [
                "exec-1f117f4f-eac9-4a2b-83c6-0f25f085df25",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,time,json out=Path('output/sgs-fixes-2.",
                "1",
                "failed"
              ],
              [
                "exec-f192e830-30ce-458b-bd08-b8c598c2b8f3",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"sed -n '309,333p' tests/controller-service-distribution.test.mjs; sed -n '96,116p' tests/concurrent-co",
                "0",
                "completed"
              ],
              [
                "exec-a0fbcc87-4eb4-4c80-aa05-cfc601926192",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'Code Mode brut : matrice' tests/concurrent-controller.test.mjs\"",
                "0",
                "completed"
              ],
              [
                "exec-a3051709-b4bb-4d86-b1c9-acca1c9e867f",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"sed -n '26,54p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-erasure-manager.mjs; rg -n 'S",
                "0",
                "completed"
              ],
              [
                "exec-fcaaca38-8ee0-45e4-adde-921289d10322",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import json,hashlib p=Path('plugins/cab-approval-bridge/s",
                "0",
                "completed"
              ],
              [
                "exec-2c998af7-d1a4-43d1-93ba-432b62ed4aac",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import re,json root=Path('/home/devops/datas/prompts');na",
                "0",
                "completed"
              ],
              [
                "exec-9c23abba-5915-4e10-a7a5-03dcb7c839aa",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'node --test tests/controller-service-distribution.test.mjs tests/protocol-distribution.test.mjs tests/",
                "0",
                "completed"
              ],
              [
                "exec-8e8a631a-ba96-45f9-b6fb-bab67e11411f",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'git fetch --no-tags github main'",
                "0",
                "completed"
              ],
              [
                "exec-7502b78a-c037-407e-8fa8-3bc434f3f914",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'git fetch --no-tags github main'",
                "128",
                "failed"
              ],
              [
                "exec-a15cb467-aa0c-4c1d-97cf-e5ebb7c48bbe",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'git status --short | tail -12; git -C /home/devops/datas/prompts status --short | tail -10; git -C /ho",
                "0",
                "completed"
              ],
              [
                "exec-a53a52ee-5386-4f39-896f-0ab411e5b84e",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'git rev-parse HEAD; git -C /home/devops/datas/prompts rev-parse HEAD; git -C /home/devops/datas/prompt",
                "0",
                "completed"
              ],
              [
                "exec-f871e0ad-55e7-4759-9a49-3032969a93e0",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import json paths=json.loads(\\\"[\\\\\\\".STATISTICS.session.j",
                "0",
                "completed"
              ],
              [
                "exec-ccb3d96a-0704-4ae1-81ab-f375f6e510dd",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import re,subprocess,json pairs=[(Path('/home/devops/data",
                "0",
                "completed"
              ],
              [
                "exec-e18bc782-a9e7-499d-962c-818dacad6f3c",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_validate.py plugins/cab-ap",
                "0",
                "completed"
              ],
              [
                "exec-fe15fce1-c6e4-4a9d-aef0-226a4ea45a93",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive'",
                "0",
                "completed"
              ],
              [
                "exec-7b3c4614-31b6-43bb-9e78-71ab20bf2b82",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive'",
                "0",
                "completed"
              ],
              [
                "exec-80e1b30d-a796-4518-a4bf-4627f27685de",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path for root,version in [(Path('/home/devops/datas/cab'),'2.3",
                "0",
                "completed"
              ],
              [
                "exec-ace26576-1508-4d6d-a916-b94c3bcae7ee",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,tempfile,os,json files=[str(p) for base",
                "0",
                "completed"
              ],
              [
                "exec-e938e411-93a1-4d4f-8d8f-c56497976103",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path lines=Path('output/sgs-fixes-2.3.2/node-final.log').read_",
                "0",
                "completed"
              ],
              [
                "exec-db6be142-0f83-4302-8522-e3411189c25e",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"sed -n '695,735p' tests/concurrent-controller.test.mjs; rg -n 'run-not-quiescent|native-session-not-qu",
                "0",
                "completed"
              ],
              [
                "exec-f5af7954-4754-43b0-8dae-b47559948b0c",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"sed -n '2788,2830p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs; sed -n '4",
                "0",
                "completed"
              ],
              [
                "exec-19d54fd2-bc20-40ec-96cc-362646c78ae9",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('tests/concurrent-controller.test.mjs');s=p.read_t",
                "0",
                "completed"
              ],
              [
                "exec-c5086912-1336-488e-afb6-5909938fdcfd",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc 'git diff --check'",
                "0",
                "completed"
              ],
              [
                "exec-d39f6478-053c-4994-bda9-027d3f0e35d9",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'réconcilie un accès HELD restauré' tests/concurrent-controller.test.m",
                "0",
                "completed"
              ],
              [
                "exec-5f2b79f8-d64f-490f-8826-2a67f31d6a4b",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,json names=subprocess.check_output(['gi",
                "0",
                "completed"
              ],
              [
                "exec-d66b9d3c-5631-4741-8a8a-f3a936c26c68",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,json,time out=Path('output/sgs-fixes-2.",
                "1",
                "failed"
              ],
              [
                "exec-0b4d77ab-b555-47ae-b3ca-8f5c2e207f1b",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess for root in [Path('/home/devops/datas/c",
                "0",
                "completed"
              ],
              [
                "exec-7eaaf388-5cb5-49ed-8365-f3d44c74049d",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess,json from pathlib import Path r=subprocess.run(['node','--test',",
                "0",
                "completed"
              ],
              [
                "exec-467ee219-60c5-4157-9386-5e4c1c79077d",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import re,json root=Path('/home/devops/datas/prompts');na",
                "0",
                "completed"
              ],
              [
                "exec-41c56a0c-c1a3-4ee9-bf5c-4927f8bc66d1",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess r=subprocess.run(['python3','-B','-m','",
                "0",
                "completed"
              ],
              [
                "exec-069e86f9-09f3-4e36-be22-73fb0ab3c22e",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import json,re out=Path('output/sgs-fixes-2.3.2');full=js",
                "0",
                "completed"
              ],
              [
                "exec-487a782e-089e-41ee-9922-f3611689239c",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec archive fix-sgs-report-isolation-and-compatibility --yes --json'",
                "0",
                "completed"
              ],
              [
                "exec-0d04ca87-0adf-46f3-8dbc-214baaa3e0f6",
                "01a1adf9-4b60-7d83-ac40-f0ed199ddcb3",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec archive align-sgs-session-contracts --yes --json'",
                "0",
                "completed"
              ],
              [
                "exec-134e9f0d-d14d-432c-868f-ca18ef1bb3d0",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc 'git status --short'",
                "0",
                "completed"
              ],
              [
                "exec-cab9dedf-a3b1-4876-a6bc-1f2b18576cf1",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc 'git status --short'",
                "0",
                "completed"
              ],
              [
                "exec-3becf386-5578-4e58-a0ac-7dfc53a1e07d",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"rg -n 'Dossier des prompts|Index des prompts|/bin/openspec' DEVOPS.md; head -16 pyproject.toml; ls ope",
                "0",
                "completed"
              ],
              [
                "exec-43d6f4a1-0acd-4193-bbc4-797eaa2c026b",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"rg -n 'Dossier des prompts|Index des prompts|/bin/openspec' DEVOPS.md; ls openspec/changes; rg --files",
                "0",
                "completed"
              ],
              [
                "exec-9b59a28b-a059-470f-8330-d01b6705d3ff",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import re for root in ['/home/devops/datas/cab','/home/de",
                "0",
                "completed"
              ],
              [
                "exec-27ccdab8-35cc-4b91-85ea-b8b9b2192169",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"sed -n '1,95p' /home/devops/datas/prompts/AGENTS.md; sed -n '130,160p' /home/devops/datas/prompts/TECH",
                "0",
                "completed"
              ],
              [
                "exec-dc0c7044-8417-4291-8359-ecf77469822f",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"sed -n '1,120p' openspec/specs/global-project-statistics/spec.md; rg -n '\"'^  (closing|reportTarget|re",
                "0",
                "completed"
              ],
              [
                "exec-c9cf5dc9-6f97-48bf-bad3-360c418224e7",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"sed -n '1590,1655p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs",
                "0",
                "completed"
              ],
              [
                "exec-ad98bcb4-d373-42b6-9ac8-2c1680b4be94",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"sed -n '1458,1484p' plugins/cab-approval-bridge/scripts/cab_sgs.py; sed -n '1540,1584p' plugins/cab-ap",
                "0",
                "completed"
              ],
              [
                "exec-f2413e29-8b4d-4771-b8c8-6c97f80e402c",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"sed -n '170,210p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs; sed -n '385,463p'",
                "0",
                "completed"
              ],
              [
                "exec-10a5d503-f47a-45c3-846d-5d47aa707bd5",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/prompt/scripts/resolve",
                "0",
                "completed"
              ],
              [
                "exec-eb4299d5-3f88-4efc-91db-e7f27bd3063b",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc 'sudo -n -l -- /usr/local/bin/diu projects cicd cab 2.3.2'",
                "0",
                "completed"
              ],
              [
                "exec-27862f85-9a00-44a0-bdac-324313bbbff6",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc 'sudo -n -l -- /usr/local/bin/diu projects cicd prompts 1.0.3'",
                "0",
                "completed"
              ],
              [
                "exec-18c1b861-496f-48b7-bb6e-6068672412d8",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"sed -n '1742,1765p' plugins/cab-approval-bridge/scripts/cab_sgs.py; sed -n '350,371p' plugins/cab-appr",
                "0",
                "completed"
              ],
              [
                "exec-c4d7df9e-7419-47ed-99bb-55a393fa17b1",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"rg -n '\"'^### Requirement:'\"' openspec/specs/concurrent-run-coordination/spec.md | tail -12; head -20 ",
                "0",
                "completed"
              ],
              [
                "exec-36aa83c9-a5f5-4b9f-aee1-c0161703995f",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import re cab=Path('/home/devops/datas/cab');prompts=Path",
                "0",
                "completed"
              ],
              [
                "exec-5b5e5c5e-64a3-4b8f-9d2c-e1e69d3bca02",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate fix-sgs-report-isolation-and-compatibility --strict --no",
                "0",
                "completed"
              ],
              [
                "exec-ca49fec2-516e-4868-aef5-3fe91a9a737f",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate align-sgs-session-contracts --strict --no-interactive'",
                "0",
                "completed"
              ],
              [
                "exec-7be55c48-00d8-4df9-8e80-ba7fe568a1c0",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/scripts/cab_sgs.py');",
                "0",
                "completed"
              ],
              [
                "exec-9897f884-0062-4bb8-b21b-0390366b1048",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "1",
                "failed"
              ],
              [
                "exec-2e955665-4201-4ebd-996e-85994b595521",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/scripts/cgpt-approval",
                "0",
                "completed"
              ],
              [
                "exec-9165379f-bd71-48bd-9f7c-3e461c538de9",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc 'node --test tests/concurrent-run-registry.test.mjs tests/resource-coordination.test.mjs'",
                "0",
                "completed"
              ],
              [
                "exec-3081c9ef-732b-491b-be70-b415f837f8d4",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"sed -n '326,356p' tests/resource-coordination.test.mjs; sed -n '430,455p' tests/test_sgs.py; sed -n '4",
                "0",
                "completed"
              ],
              [
                "exec-22b95121-6853-4dc0-a6d4-7bbb73aa28b1",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/scripts/cgpt-approval",
                "1",
                "failed"
              ],
              [
                "exec-0af3e989-ede1-44a5-a9da-91c0ee2c2f0a",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('tests/test_sgs.py');s=p.read_text();a=s.index('  ",
                "0",
                "completed"
              ],
              [
                "exec-6391c4d2-f7a0-4f93-b186-d4722959b914",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "0",
                "completed"
              ],
              [
                "exec-ea657536-05b4-4899-86f9-489b041dbae1",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc 'node --test tests/concurrent-run-registry.test.mjs tests/resource-coordination.test.mjs'",
                "0",
                "completed"
              ],
              [
                "exec-909a6be6-c413-409b-a299-b48664fba176",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('tests/resource-coordination.test.mjs');s=p.read_t",
                "0",
                "completed"
              ],
              [
                "exec-c510e318-f451-49c7-9e02-d8c445345a12",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path root=Path('/home/devops/datas/prompts') files=['ACSP','CG",
                "0",
                "completed"
              ],
              [
                "exec-3a2a8adc-a79b-4d1f-8d9a-dfdef140322d",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/skills/sgs/SKILL.md')",
                "0",
                "completed"
              ],
              [
                "exec-ea7582ba-d108-43f0-b028-88e051a8cf43",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc 'node --test tests/resource-coordination.test.mjs'",
                "1",
                "failed"
              ],
              [
                "exec-5de28480-d352-4cb0-b3e5-2359fbb07075",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path root=Path('/home/devops/datas/prompts') startup=''' Initi",
                "0",
                "completed"
              ],
              [
                "exec-61d5c6b7-6335-4da1-9353-678c711e256b",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"rg -n 'resources.length \"'!== 1|resources.length === 1|seul.*STATISTICS|seul.*STATISTIQUES'\"' plugins/",
                "0",
                "completed"
              ],
              [
                "exec-422ece35-6023-45c6-ac5a-15a868629123",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('tests/resource-coordination.test.mjs');s=p.read_t",
                "0",
                "completed"
              ],
              [
                "exec-fb5316c7-4144-4308-b823-9290fb5322a7",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'legacy REPORT|SGS REPORT|report target' tests/resource-coordination.t",
                "0",
                "completed"
              ],
              [
                "exec-2f8e82a6-df22-421a-80dd-1bde6f282b97",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc 'git -C /home/devops/datas/prompts remote -v; git -C /home/devops/datas/prompts diff --check'",
                "0",
                "completed"
              ],
              [
                "exec-0e3c828a-9056-40d1-8ed5-e2d441c96d0f",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,json,hashlib from datetime import datet",
                "0",
                "completed"
              ],
              [
                "exec-e2c7a41b-389f-4a4a-b86a-6fef6e8cf2f8",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess from pathlib import Path r=subprocess.run(['python3','-B','-m','",
                "0",
                "completed"
              ],
              [
                "exec-d03fcbfd-dd7a-407c-9549-349701771e2b",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path root=Path('/home/devops/datas/prompts');names=['ACSP','CG",
                "0",
                "completed"
              ],
              [
                "exec-04243d95-c6f9-45db-a72b-19739e5cc450",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,os out=Path('output/sgs-fixes-2.3.2').r",
                "0",
                "completed"
              ],
              [
                "exec-b3ec4fda-296d-4d23-b4d5-e5762d25ce46",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import json,hashlib p=Path('plugins/cab-approval-bridge/s",
                "0",
                "completed"
              ],
              [
                "exec-2cf604a4-1430-4cea-b86a-ddee8e9dda68",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive'",
                "0",
                "completed"
              ],
              [
                "exec-e8cb115b-b294-4c46-b2e6-a901e9eee623",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive'",
                "0",
                "completed"
              ],
              [
                "exec-435ce08c-860d-4b0c-81ab-6cade3fb7efc",
                "01a1addc-c298-7963-8eed-4e46fdd686dd",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess,json,time,re from pathlib import Path out=Path('output/sgs-fixes",
                "-1",
                "failed"
              ]
            ],
            "title": "Commandes natives du mandat commun, aperçus bornés"
          }
        ],
        "6": [
          {
            "columns": [
              "Élément",
              "État"
            ],
            "rows": [
              [
                "Agents",
                "Codex codeur direct ; orchestration absente"
              ],
              [
                "Modèle, raisonnement, tokens, coûts",
                "N/A : sources exactes non exposées"
              ],
              [
                "Commandes",
                "Historique commun conservé, sans attribution arbitraire"
              ],
              [
                "Temps",
                "Étendue calendaire du mandat commun ; pauses et service non ventilés"
              ],
              [
                "Global",
                "DELTA distinct après vérification du rapport, jamais REBUILD automatique"
              ],
              [
                "Nettoyage CAB réel",
                "Aucun RUN créé pour ce mandat ; qualification sur données contrôlées"
              ]
            ],
            "title": "Mesures et limites de collecte"
          }
        ]
      }
    }
  ]
}
-->
