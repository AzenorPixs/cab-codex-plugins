# Statistiques du change

### Agents de codage — relevé sgs-cab-2.3.0-qualification-01

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A — version du client non collectée | OpenAI | N/A | N/A — non mesuré | N/A — non mesuré | N/A — télémétrie active absente |

### Agents orchestrateurs — relevé sgs-cab-2.3.0-qualification-01

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents de codage — relevé sgs-cab-2.3.0-archived-final-02

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A — version du client non collectée | OpenAI | N/A | N/A — non mesuré | N/A — non mesuré | N/A — télémétrie active absente |

### Agents orchestrateurs — relevé sgs-cab-2.3.0-archived-final-02

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents de codage — relevé sgs-cab-2.3.1-scm-closure-03

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A — version du client non collectée | OpenAI | N/A | N/A — non mesuré | N/A — non mesuré | N/A — télémétrie active absente |

### Agents orchestrateurs — relevé sgs-cab-2.3.1-scm-closure-03

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

### Relevé sgs-cab-2.3.0-qualification-01

État historique du premier relevé : change ouvert, dépendances manquantes et archivage en attente. Le bilan de blocage a été résolu puis supprimé après archivage et vérification du rapport et du global.

Portée : cumulative.

Agent coder : codex, modèle N/A, raisonnement N/A.

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Durée globale | N/A | Mesure absente ou périmètre exhaustif non identifiable |
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

#### Qualification locale observée

| Contrôle | Réussis | Échoués ou erreurs | Ignorés | Portée |
| --- | --- | --- | --- | --- |
| SGS ciblé final | 43 | 0 | 0 | Fixtures et invariants du moteur |
| Python global | 174 | 1 | 0 | 175 tests ; test préexistant du checkpoint |
| Node global séquentiel | 1245 | 11 | 31 | 1287 cas ; reprises ciblées séparées |
| Reprise de fixtures de packaging | 3 | 0 | 0 | Trois des onze échecs ; ne pas additionner aux cas uniques |
| OpenSpec global strict | 21 | 0 | 0 | Éléments examinés ; une seule invocation, pas21commandes |

Les décisions de périmètre, permissions natives et effets exécutés restent distincts. Aucune autorisation CAB n’est inventée pour cette session directe. Voir BLOCKERS.md et QUALIFICATION.md.

### Relevé sgs-cab-2.3.0-archived-final-02

Change archivé ; mesures limitées aux preuves de ce relevé.

Portée : cumulative.

Agent coder : codex, modèle N/A, raisonnement N/A.

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Durée globale | 28516 | Bornes calendaires natives, pause incluse ; fin relevée après archivage |
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

#### Qualification finale après réconciliation

| Contrôle | Résultat | Preuve |
| --- | --- | --- |
| Python global | 185réussis,0échec | unittest discover, code0 |
| Node global | 1284réussis,31ignorés,0échec | 1315cas,394811ms, code0 |
| Node ciblé après QUERY | 10réussis,0échec | distribution et composant SGS |
| Syntaxe Python | 24fichiers, code0 | py_compile |
| Navigateurs | Chromium et Firefox réussis | output/sgs-2.3.0-browser/web-monitor-browser-results.json |
| OpenSpec strict | 21/21réussis | canon synchronisé par archive |
| Archivage | 2026-11-05-add-reusable-project-statistics | specsUpdated=true,11exigences ajoutées |
| SGS global | 176archives,génération6 | VERIFY --sources avant ajout de cette archive |

Session SCM directe, sans orchestrateur. Corrections transverses qualifiées, requêtes agnostiques et carte Statistiques vérifiées. Archivage normal réussi ; QUALIFICATION.md conserve les preuves. Les limites et essais précédents restent historiques.

### Relevé sgs-cab-2.3.1-scm-closure-03

Change archivé ; mesures limitées aux preuves de ce relevé.

Portée : cumulative.

Agent coder : codex, modèle N/A, raisonnement N/A.

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Durée globale | 30138 | Bornes du relevé calendaire de réalisation et clôture, pause incluse ; livraison2.3.1 postérieure exclue |
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

#### Qualification finale CAB2.3.1

| Contrôle | Résultat | Preuve |
| --- | --- | --- |
| Python global | 185réussis,0échec | output/sgs-finalization-2.3.1/python-results.txt |
| Node global | 1284réussis,31ignorés,0échec | output/sgs-finalization-2.3.1/node-results.json |
| Chromium / Firefox | Recettes réussies | output/sgs-finalization-2.3.1/web-monitor-browser-results.json |
| Syntaxe Python | 24fichiers réussis | output/sgs-finalization-2.3.1/syntax-results.json |
| OpenSpec | 2commandes strictes réussies ;21éléments chacune | QUALIFICATION.md |
| Skill SGS | quick_validate réussi | commande observée |
| Archivage | Archive existante conservée ;13tâches validées | tasks.md et canon |

Change archivé et clôturé au plan produit. Publication GitHub2.3.0 vérifiée ; finalisation2.3.1 qualifiée. Aucun nouvel archivage ni changement fonctionnel. Les anciennes attentes sont historiques.

## 2. Types de messages et d’outils

### Relevé sgs-cab-2.3.0-qualification-01

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Messages des codeurs | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Messages utilisateur | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Messages assistant | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels d’outils des codeurs | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels terminés | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Erreurs techniques | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels en cours | N/A | Mesure absente ou périmètre exhaustif non identifiable |

#### Collecte native et couverture

| Source | Mesure exploitable | Limite |
| --- | --- | --- |
| Codex read_thread | 136 commandes natives uniques | Deux tours ; collecte figée avant le présent rapport |
| Messages et appels outils totaux | N/A | Métadonnées de parties ne constituent pas un comptage natif exhaustif de messages |
| Tokens, cache, coûts, compactions | N/A | Mesures attribuables non exposées, aucune estimation |

### Relevé sgs-cab-2.3.0-archived-final-02

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Messages des codeurs | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Messages utilisateur | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Messages assistant | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels d’outils des codeurs | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels terminés | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Erreurs techniques | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels en cours | N/A | Mesure absente ou périmètre exhaustif non identifiable |

#### Collecte native et couverture

| Source | Mesure exploitable | Limite |
| --- | --- | --- |
| Codex read_thread | 136 commandes natives uniques | Deux tours ; collecte figée avant le présent rapport |
| Messages et appels outils totaux | N/A | Métadonnées de parties ne constituent pas un comptage natif exhaustif de messages |
| Tokens, cache, coûts, compactions | N/A | Mesures attribuables non exposées, aucune estimation |

### Relevé sgs-cab-2.3.1-scm-closure-03

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Messages des codeurs | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Messages utilisateur | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Messages assistant | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels d’outils des codeurs | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels terminés | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Erreurs techniques | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels en cours | N/A | Mesure absente ou périmètre exhaustif non identifiable |

Même session directe Codex, sans orchestrateur ni télémétrie de pilotage. Modèle exact, tokens, coûts et temps actif non exposés restent N/A.

## 3. Fichiers modifiés

### Relevé sgs-cab-2.3.0-qualification-01

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Écritures effectivement exécutées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Fichiers distincts touchés par change | N/A | Mesure absente ou périmètre exhaustif non identifiable |

#### Fichiers principaux du périmètre

| Chemin absolu | Portée | Écritures | Refus | Erreurs |
| --- | --- | --- | --- | --- |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cab_sgs.py | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/sgs/SKILL.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/sgs/agents/openai.yaml | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/sgs/references/schema.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/.codex/commands/SGS.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/tests/test_sgs.py | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/tests/active-component-update.test.mjs | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/PROJECT.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/TECHNICAL.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/BUILD.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/README.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/CHANGELOG.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/DEVELOPMENT_MAP.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/openspec/BATCH_CODES.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |

Liste ciblée, non assimilée à un nombre exhaustif de fichiers touchés ou d’écritures. Les incréments de version et modifications préexistantes sont distingués ; aucun nombre de tentatives déduit du diff Git. Les treize prompts modifiés sont dans /home/devops/datas/prompts.

### Relevé sgs-cab-2.3.0-archived-final-02

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Écritures effectivement exécutées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Fichiers distincts touchés par change | N/A | Mesure absente ou périmètre exhaustif non identifiable |

#### Fichiers principaux du périmètre

| Chemin absolu | Portée | Écritures | Refus | Erreurs |
| --- | --- | --- | --- | --- |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cab_sgs.py | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/sgs/SKILL.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/sgs/agents/openai.yaml | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/sgs/references/schema.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/.codex/commands/SGS.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/tests/test_sgs.py | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/tests/active-component-update.test.mjs | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/PROJECT.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/TECHNICAL.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/BUILD.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/README.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/CHANGELOG.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/DEVELOPMENT_MAP.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |
| /home/devops/datas/cab/openspec/BATCH_CODES.md | Moteur, distribution, tests ou documentation ciblée | N/A | N/A | N/A |

Liste ciblée, non assimilée à un nombre exhaustif de fichiers touchés ou d’écritures. Les incréments de version et modifications préexistantes sont distingués ; aucun nombre de tentatives déduit du diff Git. Les treize prompts modifiés sont dans /home/devops/datas/prompts.

### Relevé sgs-cab-2.3.1-scm-closure-03

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Écritures effectivement exécutées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Fichiers distincts touchés par change | N/A | Mesure absente ou périmètre exhaustif non identifiable |

#### Fichiers amendés pour la clôture2.3.1

| Chemin | Portée |
| --- | --- |
| /home/devops/datas/cab/.codex/commands/CAB.md | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/.codex/commands/CABU.md | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/.codex/commands/SGS.md | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/BUILD.md | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/CHANGELOG.md | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/DEVELOPMENT_MAP.md | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/PROJECT.md | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/README.md | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/TECHNICAL.md | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/openspec/BATCH_CODES.md | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/openspec/changes/archive/2026-11-05-add-reusable-project-statistics/QUALIFICATION.md | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/openspec/changes/archive/2026-11-05-add-reusable-project-statistics/SESSION_OBSERVATION.json | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_journal.py | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_router.py | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_server.py | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cab_sgs.py | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-approval-metadata.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-artifact-proof.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-cleanup.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-context-portability.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-continuity.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-efficiency.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-erasure-manager.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-forward-repair.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-import-observations.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-manifest-extensions.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-transition.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-management.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-native-instances.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-policy.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-replies.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-port-recovery.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prepare-model-policy.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-provider-connect.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-recovery-evidence.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-recovery.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runtime-migration.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-lifecycle.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-stage.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-source-read.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-state-layout.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update-credential.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/distribution-validation.json | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-monitor.service | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/plugins/cabu/.codex-plugin/plugin.json | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/pyproject.toml | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/src/cgpt_approval_bridge_journal.py | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/src/cgpt_approval_bridge_router.py | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/src/cgpt_approval_bridge_server.py | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/active-component-update.test.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/approval-metadata.test.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/autonomous-recovery.test.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/concurrent-controller.test.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/controller-service-distribution.test.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/maintenance-bootstrap.test.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/monitor-service-start.test.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/native-instances.test.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/native-opencode.test.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/opencode-v2-client.test.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/protocol-continuity.test.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/provider-connect.test.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/shell-lifecycle.test.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/test_crash_recovery.py | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/test_session_reset.py | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/web-monitor-browser.mjs | Version de distribution ou preuve documentaire de clôture |
| /home/devops/datas/cab/tests/web-monitor.test.mjs | Version de distribution ou preuve documentaire de clôture |

Liste exhaustive des fichiers actuellement amendés pour cette clôture, distincte de la liste historique complète du change ; aucune mesure de fichiers ou d’écritures déduite du diff Git.

## 4. Commandes

### Relevé sgs-cab-2.3.0-qualification-01

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Commandes exécutées | 136 | SESSION_OBSERVATION.json ; 136 identifiants commandExecution uniques sur deux tours ; sorties exclues |
| Commandes réussies | 126 | SESSION_OBSERVATION.json ; 136 identifiants commandExecution uniques sur deux tours ; sorties exclues |
| Commandes en échec | 10 | SESSION_OBSERVATION.json ; 136 identifiants commandExecution uniques sur deux tours ; sorties exclues |
| Tests exécutés dans le bilan final | N/A | Qualification globale non terminée ; suites et reprises ciblées documentées séparément, aucun total final vert inventé |
| Tests finaux réussis | N/A | Qualification globale non terminée ; suites et reprises ciblées documentées séparément, aucun total final vert inventé |
| Tests finaux échoués | N/A | Qualification globale non terminée ; suites et reprises ciblées documentées séparément, aucun total final vert inventé |
| Fichiers ayant passé un contrôle syntaxique | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Validations OpenSpec standard réussies | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Validations OpenSpec standard échouées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Validations OpenSpec strictes réussies | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Validations OpenSpec strictes échouées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tâches OpenSpec prouvées et terminées | N/A | Mesure absente ou périmètre exhaustif non identifiable |

#### Commandes natives observées, avant rédaction du rapport

| Commande (100 caractères max) | Exécutions | Code de sortie | Preuve native |
| --- | --- | --- | --- |
| /usr/bin/zsh -lc 'cat openspec/changes/add-reusable-project-statistics/CHECKPOINT.md' | 1 | 0 | exec-2d93fa92-d705-4f5e-a8d5-92c99be76a37 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import json for name in ['AGENTS.md','p… | 1 | 0 | exec-3f9c3908-16bb-4766-a8bc-456a3404e994 |
| /usr/bin/zsh -lc 'git status --short' | 1 | 0 | exec-fc96165c-fff5-4fe7-82c6-93abc466daa0 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import re,json roots=['src','plugins/ca… | 1 | 0 | exec-d1b2479a-63cf-49a9-a233-1a88b5cdf84e |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/ski… | 1 | 0 | exec-d9657820-fafd-443f-9086-11e2289a8756 |
| /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --s… | 1 | 0 | exec-90740ea2-6a2b-494b-a701-61ea45c1c024 |
| /usr/bin/zsh -lc "python3 -B -m unittest discover -s tests -p 'test_*.py'" | 1 | 1 | exec-bb782200-d69f-419c-a026-ea78342b2942 |
| /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,sys,tempfile,os pa… | 1 | 0 | exec-ff51424a-3031-4e57-959f-4acaab57b8bd |
| /usr/bin/zsh -lc "sed -n '1,140p' tests/test_change_erasure.py; sed -n '8430,8530p' src/cgpt_approv… | 1 | 0 | exec-280d46e7-742f-4ced-911c-5a52c4fc5c13 |
| /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import json,hashlib registry=json.lo… | 1 | 0 | exec-3d32e005-abb2-4902-9a52-912a22fc05d3 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name in ['.gitignore','openspec/cha… | 1 | 0 | exec-9d485ac8-431e-475f-aa26-183fba821c30 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('.gitignore');s=p.read_text() if… | 1 | 0 | exec-a0ca0c24-97e2-42ef-b0cd-6e397075ccc5 |
| /usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valid… | 1 | 0 | exec-15fdf4b2-f761-4029-895e-e446dad05880 |
| /usr/bin/zsh -lc 'git diff --check -- SGS.md ACSP.md CGP.md CISM.md CISMP.md ISM.md ISMP.md RCAM.md… | 1 | 0 | exec-4bbd2431-523a-4493-99b5-10ff42d6d070 |
| /usr/bin/zsh -lc 'git diff --check' | 1 | 2 | exec-b46317df-522a-4e8e-a587-a78bbcda7328 |
| /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive' | 1 | 0 | exec-d91115cd-3d3c-4ac4-9da4-2f512c13b384 |
| /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 1 | 0 | exec-29915495-a852-4dcd-aa75-8a69d655ec3c |
| /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess from pathlib import Path files=sorted(str(p… | 1 | 0 | exec-75a2e005-10a7-432b-9938-3b9c38e661d1 |
| /usr/bin/zsh -lc "python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUIL… | 1 | 0 | exec-f7b20f06-d629-4d67-bad4-7c4a0daa92b3 |
| /usr/bin/zsh -lc "rg -n 'unsafe\|0o775\|mode' plugins/cab-approval-bridge/scripts/cgpt-approval-bridg… | 1 | 0 | exec-4ffa3ee1-789d-4bcc-bffc-1dfb149a2bb2 |
| /usr/bin/zsh -lc "sed -n '34,82p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-a… | 1 | 0 | exec-d77bf602-1505-4997-8105-5cbb82c5ad02 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import os,stat print('Acteur',os.getuid… | 1 | 0 | exec-ecd1d168-c85f-406d-8a0f-c1858f58b580 |
| /usr/bin/zsh -lc "node --input-type=module - <<'JS' import {mkdtemp,cp,chmod,lstat,readdir,rm} from… | 1 | 0 | exec-0cf53168-7647-4e9a-8f52-90f468eb6413 |
| /usr/bin/zsh -lc "rg -n 'corr.le les commandes\|strictCommands=true' tests --glob '*.test.mjs'; sed … | 1 | 0 | exec-9364feb6-af90-4529-99a2-79ef4f7d2753 |
| /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-r… | 1 | 0 | exec-b1276842-2329-49ad-85d6-d1c99bfa737d |
| /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-r… | 1 | 0 | exec-ff9f0aab-c0da-4d9d-a9c2-a043d06aa31b |
| /usr/bin/zsh -lc "node --test --test-name-pattern 'trois artefacts cibles\|propriétaires expliciteme… | 1 | 0 | exec-1075d8e8-ccfa-4182-a6aa-21cef956a60a |
| /usr/bin/zsh -lc "sed -n '720,748p' tests/controller-configuration.test.mjs; rg -n 'externalRoots\|b… | 1 | 1 | exec-35ad829f-6c06-4d5c-b59e-693ab167e218 |
| /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,tempfile probes=[]… | 1 | 0 | exec-7bf62a01-5104-43c6-802a-061aff047ab4 |
| /usr/bin/zsh -lc "rg -n 'permission\|experimental\|saved' tests/controller-session-recovery.test.mjs … | 1 | 1 | exec-005ce7af-5f4d-4d25-a84d-874f25bf758a |
| /usr/bin/zsh -lc "rg -n 'native-permission-control-unavailable\|savedPermissions\|saved.*permission\|p… | 1 | 0 | exec-b4911f24-5aea-4c90-9f18-ae2225db5877 |
| /usr/bin/zsh -lc "rg -n 'openCodeV2TestHandler' tests/controller-session-recovery.test.mjs tests/co… | 1 | 0 | exec-8e1870ed-0401-4418-9fd9-6b0b7b67a835 |
| /usr/bin/zsh -lc "sed -n '118,230p' tests/helpers/opencode-v2-test-server.mjs; sed -n '174,201p' pl… | 1 | 0 | exec-5c16f012-6a1c-4ac1-84dd-b0812eec9482 |
| /usr/bin/zsh -lc "sed -n '1,58p' tests/helpers/opencode-v2-test-server.mjs; sed -n '750,788p' plugi… | 1 | 0 | exec-5173069f-27ac-49ee-b9d0-962d4c72cecd |
| /usr/bin/zsh -lc "rg -n 'async function session\\(\|projectID:' plugins/cab-approval-bridge/scripts/… | 1 | 0 | exec-b3a85c9f-3c1f-4171-b7a7-0660fa31494d |
| /usr/bin/zsh -lc "sed -n '832,866p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-openco… | 1 | 0 | exec-dd32498a-d007-4b29-96e7-d7260b888cc6 |
| /usr/bin/zsh -lc "sed -n '160,188p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-openco… | 1 | 0 | exec-451847d0-fca9-4a75-a1ef-172fb15ffadb |
| /usr/bin/zsh -lc "rg -n 'nativePermissionPolicy\|checkNativeAsk\\(' plugins/cab-approval-bridge/scri… | 1 | 0 | exec-4a018fc9-382e-4c5d-803b-f447d06afa65 |
| /usr/bin/zsh -lc "rg -n 'kind: \"command\"\|kind: .command.\|kind: \"bash\"\|nativeKind.*=' plugins/ca… | 1 | 0 | exec-29f1b8bb-d841-4974-9011-92683ad03a1b |
| /usr/bin/zsh -lc "sed -n '36,72p' tests/controller-session-recovery.test.mjs; sed -n '112,155p' tes… | 1 | 1 | exec-c118e330-29d6-4fc9-a434-8eb55a7fea3e |
| /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import tempfile,subprocess source=Pa… | 1 | 0 | exec-36b60972-a862-40aa-94b6-a2b8b6179f4b |
| /usr/bin/zsh -lc "rg -n 'function hasNativeAsk\|function nativeAskState\|nativeAskState' plugins/cab-… | 1 | 0 | exec-ab0eb899-3576-4cd2-916e-ea94c9dfb543 |
| /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY… | 1 | 0 | exec-ccdb4f35-b5f2-41b0-9d59-f7e5dba52d4e |
| /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 1 | 0 | exec-408eb40e-c494-4ba6-b208-d06c72473601 |
| /usr/bin/zsh -lc "cat /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/prompt/S… | 1 | 0 | exec-3f5233a4-4fa5-4156-b7f6-a85e5633040e |
| /usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/p… | 1 | 0 | exec-5abc3f47-a485-4d64-981e-6e9d0ad3e7e0 |
| /usr/bin/zsh -lc "sed -n '300,525p' /home/devops/datas/prompts/SCM.md; sed -n '526,750p' /home/devo… | 1 | 0 | exec-f5f16c73-5c75-4b40-9835-90259d980980 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path paths=['.agents/plugins/marketplace.jso… | 1 | 0 | exec-9a25e209-710b-4f9d-80da-e1bc24269ea5 |
| /usr/bin/zsh -lc "sed -n '680,1050p' /home/devops/datas/prompts/SGS.md" | 1 | 0 | exec-b427ab8a-b6c4-4c50-8be9-5e918db2708d |
| /usr/bin/zsh -lc "sed -n '1,240p' /home/devops/datas/prompts/ACL.md" | 1 | 0 | exec-3b86632f-f920-4de0-97f3-892e47975ff3 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name in ['openspec/specs/archive-se… | 1 | 0 | exec-1167c77b-be28-4b5c-a8a8-6e9c4bdf98e6 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path from collections import Counter labels=… | 1 | 0 | exec-af4a72a9-2965-4876-b790-2591dab36613 |
| /usr/bin/zsh -lc "rg -n 'export\|argv\|statistics/view\|bundle\|changeId\|change_id\|tokens\|inputTokens\|m… | 1 | 0 | exec-cb4d3e36-b757-446d-9fc8-259b8f43ecfc |
| /usr/bin/zsh -lc "sed -n '20,85p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observat… | 1 | 0 | exec-670187cb-8858-4bc7-9ead-ea435ff8cd14 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name,start,end in [('/home/devops/d… | 1 | 0 | exec-5ca9019a-a052-464e-ac01-87017649a4b1 |
| /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --s… | 1 | 1 | exec-e3653faf-b6a6-4d3f-bad1-95458648fc00 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-p… | 1 | 0 | exec-972c94b7-7d5a-40a3-989b-4ecb0635156a |
| /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --s… | 1 | 0 | exec-27e815e7-c768-47d3-8475-80a3abe6e890 |
| /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py INSPEC… | 1 | 0 | exec-267a65f4-43aa-46d9-beb0-93829f0dcde3 |
| /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -v' | 1 | 0 | exec-9fcd3c27-eaad-4fdd-93e2-f0c15f453732 |
| /usr/bin/zsh -lc "python3 -B - <<'PY' import sys from pathlib import Path from collections import C… | 1 | 0 | exec-40ab9781-58c7-4828-8cd2-431367478d35 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path names=['2026-10-06-fix-manual-controlle… | 1 | 0 | exec-eac4e0e5-8273-46b8-8038-2d34ae66ccce |
| /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path from collections import Counter impo… | 1 | 0 | exec-f306fb31-1b5a-436e-956d-9d1c603ce093 |
| /usr/bin/zsh -lc "rg -n 'CABU\\.md\|CAB\\.md\|commandFiles\|commands/\|commandNames' plugins/cab-approv… | 1 | 0 | exec-e1144a89-ea26-42f8-ac4a-d0f335a035f2 |
| /usr/bin/zsh -lc "rg -n 'CABU.md\|CAB.md\|commands\|script' plugins/cab-approval-bridge/skills/approva… | 1 | 0 | exec-63fa3f7a-5405-413b-b827-a3e1600a3d62 |
| /usr/bin/zsh -lc "rg -l '2\\.2\\.39' pyproject.toml .agents/plugins/marketplace.json .codex/command… | 1 | 0 | exec-cd76ad7e-7923-4f6f-9ffc-9462b94dd94c |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('/home/devops/datas/prompts/SGS.… | 1 | 0 | exec-a68d478b-df97-43f2-ba07-4eb0e66f8ff0 |
| /usr/bin/zsh -lc "python3 -B - <<'PY' import sys,re from pathlib import Path sys.path.insert(0,'plu… | 1 | 0 | exec-fcac10fa-9456-4872-8b7b-161af5fe3af2 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path names=['2026-10-29-fix-codemode-discove… | 1 | 0 | exec-71ddd768-b7d9-4787-8996-d1497ab66958 |
| /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 1 | 0 | exec-455aeec4-de73-48b6-8b6e-1449147f969f |
| /usr/bin/zsh -lc "python3 -B - <<'PY' import sys,re from pathlib import Path from collections impor… | 1 | 0 | exec-c67f9d47-398c-4ec6-a73c-469a71dc44a8 |
| /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import sys,re sys.path.insert(0,'plu… | 1 | 0 | exec-28931476-48fb-41ef-b20e-5ea96faa4a3b |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name in ['2026-10-28-fix-update-cre… | 1 | 0 | exec-e0004c32-cb5b-4448-9997-29b2f1985dd2 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path root=Path('/home/devops/datas/prompts')… | 1 | 0 | exec-67810e5e-1284-4c6f-b4c7-c06ff1764bb4 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import json section='''## Statistiques … | 1 | 0 | exec-84e78de2-0ef0-4970-ac65-57318a8f84ee |
| /usr/bin/zsh -lc "rg -n 'REQUIRED\|MODULE\|scripts.*readdir\|readdir.*scripts\|requiredFiles\|REQUIRED_S… | 1 | 0 | exec-7a0f2f9c-64b1-4c22-bace-f1a910478927 |
| /usr/bin/zsh -lc "sed -n '1128,1175p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-upda… | 1 | 0 | exec-840e1231-ff2a-44f8-8716-2cd4c482f8fb |
| /usr/bin/zsh -lc "sed -n '85,145p' tests/active-component-update.test.mjs; sed -n '300,330p' tests/… | 1 | 0 | exec-c9cb9b06-e4c9-4630-89a9-2023b91a298e |
| /usr/bin/zsh -lc "sed -n '1,62p' tests/controller-service-distribution.test.mjs; sed -n '1,70p' tes… | 1 | 0 | exec-1720b81c-8bbc-4c5e-a31f-df2ff40f17ad |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name,a,b in [('2026-10-20-fix-stopp… | 1 | 0 | exec-ab5a70c9-649c-41d5-ba53-1cb197313722 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import json,hashlib base=Path('openspec… | 1 | 0 | exec-c1547b16-255b-4cf7-bf5e-5f723d81b947 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path from datetime import datetime,timezone … | 1 | 0 | exec-394f660d-4219-4e87-aac4-a61a5b2d9e91 |
| /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -v' | 1 | 0 | exec-e43a35da-d21f-4934-bbe6-b1a3eca344d8 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import re names=[p.name for p in Path('… | 1 | 0 | exec-49d005aa-93b9-496b-b9af-34ccfa68cf41 |
| /usr/bin/zsh -lc 'node --test tests/controller-service-distribution.test.mjs tests/active-component… | 1 | 1 | exec-67df5100-54df-4aaa-9c36-13b4ce5bb474 |
| /usr/bin/zsh -lc "python3 - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-name… | 1 | 0 | exec-d03dee9a-3f79-4ba1-8ef0-68facd714144 |
| /usr/bin/zsh -lc "node --test --test-name-pattern 'déploiement complet puis deuxième invocation' te… | 1 | 1 | exec-27f681f9-df88-48fa-9ff1-d8de66f8b583 |
| /usr/bin/zsh -lc "sed -n '235,266p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update… | 1 | 0 | exec-38076540-b5d9-42ca-a327-262e47264ed7 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('tests/controller-service-distri… | 1 | 0 | exec-3fa4cc97-d662-47ce-84aa-54c793d7e467 |
| /usr/bin/zsh -lc "node --test --test-name-pattern 'déploiement complet puis deuxième invocation' te… | 1 | 0 | exec-0e7a47f0-3157-4c51-be22-d4b2d2d3c629 |
| /usr/bin/zsh -lc "sed -n '1,26p' tests/active-component-update.test.mjs; sed -n '282,310p' tests/ac… | 1 | 0 | exec-bac7559c-0b0e-4bf5-88ff-5711ab13b87c |
| /usr/bin/zsh -lc "sed -n '250,275p' tests/controller-service-distribution.test.mjs; sed -n '610,645… | 1 | 0 | exec-f48e6281-337a-49f2-9d59-0936cd52a82a |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import difflib for name in ['server','r… | 1 | 0 | exec-db368ede-0a73-42fe-b1d3-38ea2a5ae1df |
| /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import sys sys.path.insert(0,'plugin… | 1 | 0 | exec-e61ab735-81f2-419c-8ce9-212b75e74ea5 |
| /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 1 | 0 | exec-19485cc5-1576-41f3-9e51-4dc80355ec65 |
| /usr/bin/zsh -lc "rg -n 'écrire\|écriture\|rapport\|STATISTICS\|six sections' plugins/cab-approval-brid… | 1 | 0 | exec-2fe1dca3-b404-4972-8411-3287f0a32b4a |
| /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-r… | 1 | 0 | exec-ff79d6a8-1a57-4580-b4c8-2a79b844f525 |
| /usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valid… | 1 | 0 | exec-f74dec45-00c4-4a35-a8d0-cae06267b781 |
| /usr/bin/zsh -lc "python3 - <<'PY' import os,re,shutil from pathlib import Path from collections im… | 1 | 0 | exec-37642c17-44fc-4061-9e2d-83e40ef03bba |
| /usr/bin/zsh -lc "python3 - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-repo… | 1 | 0 | exec-64d7a9b2-ec18-4efa-8124-f6ea1b66594f |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import re p=Path('plugins/cab-approval-… | 1 | 0 | exec-d3618598-8ae8-4aa6-852e-ae67fed9e60a |
| /usr/bin/zsh -lc "python3 -B -m unittest discover -s tests -p 'test_*.py'" | 1 | 0 | exec-3704bd5a-c4ce-493e-bb44-f316cc99832e |
| /usr/bin/zsh -lc "python3 -B - <<'PY' import sys,json from pathlib import Path from collections imp… | 1 | 0 | exec-f6c2f99b-4ce0-4ab7-aca5-d49a10036c8b |
| /usr/bin/zsh -lc "python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUIL… | 1 | 0 | exec-3910e0e1-5885-46dd-828c-ac68d59406e7 |
| /usr/bin/zsh -lc "node --test --test-name-pattern 'update prépare les trois commandes' tests/contro… | 1 | 0 | exec-04e4f30b-4730-459d-a5e4-62cf3b1ad556 |
| /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY… | 1 | 0 | exec-aacc3ce7-fbeb-4b62-a893-33fdfdfe313b |
| /usr/bin/zsh -lc "sed -n '1,100p' STATISTICS.md; sed -n '175,285p' STATISTICS.md; python3 -B -m uni… | 1 | 0 | exec-e8935fdc-c541-4e33-ad77-a7525f093b34 |
| /usr/bin/zsh -lc "sed -n '1,125p' AGENTS.md" | 1 | 0 | exec-219d5b51-d9df-48d7-82e5-c6b6022774b2 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name in ['PROJECT.md','TECHNICAL.md… | 1 | 0 | exec-26885462-2a16-4bd3-9f6f-7d8a98513895 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name in ['openspec/changes/archive/… | 1 | 0 | exec-c738d86b-555c-4626-9639-01c2c28f69ee |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import re selected=[] for p in sorted(P… | 1 | 0 | exec-1d58a524-486e-4450-9a54-b447f67e2ceb |
| /usr/bin/zsh -lc "sed -n '1330,1380p' /home/devops/datas/prompts/SGS.md" | 1 | 0 | exec-3f13f078-f01d-4857-9ca7-7a7ed1f3ac16 |
| /usr/bin/zsh -lc "sed -n '1,20p' openspec/changes/add-reusable-project-statistics/specs/global-proj… | 1 | 0 | exec-83713605-14cb-4da9-bcc7-ace764bf86cc |
| /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --s… | 1 | 0 | exec-c3684e1e-f8a5-444c-8122-9d9db8c9a3bd |
| /usr/bin/zsh -lc "rg -n '"'^def render\|elif section\|percentage_keys\|for kind in'"' plugins/cab-appr… | 1 | 0 | exec-676df164-71f6-419c-9855-51571ea390c4 |
| /usr/bin/zsh -lc "sed -n '1082,1198p' plugins/cab-approval-bridge/scripts/cab_sgs.py" | 1 | 0 | exec-1ba7063e-8ade-4252-8eb7-f33699612a69 |
| /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py INSPEC… | 1 | 0 | exec-028bf6d4-5340-4360-8a42-420420f75bed |
| /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 1 | 0 | exec-129ef2b0-97be-42e1-8029-cd0f0fef7e90 |
| /usr/bin/zsh -lc "python3 -B - <<'PY' import sys from pathlib import Path from collections import C… | 1 | 0 | exec-994e5735-0f2d-4d2a-9595-a832ce1c75d3 |
| /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path from collections import Counter impo… | 1 | 0 | exec-1974519e-1de6-455d-a999-02efbc4f55bf |
| /usr/bin/zsh -lc "python3 -B - <<'PY' import sys from pathlib import Path from collections import C… | 1 | 0 | exec-cb402fd6-da3b-426f-b92f-d9b011dbb630 |
| /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path from collections import Counter impo… | 1 | 0 | exec-179bb291-7a95-48e9-b3f1-ecbd34d33702 |
| /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 1 | 0 | exec-4ebda2f8-1d5c-4030-bc4c-d2fcb12e03cd |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/ski… | 1 | 0 | exec-67283e5a-9257-44c7-8d52-b91f88436596 |
| /usr/bin/zsh -lc 'cat /home/adema261/.codex/plugins/cache/openai-curated-remote/write-like-me/0.1.1… | 1 | 0 | exec-cf01ccc2-fed7-4ce9-9f30-f2f03dfba406 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import os,shutil print('sudo:',shutil.w… | 1 | 1 | exec-0d33cf86-e9d2-41f1-b5b9-6caa143bd300 |
| /usr/bin/zsh -lc "rg -n 'action=recover\|def publish\|def recover\|recover\\(root\\)' plugins/cab-appr… | 1 | 0 | exec-57352ecf-b65b-48ca-ad13-c2905d968267 |
| /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 1 | 1 | exec-6e2f2d31-6774-47d3-8707-b04a052e9217 |
| /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 1 | 0 | exec-b30f631e-5ee1-46a2-9811-0ea2f1ffa390 |
| /usr/bin/zsh -lc "rg -n 'copie.*broker\|broker.*copie\|DIU\|cicd\|synchron.*broker' BUILD.md" | 1 | 0 | exec-db1f98b3-b1df-480b-980d-abdc5fb8104f |
| /usr/bin/zsh -lc 'sudo -n -l -- /usr/local/bin/diu projects cicd cab 2.2.40' | 1 | 0 | exec-38b7421e-f403-4bd1-8992-740b3306ff59 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import stat for name in ['AGENTS.md','s… | 1 | 0 | exec-7e0480e9-ce28-47c4-878a-ae6d5462028b |
| /usr/bin/zsh -lc 'node --test tests/controller-service-distribution.test.mjs' | 1 | 0 | exec-4a19a760-b938-4c77-8780-df7252b74b5f |
| /usr/bin/zsh -lc "python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUIL… | 1 | 0 | exec-1ef6c7c7-1eab-43ca-b151-89126c1d2063 |
| /usr/bin/zsh -lc "python3 -B -m unittest discover -s tests -p 'test_*.py'" | 1 | 0 | exec-86599ae1-1ef1-4010-8933-c0c2a7d75e53 |
| /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('/home/devops/datas/cab/openspec… | 1 | 0 | exec-bbb1ef36-b269-4c74-a906-faf0bedf0db0 |

126 commandes natives ont un code0 et10 un code non nul. Le code d’une enveloppe Python ne prouve pas la réussite du test Node qu’elle capture ; les résultats des suites figurent en section1. Une invocation contenant plusieurs opérations reste une seule exécution native.

### Relevé sgs-cab-2.3.0-archived-final-02

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Commandes exécutées | 234 | SESSION_OBSERVATION.json ; relevé natif figé sur trois tours, identifiants dédupliqués, sorties exclues |
| Commandes réussies | 219 | SESSION_OBSERVATION.json ; relevé natif figé sur trois tours, identifiants dédupliqués, sorties exclues |
| Commandes en échec | 15 | SESSION_OBSERVATION.json ; relevé natif figé sur trois tours, identifiants dédupliqués, sorties exclues |
| Tests exécutés dans le bilan final | 1469 | QUALIFICATION.md ; dernier bilan validé, campagnes répétées et31ignorés exclus des tests produit |
| Tests finaux réussis | 1469 | QUALIFICATION.md ; dernier bilan validé, campagnes répétées et31ignorés exclus des tests produit |
| Tests finaux échoués | 0 | QUALIFICATION.md ; dernier bilan validé, campagnes répétées et31ignorés exclus des tests produit |
| Fichiers ayant passé un contrôle syntaxique | 24 | QUALIFICATION.md ; dernier bilan validé, campagnes répétées et31ignorés exclus des tests produit |
| Validations OpenSpec standard réussies | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Validations OpenSpec standard échouées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Validations OpenSpec strictes réussies | 21 | QUALIFICATION.md ; dernier bilan validé, campagnes répétées et31ignorés exclus des tests produit |
| Validations OpenSpec strictes échouées | 0 | QUALIFICATION.md ; dernier bilan validé, campagnes répétées et31ignorés exclus des tests produit |
| Tâches OpenSpec prouvées et terminées | 13 | QUALIFICATION.md ; dernier bilan validé, campagnes répétées et31ignorés exclus des tests produit |

#### Commandes natives observées au relevé final

| Identifiant | Tour | Commande (aperçu borné) | Code | État |
| --- | --- | --- | --- | --- |
| exec-bdf1241c-498e-48e7-a297-4cc29e26532e | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '100,120p' tests/test_change_erasure.py; sed -n '184,199p' plugins/cab-appr | 0 | completed |
| exec-8edc7650-35e7-4c1d-81e6-e0319e220eb7 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '184,210p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencod | 0 | completed |
| exec-9a7dcb6a-bbeb-4343-9938-706b3f7c9fd5 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '1,68p' tests/monitor-service-start.test.mjs; head -18 tests/web-monitor.te | 0 | completed |
| exec-f42f2977-e752-4078-bca3-8e63208f66cb | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'components\|component\|briques\|version\|health\|/api/identity' plugins/cab-appr | 0 | completed |
| exec-7c201d29-4fb2-438e-89c7-09f7e8d56514 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_change_erasure.py -v' | 0 | completed |
| exec-d5d279b9-848d-4556-95e0-698ea92d4014 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re | 0 | completed |
| exec-43e52a4c-9c88-4620-b2c7-00f13d20b6da | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '1,80p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-da | 0 | completed |
| exec-b9b58343-7162-46d6-950d-d278ec69110c | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'node --test tests/change-erasure.test.mjs tests/change-erasure-integration.test.mj | 0 | completed |
| exec-cd02771f-e047-4c45-a231-a37d931c6d8a | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re | 0 | completed |
| exec-9cf691c7-1150-4113-b503-7c358fff9704 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'statistics\|health.*grid\|grid.*health\|\\.health' plugins/cab-approval-bridge | 0 | completed |
| exec-a31df694-134a-422a-8efb-b529b21b747d | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st | 0 | completed |
| exec-8427044f-b953-4738-aa49-0d9f8cde392e | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n '"'^function isStale\|const isStale\|monitor-data\|process-lifecycle.mjs\|script | 0 | completed |
| exec-bf48623c-b191-4481-b8d2-611ba4a370e8 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/web- | 0 | completed |
| exec-afb75ea9-3e36-4d9b-9a04-f7e9184a9fd9 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'node --test tests/sgs-component.test.mjs' | 0 | completed |
| exec-e483ae6c-87c7-4bfc-931e-45f570285a58 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import json,hashlib root=Path('.') paths | 0 | completed |
| exec-ee2679f1-77c2-49e4-9797-0bbeed39af06 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'componentVersions\|sources\\)\|sources\\]\|components.*5\|copied.length\|a-z0-9' | 0 | completed |
| exec-faa3fae0-9758-4282-8daa-a45bb15665b2 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '176,201p' tests/web-monitor.test.mjs; python3 - <<'PY' from pathlib import | 0 | completed |
| exec-b34262fa-4486-4963-8784-e0ab8d2383ef | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '200,253p' tests/web-monitor-browser.mjs; sed -n '425,442p' tests/web-monit | 0 | completed |
| exec-b9be95f3-d36e-4584-8bd7-a18bb52ed67d | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'nativeAction\|source.type.*shell\|nativeAction.*shell' plugins/cab-approval-b | 0 | completed |
| exec-ec7e64e3-59a2-4298-ad6d-9b582f3afca5 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "node --test --test-name-pattern 'corrèle les commandes avec strictCommands=true\|re | 0 | completed |
| exec-226330fb-c89b-43f8-a46d-6d29bad35aac | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess files=['tests/controller-configuration.test. | 0 | completed |
| exec-01697df6-6e82-4a84-b294-10ee73ee5693 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for kind in ['server','router','journal' | 0 | completed |
| exec-b6197583-352e-47e1-a7d1-5708d40be8ce | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('tests/web-monitor-browser.mjs'); | 0 | completed |
| exec-d87af084-4eba-4461-9b90-63bfaeadff09 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess files=['tests/controller-configuration.test. | 0 | completed |
| exec-f8e223c5-6f19-416d-af57-0ff1635fbc20 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess,os from pathlib import Path out=Path('/home/ | 0 | completed |
| exec-5681d202-1302-4984-b212-b8f65006e6bd | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '908,947p' tests/controller-session-recovery.test.mjs; python3 - <<'PY' fro | 0 | completed |
| exec-93fcbba2-8768-4f22-8bb3-aeb106270ce8 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "node --test --test-name-pattern 'reconcile refuse autorisation absente' tests/cont | 1 | failed |
| exec-d66d96a5-d534-4199-b690-e4da6f930cba | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'preflight-native-ask-required\|preflight-native-allow-not-proved' plugins/ca | 0 | completed |
| exec-1bdb13be-3d61-44b5-927a-c1f337c20ca7 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '1230,1285p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-c | 0 | completed |
| exec-f2a678b7-c2e1-4669-b056-ce1f2f099999 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "node --test --test-name-pattern 'reconcile refuse autorisation absente' tests/cont | 0 | completed |
| exec-85185e6d-4928-4972-8f94-4cb463527f0d | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,json,re from urllib | 0 | completed |
| exec-82526340-7f41-4bcd-810f-4a9ef88afca0 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "git log -1 --format='%H %s'" | 0 | completed |
| exec-e45c3105-2d1c-470a-b549-079fd689f877 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'projects.*cicd\|project.*cicd\|git.*push\|force-with-lease' /home/devops/datas | 2 | failed |
| exec-71f72d39-39fc-448e-8476-090b90ae3fe5 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '1390,1425p' /home/devops/datas/diu/root-install-debian.sh; rg --files /hom | 0 | completed |
| exec-e7cd304e-0b21-4271-9e9a-0135886d0063 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '1414,1485p' /home/devops/datas/diu/root-install-debian.sh; rg -n '"'^.*cic | 0 | completed |
| exec-47ec058d-d26c-4b7b-890d-1783cabf0401 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '485,516p' /home/devops/datas/diu/modules/projects/git.sh; sed -n '557,614p | 0 | completed |
| exec-f8536084-7701-4ec2-b383-2fbb6c18e770 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '820,867p' /home/devops/datas/diu/modules/projects/git.sh; sed -n '3514,354 | 0 | completed |
| exec-cec64588-ea2f-42c3-a60b-01a8d09ee294 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'PROJECTS_CICD_RECONCILE' /home/devops/datas/diu/modules/projects/git.sh" | 0 | completed |
| exec-9ac5eb22-1bcc-463b-ba59-48e921adac7f | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'GIT_TERMINAL_PROMPT=0 git fetch --no-tags github main' | 0 | completed |
| exec-0f4d0735-efa1-4896-bb3d-30eb98b23981 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,re,collections ref= | 0 | completed |
| exec-c349139a-0b1b-4a6b-be7c-d63fd0f612c1 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,json root=Path.cwd( | 1 | failed |
| exec-3f4de1d1-2adc-42eb-9243-32a4088dcd61 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,json from collectio | 0 | completed |
| exec-ddb9171a-3aaa-4161-b312-81d4a7d7335f | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,json,re out=Path('o | 0 | completed |
| exec-66490209-3699-4cad-a85c-f1fa88c8b479 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import json,re from pathlib import Path records=json.loads(Pat | 0 | completed |
| exec-98299dd9-0ffa-44d8-b81d-6704c866ec02 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import json,re,ast,hashlib root=Path. | 0 | completed |
| exec-555a7192-bd43-4509-9da7-b3ca9d467b16 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '254,274p' tests/web-monitor.test.mjs; sed -n '74,92p' tests/monitor-servic | 0 | completed |
| exec-1f777898-4fb0-4076-8986-f6c400f8ee90 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess from pathlib import Path paths=subprocess.ru | 0 | completed |
| exec-532d156b-e03e-4b4f-8dad-dbfb70bd7673 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import json,hashlib,sys sys.path.inse | 0 | completed |
| exec-e8df9cf2-ff83-4861-9d4f-06defd26d9f4 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-pr | 0 | completed |
| exec-5e57bfb6-b45e-40fc-b7e6-93cd7b5814fe | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'git diff --check' | 0 | completed |
| exec-b596ce7f-31a4-40b7-bd04-8c33330ccd2c | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive' | 0 | completed |
| exec-16e104b9-9758-45c4-a960-dd7aec2e593d | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B -m unittest discover -s tests -p 'test_*.py'" | 0 | completed |
| exec-f10c4d40-cb98-41ac-ae79-4553db3f2748 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD | 0 | completed |
| exec-a8806504-7002-4d89-811a-e6ba285c9545 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec archive --help' | 0 | completed |
| exec-dfa66e7c-06c3-4b3a-aeea-04294f6f131b | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,sys,tempfile,os fil | 0 | completed |
| exec-bbd21159-2462-4881-8a27-99cc48425b2a | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess from pathlib import Path files=sorted(str(p) | 0 | completed |
| exec-e5433bc0-1731-4e74-a3bd-369aae3341b5 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess,os from pathlib import Path out=Path('/home/ | 0 | completed |
| exec-940e18e9-80da-4423-b7b5-f19244841e8e | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'pwd; git status --short \| tail -8' | 0 | completed |
| exec-97950038-0170-480d-9e1b-dfbfdf150a00 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n '"'^(#\|Version)\|agnost\|INSPECT\|VERSION\|QUERY\|agent\|orchestr'"' plugins/cab-a | 0 | completed |
| exec-1553a230-b389-4b95-8327-060f502ede40 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'cat AGENTS.md PROJECT.md TECHNICAL.md BUILD.md DEVOPS.md' | 0 | completed |
| exec-92017f7a-25dd-4420-86fe-aada6c5ab62d | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "cat plugins/cab-approval-bridge/skills/sgs/SKILL.md plugins/cab-approval-bridge/sk | 0 | completed |
| exec-f480c89c-dfc6-4405-a31f-8adcd047a07c | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'ls output/sgs-2.3.0-browser; cat openspec/changes/add-reusable-project-statistics/ | 0 | completed |
| exec-6ee2aebf-e945-49ff-ae58-56feef91e19e | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '670,735p' plugins/cab-approval-bridge/scripts/cab_sgs.py; sed -n '1790,193 | 0 | completed |
| exec-ee549a00-4faf-4ee0-8f7d-0939c0060245 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "cat output/sgs-2.3.0-browser/web-monitor-browser-results.json; rg --files output \| | 0 | completed |
| exec-a9c63a89-ac71-4a38-87b9-8d2c700c8454 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '1,95p' plugins/cab-approval-bridge/skills/sgs/SKILL.md; rg -n 'def verify\| | 0 | completed |
| exec-364ec7b0-bb43-4baa-82ce-6c9b9832680b | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '1370,1430p' plugins/cab-approval-bridge/scripts/cab_sgs.py; cat .codex/com | 0 | completed |
| exec-ccb7872d-7395-45de-8e57-c21323d035c2 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '175,205p' plugins/cab-approval-bridge/scripts/cab_sgs.py; sed -n '1155,118 | 0 | completed |
| exec-7af01ad7-6cc6-462f-bc3b-fa208f73bc79 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "head -30 /home/adema261/.codex/skills/.system/skill-creator/SKILL.md; rg -n 'sgs\|s | 0 | completed |
| exec-854d014e-bcca-4d1a-91b4-a525eb21bbb5 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "tail -18 tests/test_sgs.py; rg -n '"'^##\|moteur\|INSPECT'"' /home/devops/datas/prom | 0 | completed |
| exec-a5379348-7158-4350-a275-e26fb300de7e | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '83,111p' /home/devops/datas/prompts/SGS.md; head -26 README.md; cat pyproj | 0 | completed |
| exec-793eb797-084a-4fa1-b89e-2618ab87bce5 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n '"'^def entry\|''^def inventory'"' plugins/cab-approval-bridge/scripts/cab_sg | 0 | completed |
| exec-2a75c393-6ddb-4d40-9e42-31f5b5865b35 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/s | 0 | completed |
| exec-a3785c51-188c-4daf-bc0a-2f4146c2faee | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('tests/test_sgs.py');s=p.read_ | 0 | completed |
| exec-29e216df-b4bd-4615-9554-29d65cb996b3 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'node --test tests/sgs-component.test.mjs tests/protocol-distribution.test.mjs' | 0 | completed |
| exec-736f4c1c-7b4a-4bd4-9366-6efc661afa06 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive' | 1 | failed |
| exec-d09c82a5-61b4-474e-b5dd-897c837d3478 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable | 0 | completed |
| exec-0ae16563-2554-46c9-9f93-dfb0bd5ef28e | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B -m unittest discover -s tests -p 'test_*.py' -q" | 0 | completed |
| exec-20e5a531-5139-4753-99ad-e637279b442d | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valida | 0 | completed |
| exec-57fcc6e5-ddb2-4fa8-a4a3-14596a6bc637 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'git diff --check' | 0 | completed |
| exec-61981c49-c7b1-406c-a6d5-2993251d2aaa | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive' | 0 | completed |
| exec-8e2de567-7615-4bee-bc2e-3f463ac1d592 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'SGS\|1.18' /home/devops/datas/prompts/{INDEX.md,README.md} 2>/dev/null; cat  | 2 | failed |
| exec-ee9825a0-d6a7-4814-9227-d17d845ba863 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD | 0 | completed |
| exec-deafcb20-ebd4-4c4a-9aa8-e7c6e32cb892 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '440,468p' /home/devops/datas/prompts/INDEX.md; head -25 DEVELOPMENT_MAP.md | 0 | completed |
| exec-1366f16e-e91d-4fbd-b575-1f998ac23f02 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import tempfile,subprocess,os files=[ | 0 | completed |
| exec-e94c0213-107b-4bab-8941-32b4405ac045 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('/home/devops/datas/prompts/IN | 0 | completed |
| exec-032df10f-24af-4bd9-9cb7-32656bb4f71d | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY  | 0 | completed |
| exec-ab069060-2a67-4be3-af14-dd41b8085679 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py QUERY - | 0 | completed |
| exec-0816a7dc-39ad-4b66-9758-c728309ccb00 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'cicd\|archiv\|BLOCKER\|statist\|livraison\|commit\|DIU' /home/devops/datas/prompt | 0 | completed |
| exec-51aaf73a-9cbf-4e66-a2fb-51823882546d | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec archive add-reusable-project-statistics --yes | 0 | completed |
| exec-ab4c47f1-0532-4b2f-8788-bc6b90a8b63b | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "head -15 openspec/specs/global-project-statistics/spec.md; sed -n '917,938p' /home | 0 | completed |
| exec-d5e8a946-53e6-40e6-b9f4-ec39769e59e9 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '40,90p' plugins/cab-approval-bridge/scripts/cab_sgs.py; python3 -B - <<'PY | 0 | completed |
| exec-2d93fa92-d705-4f5e-a8d5-92c99be76a37 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'cat openspec/changes/add-reusable-project-statistics/CHECKPOINT.md' | 0 | completed |
| exec-3f9c3908-16bb-4766-a8bc-456a3404e994 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import json for name in ['AGENTS.md','py | 0 | completed |
| exec-fc96165c-fff5-4fe7-82c6-93abc466daa0 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'git status --short' | 0 | completed |
| exec-d1b2479a-63cf-49a9-a233-1a88b5cdf84e | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import re,json roots=['src','plugins/cab | 0 | completed |
| exec-d9657820-fafd-443f-9086-11e2289a8756 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/skil | 0 | completed |
| exec-90740ea2-6a2b-494b-a701-61ea45c1c024 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st | 0 | completed |
| exec-bb782200-d69f-419c-a026-ea78342b2942 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B -m unittest discover -s tests -p 'test_*.py'" | 1 | failed |
| exec-ff51424a-3031-4e57-959f-4acaab57b8bd | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,sys,tempfile,os pat | 0 | completed |
| exec-280d46e7-742f-4ced-911c-5a52c4fc5c13 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "sed -n '1,140p' tests/test_change_erasure.py; sed -n '8430,8530p' src/cgpt_approva | 0 | completed |
| exec-3d32e005-abb2-4902-9a52-912a22fc05d3 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import json,hashlib registry=json.loa | 0 | completed |
| exec-9d485ac8-431e-475f-aa26-183fba821c30 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name in ['.gitignore','openspec/chan | 0 | completed |
| exec-a0ca0c24-97e2-42ef-b0cd-6e397075ccc5 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('.gitignore');s=p.read_text() if  | 0 | completed |
| exec-15fdf4b2-f761-4029-895e-e446dad05880 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valida | 0 | completed |
| exec-4bbd2431-523a-4493-99b5-10ff42d6d070 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'git diff --check -- SGS.md ACSP.md CGP.md CISM.md CISMP.md ISM.md ISMP.md RCAM.md  | 0 | completed |
| exec-b46317df-522a-4e8e-a587-a78bbcda7328 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'git diff --check' | 2 | failed |
| exec-d91115cd-3d3c-4ac4-9da4-2f512c13b384 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive' | 0 | completed |
| exec-29915495-a852-4dcd-aa75-8a69d655ec3c | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 0 | completed |
| exec-75a2e005-10a7-432b-9938-3b9c38e661d1 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess from pathlib import Path files=sorted(str(p) | 0 | completed |
| exec-f7b20f06-d629-4d67-bad4-7c4a0daa92b3 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD | 0 | completed |
| exec-4ffa3ee1-789d-4bcc-bffc-1dfb149a2bb2 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'unsafe\|0o775\|mode' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge | 0 | completed |
| exec-d77bf602-1505-4997-8105-5cbb82c5ad02 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "sed -n '34,82p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-ar | 0 | completed |
| exec-ecd1d168-c85f-406d-8a0f-c1858f58b580 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import os,stat print('Acteur',os.getuid( | 0 | completed |
| exec-0cf53168-7647-4e9a-8f52-90f468eb6413 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "node --input-type=module - <<'JS' import {mkdtemp,cp,chmod,lstat,readdir,rm} from  | 0 | completed |
| exec-9364feb6-af90-4529-99a2-79ef4f7d2753 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'corr.le les commandes\|strictCommands=true' tests --glob '*.test.mjs'; sed - | 0 | completed |
| exec-b1276842-2329-49ad-85d6-d1c99bfa737d | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re | 0 | completed |
| exec-ff9f0aab-c0da-4d9d-a9c2-a043d06aa31b | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re | 0 | completed |
| exec-1075d8e8-ccfa-4182-a6aa-21cef956a60a | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "node --test --test-name-pattern 'trois artefacts cibles\|propriétaires explicitemen | 0 | completed |
| exec-35ad829f-6c06-4d5c-b59e-693ab167e218 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "sed -n '720,748p' tests/controller-configuration.test.mjs; rg -n 'externalRoots\|br | 1 | failed |
| exec-7bf62a01-5104-43c6-802a-061aff047ab4 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,tempfile probes=[]  | 0 | completed |
| exec-005ce7af-5f4d-4d25-a84d-874f25bf758a | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'permission\|experimental\|saved' tests/controller-session-recovery.test.mjs \| | 1 | failed |
| exec-b4911f24-5aea-4c90-9f18-ae2225db5877 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'native-permission-control-unavailable\|savedPermissions\|saved.*permission\|pe | 0 | completed |
| exec-8e1870ed-0401-4418-9fd9-6b0b7b67a835 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'openCodeV2TestHandler' tests/controller-session-recovery.test.mjs tests/con | 0 | completed |
| exec-5c16f012-6a1c-4ac1-84dd-b0812eec9482 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "sed -n '118,230p' tests/helpers/opencode-v2-test-server.mjs; sed -n '174,201p' plu | 0 | completed |
| exec-5173069f-27ac-49ee-b9d0-962d4c72cecd | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "sed -n '1,58p' tests/helpers/opencode-v2-test-server.mjs; sed -n '750,788p' plugin | 0 | completed |
| exec-b3a85c9f-3c1f-4171-b7a7-0660fa31494d | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'async function session\\(\|projectID:' plugins/cab-approval-bridge/scripts/c | 0 | completed |
| exec-dd32498a-d007-4b29-96e7-d7260b888cc6 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "sed -n '832,866p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencod | 0 | completed |
| exec-451847d0-fca9-4a75-a1ef-172fb15ffadb | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "sed -n '160,188p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencod | 0 | completed |
| exec-4a018fc9-382e-4c5d-803b-f447d06afa65 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'nativePermissionPolicy\|checkNativeAsk\\(' plugins/cab-approval-bridge/scrip | 0 | completed |
| exec-29f1b8bb-d841-4974-9011-92683ad03a1b | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'kind: \"command\"\|kind: .command.\|kind: \"bash\"\|nativeKind.*=' plugins/cab | 0 | completed |
| exec-c118e330-29d6-4fc9-a434-8eb55a7fea3e | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "sed -n '36,72p' tests/controller-session-recovery.test.mjs; sed -n '112,155p' test | 1 | failed |
| exec-36b60972-a862-40aa-94b6-a2b8b6179f4b | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import tempfile,subprocess source=Pat | 0 | completed |
| exec-ab0eb899-3576-4cd2-916e-ea94c9dfb543 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'function hasNativeAsk\|function nativeAskState\|nativeAskState' plugins/cab-a | 0 | completed |
| exec-ccdb4f35-b5f2-41b0-9d59-f7e5dba52d4e | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY  | 0 | completed |
| exec-408eb40e-c494-4ba6-b208-d06c72473601 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 0 | completed |
| exec-2d8f5722-c039-4b54-a0b8-1b9973c797b9 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import sys,json,hashlib from datetime | 0 | completed |
| exec-ec705251-ab16-4d37-81e1-069dbf13be7d | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py CHANGE  | 0 | completed |
| exec-a509f6d2-1f26-4751-84ae-76d74c956922 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-pr | 0 | completed |
| exec-a79bedf7-4056-4a35-87ec-1ab28519a2b0 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'sudo -n -l -- /usr/local/bin/diu projects cicd cab 2.3.0' | 0 | completed |
| exec-01bf817d-cad7-4e8e-8595-3c5fc0490ed0 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import re,sys,stat sys.path.insert(0, | 0 | completed |
| exec-a6afdd1f-cfca-4178-9adc-a2f0e422e951 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY  | 0 | completed |
| exec-456e808c-fa9a-4273-bb39-ae3346911495 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-pr | 0 | completed |
| exec-3f5233a4-4fa5-4156-b7f6-a85e5633040e | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "cat /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/prompt/SK | 0 | completed |
| exec-5abc3f47-a485-4d64-981e-6e9d0ad3e7e0 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/pr | 0 | completed |
| exec-f5f16c73-5c75-4b40-9835-90259d980980 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '300,525p' /home/devops/datas/prompts/SCM.md; sed -n '526,750p' /home/devop | 0 | completed |
| exec-9a25e209-710b-4f9d-80da-e1bc24269ea5 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path paths=['.agents/plugins/marketplace.json | 0 | completed |
| exec-b427ab8a-b6c4-4c50-8be9-5e918db2708d | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '680,1050p' /home/devops/datas/prompts/SGS.md" | 0 | completed |
| exec-3b86632f-f920-4de0-97f3-892e47975ff3 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1,240p' /home/devops/datas/prompts/ACL.md" | 0 | completed |
| exec-1167c77b-be28-4b5c-a8a8-6e9c4bdf98e6 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name in ['openspec/specs/archive-ses | 0 | completed |
| exec-af4a72a9-2965-4876-b790-2591dab36613 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path from collections import Counter labels=C | 0 | completed |
| exec-cb4d3e36-b757-446d-9fc8-259b8f43ecfc | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -n 'export\|argv\|statistics/view\|bundle\|changeId\|change_id\|tokens\|inputTokens\|me | 0 | completed |
| exec-670187cb-8858-4bc7-9ead-ea435ff8cd14 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '20,85p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observati | 0 | completed |
| exec-5ca9019a-a052-464e-ac01-87017649a4b1 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name,start,end in [('/home/devops/da | 0 | completed |
| exec-e3653faf-b6a6-4d3f-bad1-95458648fc00 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st | 1 | failed |
| exec-972c94b7-7d5a-40a3-989b-4ecb0635156a | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-pr | 0 | completed |
| exec-27e815e7-c768-47d3-8475-80a3abe6e890 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st | 0 | completed |
| exec-267a65f4-43aa-46d9-beb0-93829f0dcde3 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py INSPECT | 0 | completed |
| exec-9fcd3c27-eaad-4fdd-93e2-f0c15f453732 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -v' | 0 | completed |
| exec-40ab9781-58c7-4828-8cd2-431367478d35 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' import sys from pathlib import Path from collections import Co | 0 | completed |
| exec-eac4e0e5-8273-46b8-8038-2d34ae66ccce | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path names=['2026-10-06-fix-manual-controller | 0 | completed |
| exec-f306fb31-1b5a-436e-956d-9d1c603ce093 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path from collections import Counter impor | 0 | completed |
| exec-e1144a89-ea26-42f8-ac4a-d0f335a035f2 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -n 'CABU\\.md\|CAB\\.md\|commandFiles\|commands/\|commandNames' plugins/cab-approva | 0 | completed |
| exec-63fa3f7a-5405-413b-b827-a3e1600a3d62 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -n 'CABU.md\|CAB.md\|commands\|script' plugins/cab-approval-bridge/skills/approval | 0 | completed |
| exec-cd76ad7e-7923-4f6f-9ffc-9462b94dd94c | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -l '2\\.2\\.39' pyproject.toml .agents/plugins/marketplace.json .codex/commands | 0 | completed |
| exec-a68d478b-df97-43f2-ba07-4eb0e66f8ff0 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('/home/devops/datas/prompts/SGS.m | 0 | completed |
| exec-fcac10fa-9456-4872-8b7b-161af5fe3af2 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' import sys,re from pathlib import Path sys.path.insert(0,'plug | 0 | completed |
| exec-71ddd768-b7d9-4787-8996-d1497ab66958 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path names=['2026-10-29-fix-codemode-discover | 0 | completed |
| exec-455aeec4-de73-48b6-8b6e-1449147f969f | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 0 | completed |
| exec-c67f9d47-398c-4ec6-a73c-469a71dc44a8 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' import sys,re from pathlib import Path from collections import | 0 | completed |
| exec-28931476-48fb-41ef-b20e-5ea96faa4a3b | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import sys,re sys.path.insert(0,'plug | 0 | completed |
| exec-e0004c32-cb5b-4448-9997-29b2f1985dd2 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name in ['2026-10-28-fix-update-cred | 0 | completed |
| exec-67810e5e-1284-4c6f-b4c7-c06ff1764bb4 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path root=Path('/home/devops/datas/prompts')  | 0 | completed |
| exec-84e78de2-0ef0-4970-ac65-57318a8f84ee | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import json section='''## Statistiques d | 0 | completed |
| exec-7a0f2f9c-64b1-4c22-bace-f1a910478927 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -n 'REQUIRED\|MODULE\|scripts.*readdir\|readdir.*scripts\|requiredFiles\|REQUIRED_SC | 0 | completed |
| exec-840e1231-ff2a-44f8-8716-2cd4c482f8fb | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1128,1175p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-updat | 0 | completed |
| exec-c9cb9b06-e4c9-4630-89a9-2023b91a298e | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '85,145p' tests/active-component-update.test.mjs; sed -n '300,330p' tests/c | 0 | completed |
| exec-1720b81c-8bbc-4c5e-a31f-df2ff40f17ad | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1,62p' tests/controller-service-distribution.test.mjs; sed -n '1,70p' test | 0 | completed |
| exec-ab5a70c9-649c-41d5-ba53-1cb197313722 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name,a,b in [('2026-10-20-fix-stoppe | 0 | completed |
| exec-c1547b16-255b-4cf7-bf5e-5f723d81b947 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import json,hashlib base=Path('openspec/ | 0 | completed |
| exec-394f660d-4219-4e87-aac4-a61a5b2d9e91 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path from datetime import datetime,timezone r | 0 | completed |
| exec-e43a35da-d21f-4934-bbe6-b1a3eca344d8 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -v' | 0 | completed |
| exec-49d005aa-93b9-496b-b9af-34ccfa68cf41 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import re names=[p.name for p in Path('p | 0 | completed |
| exec-67df5100-54df-4aaa-9c36-13b4ce5bb474 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'node --test tests/controller-service-distribution.test.mjs tests/active-component- | 1 | failed |
| exec-d03dee9a-3f79-4ba1-8ef0-68facd714144 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-name- | 0 | completed |
| exec-27f681f9-df88-48fa-9ff1-d8de66f8b583 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "node --test --test-name-pattern 'déploiement complet puis deuxième invocation' tes | 1 | failed |
| exec-38076540-b5d9-42ca-a327-262e47264ed7 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '235,266p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update. | 0 | completed |
| exec-3fa4cc97-d662-47ce-84aa-54c793d7e467 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('tests/controller-service-distrib | 0 | completed |
| exec-0e7a47f0-3157-4c51-be22-d4b2d2d3c629 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "node --test --test-name-pattern 'déploiement complet puis deuxième invocation' tes | 0 | completed |
| exec-bac7559c-0b0e-4bf5-88ff-5711ab13b87c | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1,26p' tests/active-component-update.test.mjs; sed -n '282,310p' tests/act | 0 | completed |
| exec-f48e6281-337a-49f2-9d59-0936cd52a82a | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '250,275p' tests/controller-service-distribution.test.mjs; sed -n '610,645p | 0 | completed |
| exec-db368ede-0a73-42fe-b1d3-38ea2a5ae1df | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import difflib for name in ['server','ro | 0 | completed |
| exec-e61ab735-81f2-419c-8ce9-212b75e74ea5 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import sys sys.path.insert(0,'plugins | 0 | completed |
| exec-19485cc5-1576-41f3-9e51-4dc80355ec65 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 0 | completed |
| exec-2fe1dca3-b404-4972-8411-3287f0a32b4a | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -n 'écrire\|écriture\|rapport\|STATISTICS\|six sections' plugins/cab-approval-bridg | 0 | completed |
| exec-ff79d6a8-1a57-4580-b4c8-2a79b844f525 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re | 0 | completed |
| exec-f74dec45-00c4-4a35-a8d0-cae06267b781 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valida | 0 | completed |
| exec-37642c17-44fc-4061-9e2d-83e40ef03bba | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' import os,re,shutil from pathlib import Path from collections imp | 0 | completed |
| exec-64d7a9b2-ec18-4efa-8124-f6ea1b66594f | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-repor | 0 | completed |
| exec-d3618598-8ae8-4aa6-852e-ae67fed9e60a | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import re p=Path('plugins/cab-approval-b | 0 | completed |
| exec-3704bd5a-c4ce-493e-bb44-f316cc99832e | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B -m unittest discover -s tests -p 'test_*.py'" | 0 | completed |
| exec-f6c2f99b-4ce0-4ab7-aca5-d49a10036c8b | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' import sys,json from pathlib import Path from collections impo | 0 | completed |
| exec-3910e0e1-5885-46dd-828c-ac68d59406e7 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD | 0 | completed |
| exec-04e4f30b-4730-459d-a5e4-62cf3b1ad556 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "node --test --test-name-pattern 'update prépare les trois commandes' tests/control | 0 | completed |
| exec-aacc3ce7-fbeb-4b62-a893-33fdfdfe313b | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY  | 0 | completed |
| exec-e8935fdc-c541-4e33-ad77-a7525f093b34 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1,100p' STATISTICS.md; sed -n '175,285p' STATISTICS.md; python3 -B -m unit | 0 | completed |
| exec-219d5b51-d9df-48d7-82e5-c6b6022774b2 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1,125p' AGENTS.md" | 0 | completed |
| exec-26885462-2a16-4bd3-9f6f-7d8a98513895 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name in ['PROJECT.md','TECHNICAL.md' | 0 | completed |
| exec-c738d86b-555c-4626-9639-01c2c28f69ee | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name in ['openspec/changes/archive/2 | 0 | completed |
| exec-1d58a524-486e-4450-9a54-b447f67e2ceb | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import re selected=[] for p in sorted(Pa | 0 | completed |
| exec-3f13f078-f01d-4857-9ca7-7a7ed1f3ac16 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1330,1380p' /home/devops/datas/prompts/SGS.md" | 0 | completed |
| exec-83713605-14cb-4da9-bcc7-ace764bf86cc | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1,20p' openspec/changes/add-reusable-project-statistics/specs/global-proje | 0 | completed |
| exec-c3684e1e-f8a5-444c-8122-9d9db8c9a3bd | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st | 0 | completed |
| exec-676df164-71f6-419c-9855-51571ea390c4 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -n '"'^def render\|elif section\|percentage_keys\|for kind in'"' plugins/cab-appro | 0 | completed |
| exec-1ba7063e-8ade-4252-8eb7-f33699612a69 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1082,1198p' plugins/cab-approval-bridge/scripts/cab_sgs.py" | 0 | completed |
| exec-028bf6d4-5340-4360-8a42-420420f75bed | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py INSPECT | 0 | completed |
| exec-129ef2b0-97be-42e1-8029-cd0f0fef7e90 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 0 | completed |
| exec-994e5735-0f2d-4d2a-9595-a832ce1c75d3 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' import sys from pathlib import Path from collections import Co | 0 | completed |
| exec-1974519e-1de6-455d-a999-02efbc4f55bf | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path from collections import Counter impor | 0 | completed |
| exec-cb402fd6-da3b-426f-b92f-d9b011dbb630 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' import sys from pathlib import Path from collections import Co | 0 | completed |
| exec-179bb291-7a95-48e9-b3f1-ecbd34d33702 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path from collections import Counter impor | 0 | completed |
| exec-4ebda2f8-1d5c-4030-bc4c-d2fcb12e03cd | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 0 | completed |
| exec-67283e5a-9257-44c7-8d52-b91f88436596 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/skil | 0 | completed |
| exec-cf01ccc2-fed7-4ce9-9f30-f2f03dfba406 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'cat /home/adema261/.codex/plugins/cache/openai-curated-remote/write-like-me/0.1.1/ | 0 | completed |
| exec-0d33cf86-e9d2-41f1-b5b9-6caa143bd300 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import os,shutil print('sudo:',shutil.wh | 1 | failed |
| exec-57352ecf-b65b-48ca-ad13-c2905d968267 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -n 'action=recover\|def publish\|def recover\|recover\\(root\\)' plugins/cab-appro | 0 | completed |
| exec-6e2f2d31-6774-47d3-8707-b04a052e9217 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 1 | failed |
| exec-b30f631e-5ee1-46a2-9811-0ea2f1ffa390 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 0 | completed |
| exec-db1f98b3-b1df-480b-980d-abdc5fb8104f | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -n 'copie.*broker\|broker.*copie\|DIU\|cicd\|synchron.*broker' BUILD.md" | 0 | completed |
| exec-38b7421e-f403-4bd1-8992-740b3306ff59 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'sudo -n -l -- /usr/local/bin/diu projects cicd cab 2.2.40' | 0 | completed |
| exec-7e0480e9-ce28-47c4-878a-ae6d5462028b | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import stat for name in ['AGENTS.md','sr | 0 | completed |
| exec-4a19a760-b938-4c77-8780-df7252b74b5f | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'node --test tests/controller-service-distribution.test.mjs' | 0 | completed |
| exec-1ef6c7c7-1eab-43ca-b151-89126c1d2063 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD | 0 | completed |
| exec-86599ae1-1ef1-4010-8933-c0c2a7d75e53 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B -m unittest discover -s tests -p 'test_*.py'" | 0 | completed |
| exec-bbb1ef36-b269-4c74-a906-faf0bedf0db0 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('/home/devops/datas/cab/openspec/ | 0 | completed |

234 commandes natives observées :219avec code0,15avec code non nul. Relevé figé avant opérations de rapport et livraison, non incluses. Les résultats internes des suites sont vérifiés séparément.

### Relevé sgs-cab-2.3.1-scm-closure-03

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Commandes exécutées | 332 | SESSION_OBSERVATION.json ; identifiants natifs dédupliqués, relevé figé après qualifications2.3.1, opérations postérieures exclues |
| Commandes réussies | 315 | SESSION_OBSERVATION.json ; identifiants natifs dédupliqués, relevé figé après qualifications2.3.1, opérations postérieures exclues |
| Commandes en échec | 17 | SESSION_OBSERVATION.json ; identifiants natifs dédupliqués, relevé figé après qualifications2.3.1, opérations postérieures exclues |
| Tests exécutés dans le bilan final | 1469 | QUALIFICATION.md ; bilan final2.3.1, campagnes précédentes et31tests ignorés exclus |
| Tests finaux réussis | 1469 | QUALIFICATION.md ; bilan final2.3.1, campagnes précédentes et31tests ignorés exclus |
| Tests finaux échoués | 0 | QUALIFICATION.md ; bilan final2.3.1, campagnes précédentes et31tests ignorés exclus |
| Fichiers ayant passé un contrôle syntaxique | 24 | QUALIFICATION.md ; bilan final2.3.1, campagnes précédentes et31tests ignorés exclus |
| Validations OpenSpec standard réussies | N/A | Le cumul exhaustif des exécutions historiques n’est pas établi par les aperçus bornés ;21désignait des éléments, pas des commandes. Deux commandes strictes de clôture réussies sont documentées séparément. |
| Validations OpenSpec standard échouées | N/A | Le cumul exhaustif des exécutions historiques n’est pas établi par les aperçus bornés ;21désignait des éléments, pas des commandes. Deux commandes strictes de clôture réussies sont documentées séparément. |
| Validations OpenSpec strictes réussies | N/A | Le cumul exhaustif des exécutions historiques n’est pas établi par les aperçus bornés ;21désignait des éléments, pas des commandes. Deux commandes strictes de clôture réussies sont documentées séparément. |
| Validations OpenSpec strictes échouées | N/A | Le cumul exhaustif des exécutions historiques n’est pas établi par les aperçus bornés ;21désignait des éléments, pas des commandes. Deux commandes strictes de clôture réussies sont documentées séparément. |
| Tâches OpenSpec prouvées et terminées | 13 | QUALIFICATION.md ; bilan final2.3.1, campagnes précédentes et31tests ignorés exclus |

#### Commandes observées au relevé de clôture

| Identifiant | Tour | Aperçu borné | Code | État |
| --- | --- | --- | --- | --- |
| exec-bdf1241c-498e-48e7-a297-4cc29e26532e | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '100,120p' tests/test_change_erasure.py; sed -n '184,199p' plugins/cab-appr | 0 | completed |
| exec-8edc7650-35e7-4c1d-81e6-e0319e220eb7 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '184,210p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencod | 0 | completed |
| exec-9a7dcb6a-bbeb-4343-9938-706b3f7c9fd5 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '1,68p' tests/monitor-service-start.test.mjs; head -18 tests/web-monitor.te | 0 | completed |
| exec-f42f2977-e752-4078-bca3-8e63208f66cb | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'components\|component\|briques\|version\|health\|/api/identity' plugins/cab-appr | 0 | completed |
| exec-7c201d29-4fb2-438e-89c7-09f7e8d56514 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_change_erasure.py -v' | 0 | completed |
| exec-d5d279b9-848d-4556-95e0-698ea92d4014 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re | 0 | completed |
| exec-43e52a4c-9c88-4620-b2c7-00f13d20b6da | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '1,80p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-da | 0 | completed |
| exec-b9b58343-7162-46d6-950d-d278ec69110c | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'node --test tests/change-erasure.test.mjs tests/change-erasure-integration.test.mj | 0 | completed |
| exec-cd02771f-e047-4c45-a231-a37d931c6d8a | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re | 0 | completed |
| exec-9cf691c7-1150-4113-b503-7c358fff9704 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'statistics\|health.*grid\|grid.*health\|\\.health' plugins/cab-approval-bridge | 0 | completed |
| exec-a31df694-134a-422a-8efb-b529b21b747d | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st | 0 | completed |
| exec-8427044f-b953-4738-aa49-0d9f8cde392e | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n '"'^function isStale\|const isStale\|monitor-data\|process-lifecycle.mjs\|script | 0 | completed |
| exec-bf48623c-b191-4481-b8d2-611ba4a370e8 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/web- | 0 | completed |
| exec-afb75ea9-3e36-4d9b-9a04-f7e9184a9fd9 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'node --test tests/sgs-component.test.mjs' | 0 | completed |
| exec-e483ae6c-87c7-4bfc-931e-45f570285a58 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import json,hashlib root=Path('.') paths | 0 | completed |
| exec-ee2679f1-77c2-49e4-9797-0bbeed39af06 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'componentVersions\|sources\\)\|sources\\]\|components.*5\|copied.length\|a-z0-9' | 0 | completed |
| exec-faa3fae0-9758-4282-8daa-a45bb15665b2 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '176,201p' tests/web-monitor.test.mjs; python3 - <<'PY' from pathlib import | 0 | completed |
| exec-b34262fa-4486-4963-8784-e0ab8d2383ef | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '200,253p' tests/web-monitor-browser.mjs; sed -n '425,442p' tests/web-monit | 0 | completed |
| exec-b9be95f3-d36e-4584-8bd7-a18bb52ed67d | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'nativeAction\|source.type.*shell\|nativeAction.*shell' plugins/cab-approval-b | 0 | completed |
| exec-ec7e64e3-59a2-4298-ad6d-9b582f3afca5 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "node --test --test-name-pattern 'corrèle les commandes avec strictCommands=true\|re | 0 | completed |
| exec-226330fb-c89b-43f8-a46d-6d29bad35aac | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess files=['tests/controller-configuration.test. | 0 | completed |
| exec-01697df6-6e82-4a84-b294-10ee73ee5693 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for kind in ['server','router','journal' | 0 | completed |
| exec-b6197583-352e-47e1-a7d1-5708d40be8ce | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('tests/web-monitor-browser.mjs'); | 0 | completed |
| exec-d87af084-4eba-4461-9b90-63bfaeadff09 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess files=['tests/controller-configuration.test. | 0 | completed |
| exec-f8e223c5-6f19-416d-af57-0ff1635fbc20 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess,os from pathlib import Path out=Path('/home/ | 0 | completed |
| exec-5681d202-1302-4984-b212-b8f65006e6bd | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '908,947p' tests/controller-session-recovery.test.mjs; python3 - <<'PY' fro | 0 | completed |
| exec-93fcbba2-8768-4f22-8bb3-aeb106270ce8 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "node --test --test-name-pattern 'reconcile refuse autorisation absente' tests/cont | 1 | failed |
| exec-d66d96a5-d534-4199-b690-e4da6f930cba | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'preflight-native-ask-required\|preflight-native-allow-not-proved' plugins/ca | 0 | completed |
| exec-1bdb13be-3d61-44b5-927a-c1f337c20ca7 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '1230,1285p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-c | 0 | completed |
| exec-f2a678b7-c2e1-4669-b056-ce1f2f099999 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "node --test --test-name-pattern 'reconcile refuse autorisation absente' tests/cont | 0 | completed |
| exec-85185e6d-4928-4972-8f94-4cb463527f0d | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,json,re from urllib | 0 | completed |
| exec-82526340-7f41-4bcd-810f-4a9ef88afca0 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "git log -1 --format='%H %s'" | 0 | completed |
| exec-e45c3105-2d1c-470a-b549-079fd689f877 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'projects.*cicd\|project.*cicd\|git.*push\|force-with-lease' /home/devops/datas | 2 | failed |
| exec-71f72d39-39fc-448e-8476-090b90ae3fe5 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '1390,1425p' /home/devops/datas/diu/root-install-debian.sh; rg --files /hom | 0 | completed |
| exec-e7cd304e-0b21-4271-9e9a-0135886d0063 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '1414,1485p' /home/devops/datas/diu/root-install-debian.sh; rg -n '"'^.*cic | 0 | completed |
| exec-47ec058d-d26c-4b7b-890d-1783cabf0401 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '485,516p' /home/devops/datas/diu/modules/projects/git.sh; sed -n '557,614p | 0 | completed |
| exec-f8536084-7701-4ec2-b383-2fbb6c18e770 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '820,867p' /home/devops/datas/diu/modules/projects/git.sh; sed -n '3514,354 | 0 | completed |
| exec-cec64588-ea2f-42c3-a60b-01a8d09ee294 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'PROJECTS_CICD_RECONCILE' /home/devops/datas/diu/modules/projects/git.sh" | 0 | completed |
| exec-9ac5eb22-1bcc-463b-ba59-48e921adac7f | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'GIT_TERMINAL_PROMPT=0 git fetch --no-tags github main' | 0 | completed |
| exec-0f4d0735-efa1-4896-bb3d-30eb98b23981 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,re,collections ref= | 0 | completed |
| exec-c349139a-0b1b-4a6b-be7c-d63fd0f612c1 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,json root=Path.cwd( | 1 | failed |
| exec-3f4de1d1-2adc-42eb-9243-32a4088dcd61 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,json from collectio | 0 | completed |
| exec-ddb9171a-3aaa-4161-b312-81d4a7d7335f | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,json,re out=Path('o | 0 | completed |
| exec-66490209-3699-4cad-a85c-f1fa88c8b479 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import json,re from pathlib import Path records=json.loads(Pat | 0 | completed |
| exec-98299dd9-0ffa-44d8-b81d-6704c866ec02 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import json,re,ast,hashlib root=Path. | 0 | completed |
| exec-555a7192-bd43-4509-9da7-b3ca9d467b16 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '254,274p' tests/web-monitor.test.mjs; sed -n '74,92p' tests/monitor-servic | 0 | completed |
| exec-1f777898-4fb0-4076-8986-f6c400f8ee90 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess from pathlib import Path paths=subprocess.ru | 0 | completed |
| exec-532d156b-e03e-4b4f-8dad-dbfb70bd7673 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import json,hashlib,sys sys.path.inse | 0 | completed |
| exec-e8df9cf2-ff83-4861-9d4f-06defd26d9f4 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-pr | 0 | completed |
| exec-5e57bfb6-b45e-40fc-b7e6-93cd7b5814fe | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'git diff --check' | 0 | completed |
| exec-b596ce7f-31a4-40b7-bd04-8c33330ccd2c | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive' | 0 | completed |
| exec-16e104b9-9758-45c4-a960-dd7aec2e593d | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B -m unittest discover -s tests -p 'test_*.py'" | 0 | completed |
| exec-f10c4d40-cb98-41ac-ae79-4553db3f2748 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD | 0 | completed |
| exec-a8806504-7002-4d89-811a-e6ba285c9545 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec archive --help' | 0 | completed |
| exec-dfa66e7c-06c3-4b3a-aeea-04294f6f131b | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,sys,tempfile,os fil | 0 | completed |
| exec-bbd21159-2462-4881-8a27-99cc48425b2a | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess from pathlib import Path files=sorted(str(p) | 0 | completed |
| exec-e5433bc0-1731-4e74-a3bd-369aae3341b5 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess,os from pathlib import Path out=Path('/home/ | 0 | completed |
| exec-940e18e9-80da-4423-b7b5-f19244841e8e | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'pwd; git status --short \| tail -8' | 0 | completed |
| exec-97950038-0170-480d-9e1b-dfbfdf150a00 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n '"'^(#\|Version)\|agnost\|INSPECT\|VERSION\|QUERY\|agent\|orchestr'"' plugins/cab-a | 0 | completed |
| exec-1553a230-b389-4b95-8327-060f502ede40 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'cat AGENTS.md PROJECT.md TECHNICAL.md BUILD.md DEVOPS.md' | 0 | completed |
| exec-92017f7a-25dd-4420-86fe-aada6c5ab62d | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "cat plugins/cab-approval-bridge/skills/sgs/SKILL.md plugins/cab-approval-bridge/sk | 0 | completed |
| exec-f480c89c-dfc6-4405-a31f-8adcd047a07c | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'ls output/sgs-2.3.0-browser; cat openspec/changes/add-reusable-project-statistics/ | 0 | completed |
| exec-6ee2aebf-e945-49ff-ae58-56feef91e19e | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '670,735p' plugins/cab-approval-bridge/scripts/cab_sgs.py; sed -n '1790,193 | 0 | completed |
| exec-ee549a00-4faf-4ee0-8f7d-0939c0060245 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "cat output/sgs-2.3.0-browser/web-monitor-browser-results.json; rg --files output \| | 0 | completed |
| exec-a9c63a89-ac71-4a38-87b9-8d2c700c8454 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '1,95p' plugins/cab-approval-bridge/skills/sgs/SKILL.md; rg -n 'def verify\| | 0 | completed |
| exec-364ec7b0-bb43-4baa-82ce-6c9b9832680b | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '1370,1430p' plugins/cab-approval-bridge/scripts/cab_sgs.py; cat .codex/com | 0 | completed |
| exec-ccb7872d-7395-45de-8e57-c21323d035c2 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '175,205p' plugins/cab-approval-bridge/scripts/cab_sgs.py; sed -n '1155,118 | 0 | completed |
| exec-7af01ad7-6cc6-462f-bc3b-fa208f73bc79 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "head -30 /home/adema261/.codex/skills/.system/skill-creator/SKILL.md; rg -n 'sgs\|s | 0 | completed |
| exec-854d014e-bcca-4d1a-91b4-a525eb21bbb5 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "tail -18 tests/test_sgs.py; rg -n '"'^##\|moteur\|INSPECT'"' /home/devops/datas/prom | 0 | completed |
| exec-a5379348-7158-4350-a275-e26fb300de7e | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '83,111p' /home/devops/datas/prompts/SGS.md; head -26 README.md; cat pyproj | 0 | completed |
| exec-793eb797-084a-4fa1-b89e-2618ab87bce5 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n '"'^def entry\|''^def inventory'"' plugins/cab-approval-bridge/scripts/cab_sg | 0 | completed |
| exec-2a75c393-6ddb-4d40-9e42-31f5b5865b35 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/s | 0 | completed |
| exec-a3785c51-188c-4daf-bc0a-2f4146c2faee | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('tests/test_sgs.py');s=p.read_ | 0 | completed |
| exec-29e216df-b4bd-4615-9554-29d65cb996b3 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'node --test tests/sgs-component.test.mjs tests/protocol-distribution.test.mjs' | 0 | completed |
| exec-736f4c1c-7b4a-4bd4-9366-6efc661afa06 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive' | 1 | failed |
| exec-d09c82a5-61b4-474e-b5dd-897c837d3478 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable | 0 | completed |
| exec-0ae16563-2554-46c9-9f93-dfb0bd5ef28e | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B -m unittest discover -s tests -p 'test_*.py' -q" | 0 | completed |
| exec-20e5a531-5139-4753-99ad-e637279b442d | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valida | 0 | completed |
| exec-57fcc6e5-ddb2-4fa8-a4a3-14596a6bc637 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'git diff --check' | 0 | completed |
| exec-61981c49-c7b1-406c-a6d5-2993251d2aaa | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive' | 0 | completed |
| exec-8e2de567-7615-4bee-bc2e-3f463ac1d592 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'SGS\|1.18' /home/devops/datas/prompts/{INDEX.md,README.md} 2>/dev/null; cat  | 2 | failed |
| exec-ee9825a0-d6a7-4814-9227-d17d845ba863 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD | 0 | completed |
| exec-deafcb20-ebd4-4c4a-9aa8-e7c6e32cb892 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '440,468p' /home/devops/datas/prompts/INDEX.md; head -25 DEVELOPMENT_MAP.md | 0 | completed |
| exec-1366f16e-e91d-4fbd-b575-1f998ac23f02 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import tempfile,subprocess,os files=[ | 0 | completed |
| exec-e94c0213-107b-4bab-8941-32b4405ac045 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('/home/devops/datas/prompts/IN | 0 | completed |
| exec-032df10f-24af-4bd9-9cb7-32656bb4f71d | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY  | 0 | completed |
| exec-ab069060-2a67-4be3-af14-dd41b8085679 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py QUERY - | 0 | completed |
| exec-0816a7dc-39ad-4b66-9758-c728309ccb00 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n 'cicd\|archiv\|BLOCKER\|statist\|livraison\|commit\|DIU' /home/devops/datas/prompt | 0 | completed |
| exec-51aaf73a-9cbf-4e66-a2fb-51823882546d | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec archive add-reusable-project-statistics --yes | 0 | completed |
| exec-ab4c47f1-0532-4b2f-8788-bc6b90a8b63b | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "head -15 openspec/specs/global-project-statistics/spec.md; sed -n '917,938p' /home | 0 | completed |
| exec-d5e8a946-53e6-40e6-b9f4-ec39769e59e9 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '40,90p' plugins/cab-approval-bridge/scripts/cab_sgs.py; python3 -B - <<'PY | 0 | completed |
| exec-2d93fa92-d705-4f5e-a8d5-92c99be76a37 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'cat openspec/changes/add-reusable-project-statistics/CHECKPOINT.md' | 0 | completed |
| exec-3f9c3908-16bb-4766-a8bc-456a3404e994 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import json for name in ['AGENTS.md','py | 0 | completed |
| exec-fc96165c-fff5-4fe7-82c6-93abc466daa0 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'git status --short' | 0 | completed |
| exec-d1b2479a-63cf-49a9-a233-1a88b5cdf84e | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import re,json roots=['src','plugins/cab | 0 | completed |
| exec-d9657820-fafd-443f-9086-11e2289a8756 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/skil | 0 | completed |
| exec-90740ea2-6a2b-494b-a701-61ea45c1c024 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st | 0 | completed |
| exec-bb782200-d69f-419c-a026-ea78342b2942 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B -m unittest discover -s tests -p 'test_*.py'" | 1 | failed |
| exec-ff51424a-3031-4e57-959f-4acaab57b8bd | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,sys,tempfile,os pat | 0 | completed |
| exec-280d46e7-742f-4ced-911c-5a52c4fc5c13 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "sed -n '1,140p' tests/test_change_erasure.py; sed -n '8430,8530p' src/cgpt_approva | 0 | completed |
| exec-3d32e005-abb2-4902-9a52-912a22fc05d3 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import json,hashlib registry=json.loa | 0 | completed |
| exec-9d485ac8-431e-475f-aa26-183fba821c30 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name in ['.gitignore','openspec/chan | 0 | completed |
| exec-a0ca0c24-97e2-42ef-b0cd-6e397075ccc5 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('.gitignore');s=p.read_text() if  | 0 | completed |
| exec-15fdf4b2-f761-4029-895e-e446dad05880 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valida | 0 | completed |
| exec-4bbd2431-523a-4493-99b5-10ff42d6d070 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'git diff --check -- SGS.md ACSP.md CGP.md CISM.md CISMP.md ISM.md ISMP.md RCAM.md  | 0 | completed |
| exec-b46317df-522a-4e8e-a587-a78bbcda7328 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'git diff --check' | 2 | failed |
| exec-d91115cd-3d3c-4ac4-9da4-2f512c13b384 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive' | 0 | completed |
| exec-29915495-a852-4dcd-aa75-8a69d655ec3c | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 0 | completed |
| exec-75a2e005-10a7-432b-9938-3b9c38e661d1 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess from pathlib import Path files=sorted(str(p) | 0 | completed |
| exec-f7b20f06-d629-4d67-bad4-7c4a0daa92b3 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD | 0 | completed |
| exec-4ffa3ee1-789d-4bcc-bffc-1dfb149a2bb2 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'unsafe\|0o775\|mode' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge | 0 | completed |
| exec-d77bf602-1505-4997-8105-5cbb82c5ad02 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "sed -n '34,82p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-ar | 0 | completed |
| exec-ecd1d168-c85f-406d-8a0f-c1858f58b580 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import os,stat print('Acteur',os.getuid( | 0 | completed |
| exec-0cf53168-7647-4e9a-8f52-90f468eb6413 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "node --input-type=module - <<'JS' import {mkdtemp,cp,chmod,lstat,readdir,rm} from  | 0 | completed |
| exec-9364feb6-af90-4529-99a2-79ef4f7d2753 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'corr.le les commandes\|strictCommands=true' tests --glob '*.test.mjs'; sed - | 0 | completed |
| exec-b1276842-2329-49ad-85d6-d1c99bfa737d | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re | 0 | completed |
| exec-ff9f0aab-c0da-4d9d-a9c2-a043d06aa31b | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re | 0 | completed |
| exec-1075d8e8-ccfa-4182-a6aa-21cef956a60a | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "node --test --test-name-pattern 'trois artefacts cibles\|propriétaires explicitemen | 0 | completed |
| exec-35ad829f-6c06-4d5c-b59e-693ab167e218 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "sed -n '720,748p' tests/controller-configuration.test.mjs; rg -n 'externalRoots\|br | 1 | failed |
| exec-7bf62a01-5104-43c6-802a-061aff047ab4 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,tempfile probes=[]  | 0 | completed |
| exec-005ce7af-5f4d-4d25-a84d-874f25bf758a | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'permission\|experimental\|saved' tests/controller-session-recovery.test.mjs \| | 1 | failed |
| exec-b4911f24-5aea-4c90-9f18-ae2225db5877 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'native-permission-control-unavailable\|savedPermissions\|saved.*permission\|pe | 0 | completed |
| exec-8e1870ed-0401-4418-9fd9-6b0b7b67a835 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'openCodeV2TestHandler' tests/controller-session-recovery.test.mjs tests/con | 0 | completed |
| exec-5c16f012-6a1c-4ac1-84dd-b0812eec9482 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "sed -n '118,230p' tests/helpers/opencode-v2-test-server.mjs; sed -n '174,201p' plu | 0 | completed |
| exec-5173069f-27ac-49ee-b9d0-962d4c72cecd | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "sed -n '1,58p' tests/helpers/opencode-v2-test-server.mjs; sed -n '750,788p' plugin | 0 | completed |
| exec-b3a85c9f-3c1f-4171-b7a7-0660fa31494d | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'async function session\\(\|projectID:' plugins/cab-approval-bridge/scripts/c | 0 | completed |
| exec-dd32498a-d007-4b29-96e7-d7260b888cc6 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "sed -n '832,866p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencod | 0 | completed |
| exec-451847d0-fca9-4a75-a1ef-172fb15ffadb | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "sed -n '160,188p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencod | 0 | completed |
| exec-4a018fc9-382e-4c5d-803b-f447d06afa65 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'nativePermissionPolicy\|checkNativeAsk\\(' plugins/cab-approval-bridge/scrip | 0 | completed |
| exec-29f1b8bb-d841-4974-9011-92683ad03a1b | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'kind: \"command\"\|kind: .command.\|kind: \"bash\"\|nativeKind.*=' plugins/cab | 0 | completed |
| exec-c118e330-29d6-4fc9-a434-8eb55a7fea3e | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "sed -n '36,72p' tests/controller-session-recovery.test.mjs; sed -n '112,155p' test | 1 | failed |
| exec-36b60972-a862-40aa-94b6-a2b8b6179f4b | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import tempfile,subprocess source=Pat | 0 | completed |
| exec-ab0eb899-3576-4cd2-916e-ea94c9dfb543 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "rg -n 'function hasNativeAsk\|function nativeAskState\|nativeAskState' plugins/cab-a | 0 | completed |
| exec-ccdb4f35-b5f2-41b0-9d59-f7e5dba52d4e | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY  | 0 | completed |
| exec-408eb40e-c494-4ba6-b208-d06c72473601 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 0 | completed |
| exec-2d8f5722-c039-4b54-a0b8-1b9973c797b9 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import sys,json,hashlib from datetime | 0 | completed |
| exec-ec705251-ab16-4d37-81e1-069dbf13be7d | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py CHANGE  | 0 | completed |
| exec-a509f6d2-1f26-4751-84ae-76d74c956922 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-pr | 0 | completed |
| exec-a79bedf7-4056-4a35-87ec-1ab28519a2b0 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'sudo -n -l -- /usr/local/bin/diu projects cicd cab 2.3.0' | 0 | completed |
| exec-01bf817d-cad7-4e8e-8595-3c5fc0490ed0 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import re,sys,stat sys.path.insert(0, | 0 | completed |
| exec-a6afdd1f-cfca-4178-9adc-a2f0e422e951 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY  | 0 | completed |
| exec-456e808c-fa9a-4273-bb39-ae3346911495 | 01a1ad34-8efb-7863-b766-c93888337933 | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-pr | 0 | completed |
| exec-3f5233a4-4fa5-4156-b7f6-a85e5633040e | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "cat /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/prompt/SK | 0 | completed |
| exec-5abc3f47-a485-4d64-981e-6e9d0ad3e7e0 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/pr | 0 | completed |
| exec-f5f16c73-5c75-4b40-9835-90259d980980 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '300,525p' /home/devops/datas/prompts/SCM.md; sed -n '526,750p' /home/devop | 0 | completed |
| exec-9a25e209-710b-4f9d-80da-e1bc24269ea5 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path paths=['.agents/plugins/marketplace.json | 0 | completed |
| exec-b427ab8a-b6c4-4c50-8be9-5e918db2708d | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '680,1050p' /home/devops/datas/prompts/SGS.md" | 0 | completed |
| exec-3b86632f-f920-4de0-97f3-892e47975ff3 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1,240p' /home/devops/datas/prompts/ACL.md" | 0 | completed |
| exec-1167c77b-be28-4b5c-a8a8-6e9c4bdf98e6 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name in ['openspec/specs/archive-ses | 0 | completed |
| exec-af4a72a9-2965-4876-b790-2591dab36613 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path from collections import Counter labels=C | 0 | completed |
| exec-cb4d3e36-b757-446d-9fc8-259b8f43ecfc | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -n 'export\|argv\|statistics/view\|bundle\|changeId\|change_id\|tokens\|inputTokens\|me | 0 | completed |
| exec-670187cb-8858-4bc7-9ead-ea435ff8cd14 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '20,85p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observati | 0 | completed |
| exec-5ca9019a-a052-464e-ac01-87017649a4b1 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name,start,end in [('/home/devops/da | 0 | completed |
| exec-e3653faf-b6a6-4d3f-bad1-95458648fc00 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st | 1 | failed |
| exec-972c94b7-7d5a-40a3-989b-4ecb0635156a | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-pr | 0 | completed |
| exec-27e815e7-c768-47d3-8475-80a3abe6e890 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st | 0 | completed |
| exec-267a65f4-43aa-46d9-beb0-93829f0dcde3 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py INSPECT | 0 | completed |
| exec-9fcd3c27-eaad-4fdd-93e2-f0c15f453732 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -v' | 0 | completed |
| exec-40ab9781-58c7-4828-8cd2-431367478d35 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' import sys from pathlib import Path from collections import Co | 0 | completed |
| exec-eac4e0e5-8273-46b8-8038-2d34ae66ccce | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path names=['2026-10-06-fix-manual-controller | 0 | completed |
| exec-f306fb31-1b5a-436e-956d-9d1c603ce093 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path from collections import Counter impor | 0 | completed |
| exec-e1144a89-ea26-42f8-ac4a-d0f335a035f2 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -n 'CABU\\.md\|CAB\\.md\|commandFiles\|commands/\|commandNames' plugins/cab-approva | 0 | completed |
| exec-63fa3f7a-5405-413b-b827-a3e1600a3d62 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -n 'CABU.md\|CAB.md\|commands\|script' plugins/cab-approval-bridge/skills/approval | 0 | completed |
| exec-cd76ad7e-7923-4f6f-9ffc-9462b94dd94c | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -l '2\\.2\\.39' pyproject.toml .agents/plugins/marketplace.json .codex/commands | 0 | completed |
| exec-a68d478b-df97-43f2-ba07-4eb0e66f8ff0 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('/home/devops/datas/prompts/SGS.m | 0 | completed |
| exec-fcac10fa-9456-4872-8b7b-161af5fe3af2 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' import sys,re from pathlib import Path sys.path.insert(0,'plug | 0 | completed |
| exec-71ddd768-b7d9-4787-8996-d1497ab66958 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path names=['2026-10-29-fix-codemode-discover | 0 | completed |
| exec-455aeec4-de73-48b6-8b6e-1449147f969f | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 0 | completed |
| exec-c67f9d47-398c-4ec6-a73c-469a71dc44a8 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' import sys,re from pathlib import Path from collections import | 0 | completed |
| exec-28931476-48fb-41ef-b20e-5ea96faa4a3b | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import sys,re sys.path.insert(0,'plug | 0 | completed |
| exec-e0004c32-cb5b-4448-9997-29b2f1985dd2 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name in ['2026-10-28-fix-update-cred | 0 | completed |
| exec-67810e5e-1284-4c6f-b4c7-c06ff1764bb4 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path root=Path('/home/devops/datas/prompts')  | 0 | completed |
| exec-84e78de2-0ef0-4970-ac65-57318a8f84ee | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import json section='''## Statistiques d | 0 | completed |
| exec-7a0f2f9c-64b1-4c22-bace-f1a910478927 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -n 'REQUIRED\|MODULE\|scripts.*readdir\|readdir.*scripts\|requiredFiles\|REQUIRED_SC | 0 | completed |
| exec-840e1231-ff2a-44f8-8716-2cd4c482f8fb | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1128,1175p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-updat | 0 | completed |
| exec-c9cb9b06-e4c9-4630-89a9-2023b91a298e | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '85,145p' tests/active-component-update.test.mjs; sed -n '300,330p' tests/c | 0 | completed |
| exec-1720b81c-8bbc-4c5e-a31f-df2ff40f17ad | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1,62p' tests/controller-service-distribution.test.mjs; sed -n '1,70p' test | 0 | completed |
| exec-ab5a70c9-649c-41d5-ba53-1cb197313722 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name,a,b in [('2026-10-20-fix-stoppe | 0 | completed |
| exec-c1547b16-255b-4cf7-bf5e-5f723d81b947 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import json,hashlib base=Path('openspec/ | 0 | completed |
| exec-394f660d-4219-4e87-aac4-a61a5b2d9e91 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path from datetime import datetime,timezone r | 0 | completed |
| exec-e43a35da-d21f-4934-bbe6-b1a3eca344d8 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -v' | 0 | completed |
| exec-49d005aa-93b9-496b-b9af-34ccfa68cf41 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import re names=[p.name for p in Path('p | 0 | completed |
| exec-67df5100-54df-4aaa-9c36-13b4ce5bb474 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'node --test tests/controller-service-distribution.test.mjs tests/active-component- | 1 | failed |
| exec-d03dee9a-3f79-4ba1-8ef0-68facd714144 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-name- | 0 | completed |
| exec-27f681f9-df88-48fa-9ff1-d8de66f8b583 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "node --test --test-name-pattern 'déploiement complet puis deuxième invocation' tes | 1 | failed |
| exec-38076540-b5d9-42ca-a327-262e47264ed7 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '235,266p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update. | 0 | completed |
| exec-3fa4cc97-d662-47ce-84aa-54c793d7e467 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('tests/controller-service-distrib | 0 | completed |
| exec-0e7a47f0-3157-4c51-be22-d4b2d2d3c629 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "node --test --test-name-pattern 'déploiement complet puis deuxième invocation' tes | 0 | completed |
| exec-bac7559c-0b0e-4bf5-88ff-5711ab13b87c | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1,26p' tests/active-component-update.test.mjs; sed -n '282,310p' tests/act | 0 | completed |
| exec-f48e6281-337a-49f2-9d59-0936cd52a82a | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '250,275p' tests/controller-service-distribution.test.mjs; sed -n '610,645p | 0 | completed |
| exec-db368ede-0a73-42fe-b1d3-38ea2a5ae1df | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import difflib for name in ['server','ro | 0 | completed |
| exec-e61ab735-81f2-419c-8ce9-212b75e74ea5 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import sys sys.path.insert(0,'plugins | 0 | completed |
| exec-19485cc5-1576-41f3-9e51-4dc80355ec65 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 0 | completed |
| exec-2fe1dca3-b404-4972-8411-3287f0a32b4a | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -n 'écrire\|écriture\|rapport\|STATISTICS\|six sections' plugins/cab-approval-bridg | 0 | completed |
| exec-ff79d6a8-1a57-4580-b4c8-2a79b844f525 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re | 0 | completed |
| exec-f74dec45-00c4-4a35-a8d0-cae06267b781 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valida | 0 | completed |
| exec-37642c17-44fc-4061-9e2d-83e40ef03bba | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' import os,re,shutil from pathlib import Path from collections imp | 0 | completed |
| exec-64d7a9b2-ec18-4efa-8124-f6ea1b66594f | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-repor | 0 | completed |
| exec-d3618598-8ae8-4aa6-852e-ae67fed9e60a | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import re p=Path('plugins/cab-approval-b | 0 | completed |
| exec-3704bd5a-c4ce-493e-bb44-f316cc99832e | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B -m unittest discover -s tests -p 'test_*.py'" | 0 | completed |
| exec-f6c2f99b-4ce0-4ab7-aca5-d49a10036c8b | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' import sys,json from pathlib import Path from collections impo | 0 | completed |
| exec-3910e0e1-5885-46dd-828c-ac68d59406e7 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD | 0 | completed |
| exec-04e4f30b-4730-459d-a5e4-62cf3b1ad556 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "node --test --test-name-pattern 'update prépare les trois commandes' tests/control | 0 | completed |
| exec-aacc3ce7-fbeb-4b62-a893-33fdfdfe313b | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY  | 0 | completed |
| exec-e8935fdc-c541-4e33-ad77-a7525f093b34 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1,100p' STATISTICS.md; sed -n '175,285p' STATISTICS.md; python3 -B -m unit | 0 | completed |
| exec-219d5b51-d9df-48d7-82e5-c6b6022774b2 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1,125p' AGENTS.md" | 0 | completed |
| exec-26885462-2a16-4bd3-9f6f-7d8a98513895 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name in ['PROJECT.md','TECHNICAL.md' | 0 | completed |
| exec-c738d86b-555c-4626-9639-01c2c28f69ee | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path for name in ['openspec/changes/archive/2 | 0 | completed |
| exec-1d58a524-486e-4450-9a54-b447f67e2ceb | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import re selected=[] for p in sorted(Pa | 0 | completed |
| exec-3f13f078-f01d-4857-9ca7-7a7ed1f3ac16 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1330,1380p' /home/devops/datas/prompts/SGS.md" | 0 | completed |
| exec-83713605-14cb-4da9-bcc7-ace764bf86cc | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1,20p' openspec/changes/add-reusable-project-statistics/specs/global-proje | 0 | completed |
| exec-c3684e1e-f8a5-444c-8122-9d9db8c9a3bd | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st | 0 | completed |
| exec-676df164-71f6-419c-9855-51571ea390c4 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -n '"'^def render\|elif section\|percentage_keys\|for kind in'"' plugins/cab-appro | 0 | completed |
| exec-1ba7063e-8ade-4252-8eb7-f33699612a69 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "sed -n '1082,1198p' plugins/cab-approval-bridge/scripts/cab_sgs.py" | 0 | completed |
| exec-028bf6d4-5340-4360-8a42-420420f75bed | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py INSPECT | 0 | completed |
| exec-129ef2b0-97be-42e1-8029-cd0f0fef7e90 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 0 | completed |
| exec-994e5735-0f2d-4d2a-9595-a832ce1c75d3 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' import sys from pathlib import Path from collections import Co | 0 | completed |
| exec-1974519e-1de6-455d-a999-02efbc4f55bf | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path from collections import Counter impor | 0 | completed |
| exec-cb402fd6-da3b-426f-b92f-d9b011dbb630 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' import sys from pathlib import Path from collections import Co | 0 | completed |
| exec-179bb291-7a95-48e9-b3f1-ecbd34d33702 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path from collections import Counter impor | 0 | completed |
| exec-4ebda2f8-1d5c-4030-bc4c-d2fcb12e03cd | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 0 | completed |
| exec-67283e5a-9257-44c7-8d52-b91f88436596 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/skil | 0 | completed |
| exec-cf01ccc2-fed7-4ce9-9f30-f2f03dfba406 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'cat /home/adema261/.codex/plugins/cache/openai-curated-remote/write-like-me/0.1.1/ | 0 | completed |
| exec-0d33cf86-e9d2-41f1-b5b9-6caa143bd300 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import os,shutil print('sudo:',shutil.wh | 1 | failed |
| exec-57352ecf-b65b-48ca-ad13-c2905d968267 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -n 'action=recover\|def publish\|def recover\|recover\\(root\\)' plugins/cab-appro | 0 | completed |
| exec-6e2f2d31-6774-47d3-8707-b04a052e9217 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 1 | failed |
| exec-b30f631e-5ee1-46a2-9811-0ea2f1ffa390 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q' | 0 | completed |
| exec-db1f98b3-b1df-480b-980d-abdc5fb8104f | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "rg -n 'copie.*broker\|broker.*copie\|DIU\|cicd\|synchron.*broker' BUILD.md" | 0 | completed |
| exec-38b7421e-f403-4bd1-8992-740b3306ff59 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'sudo -n -l -- /usr/local/bin/diu projects cicd cab 2.2.40' | 0 | completed |
| exec-7e0480e9-ce28-47c4-878a-ae6d5462028b | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path import stat for name in ['AGENTS.md','sr | 0 | completed |
| exec-4a19a760-b938-4c77-8780-df7252b74b5f | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc 'node --test tests/controller-service-distribution.test.mjs' | 0 | completed |
| exec-1ef6c7c7-1eab-43ca-b151-89126c1d2063 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD | 0 | completed |
| exec-86599ae1-1ef1-4010-8933-c0c2a7d75e53 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 -B -m unittest discover -s tests -p 'test_*.py'" | 0 | completed |
| exec-bbb1ef36-b269-4c74-a906-faf0bedf0db0 | 01a1ac03-26ac-75f1-bc87-498c123f40ea | /usr/bin/zsh -lc "python3 - <<'PY' from pathlib import Path p=Path('/home/devops/datas/cab/openspec/ | 0 | completed |
| exec-b63679aa-ba5d-4789-8e7f-d7181e6d42ce | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "git status --short \| head -12; git diff --cached --stat \| tail -3; git log -1 --fo | 0 | completed |
| exec-7f0fc3c6-a57e-4ab8-91b0-173012084c5f | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "cat openspec/changes/archive/2026-11-05-add-reusable-project-statistics/DELIVERY.m | 0 | completed |
| exec-8f36447f-9e1e-46b3-a87c-ca28299bb911 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "sed -n '740,815p' /home/devops/datas/diu/modules/projects/git.sh; rg -n 'projects_ | 0 | completed |
| exec-73d806fe-a6b8-4a5a-b2b1-bfa9a7889475 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('.gitignore');s=p.read_text(); | 0 | completed |
| exec-31a09638-3a3a-4a1e-bed4-37f69a616970 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc 'git restore --staged -- .cab-cleanup-worktree .gitignore openspec/changes/archive/ | 0 | completed |
| exec-4fd00bd9-821f-4268-9e62-d1525b6c28ab | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('openspec/changes/archive/2026 | 0 | completed |
| exec-2d59431e-bcfe-4a34-8f3a-0a4dce1425ff | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY  | 1 | failed |
| exec-3d58f780-5f5a-40d0-816d-8fe4314a40c9 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import json,hashlib r=json.loads(Path | 0 | completed |
| exec-cabd5422-8b67-4604-8317-2616959ab54d | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "stat -c '%y %n' /home/devops/datas/prompts/SGS.md; sed -n '1,28p' /home/devops/dat | 0 | completed |
| exec-39a75ea9-39ed-4b46-9fc0-24e5b8f91c15 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess p=Path('output/sgs- | 0 | completed |
| exec-7bcfa3bd-652b-40ff-9e94-7fc3bc2e5edb | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess,re,sys,time from pathlib import Path log=Pat | 0 | completed |
| exec-f383b7a6-ce0d-4aea-878f-fd313ea21ccf | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import hashlib,json p=Path('/home/dev | 0 | completed |
| exec-3d0c23e9-02f7-441b-bdd5-11ab5e065c1e | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc 'tail -55 output/sgs-upstream-integration/diu-2.3.0-replay.log' | 0 | completed |
| exec-42c11721-6e3a-488f-9489-a85eaa9a36b0 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "git ls-remote --heads github main; git ls-remote --tags github 'v2.3.0*'; git fetc | 0 | completed |
| exec-033fd78a-748f-4e4e-aa7d-6c5a06c06eac | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess,json from pathlib import Path head=subproces | 0 | completed |
| exec-7a63c150-4109-4cff-9aa2-4c3feeb72c51 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc 'git merge --ff-only github/main' | 0 | completed |
| exec-a7bec5f4-925a-43c6-bd99-891cd2beaf5e | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "rg -n -m 4 'PROMPTS\|prompts\|OpenSpec\|Python\|python3' DEVOPS.md \| head -12; git sta | 0 | completed |
| exec-67ef2a05-f0a2-44b0-9e41-cce55187e99e | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import sys,json,hashlib sys.path.inse | 0 | completed |
| exec-f59fa5bb-a162-45c6-a1d7-aca34b8d6b10 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc 'cat /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/prompt/SK | 0 | completed |
| exec-68908fa5-7458-4c16-9b80-8e6b6721dd0f | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "git status --short; head -45 AGENTS.md; rg -n 'prompt\|PROMPT\|SCM' DEVOPS.md \| tail | 0 | completed |
| exec-7d027ac5-3bbd-462e-a0b2-c9270d3a8ce3 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/pr | 0 | completed |
| exec-22e0b8d6-90bc-4d7d-a44b-fbf477b23ae8 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "sed -n '285,600p' /home/devops/datas/prompts/SCM.md" | 0 | completed |
| exec-b1bf6c52-675f-407f-aa56-c4a31d658a16 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "sed -n '601,800p' /home/devops/datas/prompts/SCM.md; sed -n '1,125p' /home/devops/ | 0 | completed |
| exec-ad8b592f-53ca-4463-856b-bf0a4633001b | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc 'head -38 PROJECT.md; head -33 TECHNICAL.md; head -35 BUILD.md; head -32 DEVELOPMEN | 0 | completed |
| exec-ec0e28fc-63b3-4545-b06e-9d46bb86b239 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "sed -n '601,800p' /home/devops/datas/prompts/SCM.md" | 0 | completed |
| exec-41753224-734b-49d5-b52b-16215e2445ab | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "rg -n '"'^# \|''^## '"' /home/devops/datas/prompts/ACL.md \| tail -23; cat plugins/c | 0 | completed |
| exec-8388207d-2ddd-43eb-9457-d7c73536a7fc | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "sed -n '130,228p' /home/devops/datas/prompts/ACL.md; sed -n '309,385p' /home/devop | 0 | completed |
| exec-fd033d1e-abcb-4849-9fe9-eb61b907f91c | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "rg -n 'version\|Version' tests/{protocol-distribution,controller-service-distributi | 0 | completed |
| exec-0430c925-4a51-44e3-ba9d-81e29973d39b | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "tail -65 openspec/changes/archive/2026-11-05-add-reusable-project-statistics/QUALI | 0 | completed |
| exec-96f089cd-7831-4b60-ba49-8b07fec7296f | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess roots=['pyproject.t | 0 | completed |
| exec-6e80bb9f-44bb-4a99-8554-da7c23ca1824 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc 'sudo -n -l -- /usr/local/bin/diu projects cicd cab 2.3.1' | 0 | completed |
| exec-c5330885-ffae-4257-b386-77e3c28eb89a | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "sed -n '34,57p' tests/protocol-distribution.test.mjs; sed -n '1,45p' plugins/cab-a | 0 | completed |
| exec-def4d89a-4ac9-432e-9c66-492bdef3eae9 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path from datetime import datetime,timezon | 0 | completed |
| exec-e236a5bf-fe49-4b35-9c17-244c091970a8 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess,json from pathlib import Path r=subprocess.r | 0 | completed |
| exec-1fb1ffa3-9b04-4dee-9c22-c0ed22859c06 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc 'cat /home/devops/datas/prompts/INDEX.md' | 0 | completed |
| exec-74fad6ed-52aa-4818-9646-4eeb18950aeb | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "sed -n '1,430p' /home/devops/datas/prompts/SGS.md" | 0 | completed |
| exec-b475d594-d431-4524-a7fa-ac632e321c95 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "sed -n '431,850p' /home/devops/datas/prompts/SGS.md" | 0 | completed |
| exec-c47d29be-1511-45f4-8986-ca7731a7fd42 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "sed -n '851,1300p' /home/devops/datas/prompts/SGS.md" | 0 | completed |
| exec-ba7b63d2-ecf5-4425-a09c-3896fc2c4bd6 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "sed -n '1301,1530p' /home/devops/datas/prompts/SGS.md; sed -n '235,350p' /home/dev | 0 | completed |
| exec-22825954-bfa1-402b-858f-a5c1baf45aea | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,os out=Path('output | 0 | completed |
| exec-de7d28a6-49e5-4cda-9cad-3fcdb4bd45e2 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive' | 0 | completed |
| exec-c58dde79-bc24-4e38-b9c8-cd64e3a62d32 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' import json,hashlib,subprocess,tempfile,os from pathlib import | 0 | completed |
| exec-49cd0672-d5fe-4b91-9c7f-074378508b68 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc 'git diff --check' | 0 | completed |
| exec-ac79e6e0-aa7a-47b0-a739-a290ed790fac | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path for name in ['PROJECT.md','TECHNICAL. | 0 | completed |
| exec-865abd50-8c91-4e6f-8fbd-a7eeed9dea5b | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc 'git diff --numstat \| tail -10' | 0 | completed |
| exec-6da9e1e2-982a-49d0-aaef-f30cc9989222 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' import json,re from pathlib import Path x=json.loads(Path('ope | 0 | completed |
| exec-1feff127-6b84-4010-b63b-05172555157a | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valida | 0 | completed |
| exec-4017f274-ebc0-4818-aef3-fa072dd60472 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --specs --strict --no-interactive' | 0 | completed |
| exec-045cd93a-31f7-467e-9c25-c2c57bd4877d | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc 'git diff -- .codex/commands/SGS.md plugins/cab-approval-bridge/scripts/cab_sgs.py  | 0 | completed |
| exec-7374fd1a-2048-47de-a7f5-e7bf5e52ee93 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,json expected=set(j | 0 | completed |
| exec-20d27e22-5633-4a65-8eab-375a658cc33a | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess rows=[l.split(None,4) for l in subprocess.ch | 0 | completed |
| exec-3bb29ae3-4d14-4f54-b7c6-a8412a9a68d1 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess rows=[l.split(None,4) for l in subprocess.ch | 0 | completed |
| exec-cbbd2c18-06cf-409a-b167-8c4efcf6a3e6 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import json,hashlib,re base=Path('ope | 0 | completed |
| exec-68e83276-d39f-45f4-ae40-06707356872c | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py RECOVER | 0 | completed |
| exec-7e682c4f-44dc-4b83-8edd-5f9865945b52 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERSION | 0 | completed |
| exec-56dfd867-7bc2-46da-a2b6-71036d35b09f | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "sed -n '351,560p' /home/devops/datas/prompts/INDEX.md" | 0 | completed |
| exec-0a64ca84-7829-4c42-891f-eb1c4be682c9 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "sed -n '1,154p' /home/devops/datas/prompts/SGS.md" | 0 | completed |
| exec-f683e6ff-c4a8-4318-8c14-12ed58839d78 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess rows=[l.split(None,4) for l in subprocess.ch | 0 | completed |
| exec-99c3dfa0-7b40-47e6-8620-1290f5336f32 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path base=Path('openspec/changes/archive/2 | 0 | completed |
| exec-8e94d4a3-6c2b-4873-8a24-6276a0b55da6 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "rg -n 'version (?:actuelle\|courante\|de base)\|version source courante\|partagent la  | 0 | completed |
| exec-8ca1e7bc-ce88-479e-b489-30ef50fb8aad | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "sed -n '940,965p' README.md; sed -n '338,353p' TECHNICAL.md; sed -n '540,553p' BUI | 0 | completed |
| exec-b3d1a1c0-4053-474a-8ed2-7b1a01b9ced3 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "rg -n 'version.*2\\.2\\.39\|version.*1\\.10\\.6\|courante.*2\\.2\\.39\|servir 2\\.2\\ | 0 | completed |
| exec-e70a5571-e956-414d-bce5-f4a633b0b1c1 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "sed -n '250,268p' PROJECT.md; sed -n '845,854p' BUILD.md; sed -n '890,900p' BUILD. | 0 | completed |
| exec-4604f0bf-8a05-4756-9481-f5fa254e8573 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path for name in ['PROJECT.md','TECHNICAL. | 0 | completed |
| exec-21aae4b9-3733-442e-a132-ad9547f3abe2 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc 'git diff --check' | 0 | completed |
| exec-01639917-1ef1-4fb0-940e-aa2788f1cdbf | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess rows=[l.split(None,4) for l in subprocess.ch | 0 | completed |
| exec-f4c79df7-daae-489a-ae32-2edcc958c5d5 | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess,json,time from pathlib import Path files=sor | 0 | completed |
| exec-e0c0d31b-e6b5-4cc4-9ebd-c14517b03d3e | 01a1adbf-3303-77b1-8c96-adf3584250ef | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess rows=[l.split(None,4) for l in subprocess.ch | 0 | completed |
| exec-55bf45cf-13a9-48ca-890f-8caf1b7efb85 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import json x=json.loads(\"{\\\"schem | 0 | completed |
| exec-ad0ccd10-455c-4675-817f-2c9ea9da6fc6 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import json,time base=Path('openspec/ | 0 | completed |
| exec-fc34e294-e600-481a-ae1d-3b75e25168a8 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py CHANGE  | 0 | completed |
| exec-6a721129-c7c1-46c1-9281-53b955ff58dc | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive' | 0 | completed |
| exec-ddac2a7e-ce9d-4b13-a278-1f6800845ccc | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('openspec/changes/archive/2026 | 0 | completed |
| exec-a2db2578-845d-4e06-8bc2-4b12a50777fb | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY  | 0 | completed |
| exec-5b11a634-725c-48db-83e7-9ceedef086c4 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import re base=Path('openspec/changes | 0 | completed |
| exec-09092fd5-79bc-4faf-98a6-4fd84fa454c6 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py DELTA - | 0 | completed |
| exec-cb55f810-b4b6-4f31-ab24-c9b632851adc | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "git diff --check; git -C /home/devops/datas/prompts diff --check; git diff --stat  | 0 | completed |
| exec-5a71af06-f2d5-4e0a-9976-32f825496912 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY  | 0 | completed |
| exec-0fb5d140-481a-4de4-8273-cca44490798c | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py QUERY - | 0 | completed |
| exec-7057b393-926d-409f-9ee3-473cb896fca3 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess,re,json base=Path(' | 0 | completed |
| exec-c9b16b6c-9267-4291-bd47-f33bcf05ab88 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'git diff --check' | 0 | completed |
| exec-1e738ec0-e643-4759-b1f5-c174ef648cd6 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'git status --short --untracked-files=all \| tail -15' | 0 | completed |
| exec-63e81bdf-d2d2-4b63-bf17-16dc5f93654a | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "git log -2 --format='%h %s'; git status --short \| head -12; git ls-files '.cab-*'  | 0 | completed |
| exec-b9aa260e-2052-4c1c-9671-3565abaad146 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess rows=[l.split(None,3) for l in subprocess.ch | 0 | completed |
| exec-52f4ab04-fd97-43e5-959c-3f2a5b545f65 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'kill -INT 2915959' | 0 | completed |
| exec-5855d835-0c4f-4344-b7d5-e75abc09c718 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess,re,sys p=subprocess.Popen(['sudo','-n','/usr | 130 | failed |
| exec-9aa9971a-b5bc-40e5-9f0e-38aaef642d64 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "git ls-remote --heads github main; git ls-remote --tags github '*2.3.0*'; git stat | 0 | completed |
| exec-803fb776-a4b9-4c85-a99b-65830b992fbf | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess rows=[l.split(None,4) for l in subprocess.ch | 0 | completed |
| exec-905c3f90-c76d-405a-a9d6-d3e30f7e2505 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "git ls-remote --heads origin main; git ls-remote --tags origin '*2.3.0*'; git show | 0 | completed |
| exec-1610b73a-d05f-481d-9163-61ea064b7415 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "rg -n '_projects_cicd_replay_merge_and_push\|force-with-lease\|RECONCILE\|conflict\|re | 0 | completed |
| exec-89d0cc0f-205c-4668-9034-df3d9a0da637 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess for ref in ['b509094e','HEAD','github/main'] | 0 | completed |
| exec-74c67b26-d927-4c6b-8674-96962a938243 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "sed -n '450,516p' /home/devops/datas/diu/modules/projects/git.sh; sed -n '349,425p | 0 | completed |
| exec-e9eb3a3f-763b-4af3-b55b-5ef5b18b7061 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path import subprocess p=Path('.gitignore' | 0 | completed |
| exec-ba89ba6b-da6e-4f9b-9d37-a21a2d54d8bc | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "git diff --check; git diff --cached --stat \| tail -1; git ls-remote --heads github | 0 | completed |
| exec-4f4535fd-2ac0-435e-b134-9b21a8c771e6 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY  | 0 | completed |
| exec-f6a9c89c-1bd7-42a5-b7b5-51b886fbd994 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' from pathlib import Path p=Path('openspec/changes/archive/2026 | 0 | completed |
| exec-f13afdc0-c19b-460a-ac62-544f21148da2 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc 'git add -- .gitignore openspec/changes/archive/2026-11-05-add-reusable-project-sta | 0 | completed |
| exec-748e1dbf-3c5a-455e-8185-c91f7e06db74 | 01a1ad75-f5c3-7a33-8894-b4da72d05e68 | /usr/bin/zsh -lc "python3 -B - <<'PY' import subprocess from pathlib import Path staged=subprocess.c | 0 | completed |

Les commandes sont comptées par identifiant natif, avec leurs échecs historiques. Le relevé est figé avant cette génération et la livraison2.3.1.

## 5. Accès web

### Relevé sgs-cab-2.3.0-qualification-01

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Appels aux outils web | 0 | Aucun outil web utilisé dans les tours de codage ; HTTP de fixtures et transports internes exclus |
| Appels web réussis | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Recherches web | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Consultations web | N/A | Mesure absente ou périmètre exhaustif non identifiable |

#### Accès web

| Type | Nombre | URL effectivement visitée | Pourcentage |
| --- | --- | --- | --- |
| Outils web de production | 0 | Aucune | N/A — dénominateur nul |

### Relevé sgs-cab-2.3.0-archived-final-02

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Appels aux outils web | 0 | Aucun outil web utilisé dans les tours de codage ; HTTP de fixtures et transports internes exclus |
| Appels web réussis | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Recherches web | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Consultations web | N/A | Mesure absente ou périmètre exhaustif non identifiable |

#### Accès web

| Type | Nombre | URL effectivement visitée | Pourcentage |
| --- | --- | --- | --- |
| Outils web de production | 0 | Aucune | N/A — dénominateur nul |

### Relevé sgs-cab-2.3.1-scm-closure-03

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Appels aux outils web | 0 | Aucun outil web utilisé dans les tours de codage ; HTTP de fixtures et transports internes exclus |
| Appels web réussis | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Recherches web | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Consultations web | N/A | Mesure absente ou périmètre exhaustif non identifiable |

Aucun appel web supplémentaire inventé à partir des liens de publication.

## 6. Synthèse globale

### Relevé sgs-cab-2.3.0-qualification-01

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Écritures de fichiers | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Commandes | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Web | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Autres outils | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Total | N/A | Mesure absente ou périmètre exhaustif non identifiable |

#### État et provenance

| Élément | Valeur |
| --- | --- |
| Version CAB préparée | 2.3.0 |
| État du change | Ouvert — dépendances de validation et de périmètre ; archivage en attente |
| Statistiques globales | 175 archives ; rapport et registre publiés localement |
| Git / CI/CD | Aucun commit, tag, push ou déploiement effectué |
| Début du mandat mesuré par le tour natif | 2026-11-05T14:00:50+00:00 |
| Fin du change et durée finale | N/A — change non archivé |

Les rapports Pixs ont servi de références de structure en lecture seule, sans transfert de leurs mesures vers CAB. Aucun quota interrogé et aucun temps de génération, de service ou de pause estimé. La pause et la reprise restent dans l’historique ; la durée globale finale reste non établie.

### Relevé sgs-cab-2.3.0-archived-final-02

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Écritures de fichiers | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Commandes | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Web | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Autres outils | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Total | N/A | Mesure absente ou périmètre exhaustif non identifiable |

#### Clôture et provenance

| Élément | État | Preuve |
| --- | --- | --- |
| Change | Archivé | archive normale OpenSpec |
| Agents | Codex codeur direct ; aucun orchestrateur | métadonnées de session |
| Interface | CLI/JSON agnostique ; QUERY sans mutation | 49tests SGS inclus dans185Python |
| Publication | À exécuter après contrôle rapport/global | DIU2.3.0 autorisé |
| Collecte | Trois tours, aperçus tronqués, pas de sorties | SESSION_OBSERVATION.json |

Durée calendaire native du premier tour de codage au relevé post-archivage, pause incluse. Durée active, tokens, coûts et télémétrie non exposés restent N/A. Les mesures Pixs restent exclues. Publication DIU et activation non anticipées.

### Relevé sgs-cab-2.3.1-scm-closure-03

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Écritures de fichiers | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Commandes | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Web | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Autres outils | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Total | N/A | Mesure absente ou périmètre exhaustif non identifiable |

#### Livraison vérifiée et limites

| Élément | Résultat | Preuve |
| --- | --- | --- |
| GitHub2.3.0 | Publié :tagv2.3.0 et branche réconciliée | af940d26 / d2dd0b33 |
| Périmètre CAB | Intégralité conservée, y compris3453fichiers de copie locale | arbres Git local et distant |
| Forgejo | Indisponible, publication non confirmée | journal DIU2.3.0 |
| GitLab | Non configuré | journal DIU2.3.0 |
| Clôture2.3.1 | Qualification réussie ; livraison parDIU en fin de workflow | QUALIFICATION.md |
| Global | Tentative DELTA séparée, sans REBUILD | contrat SGS courant |
| Activation | Non exécutée | aucun CABU ni démarrage de runtime |

La maintenance globale est tentée séparément après ce rapport. Un contrat divergent laisse le couple préservé et n’empêche pas la clôture SCM. Forgejo indisponible et activation restent distincts de la qualification et de la publication GitHub.


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
          "service_percent": "N/A — télémétrie active absente",
          "throughput": "N/A — non mesuré",
          "ttmt": "N/A — non mesuré",
          "version": "N/A — version du client non collectée"
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
          "end": null,
          "start": "1793887250"
        },
        "breakdowns": {},
        "costs": {},
        "metrics": {
          "commands": {
            "evidence": [
              {
                "line": 1,
                "note": "SESSION_OBSERVATION.json ; 136 identifiants commandExecution uniques sur deux tours ; sorties exclues"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "136"
          },
          "commands_failure": {
            "evidence": [
              {
                "line": 1,
                "note": "SESSION_OBSERVATION.json ; 136 identifiants commandExecution uniques sur deux tours ; sorties exclues"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "10"
          },
          "commands_success": {
            "evidence": [
              {
                "line": 1,
                "note": "SESSION_OBSERVATION.json ; 136 identifiants commandExecution uniques sur deux tours ; sorties exclues"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "126"
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
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
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
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tasks": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tests": {
            "evidence": [],
            "reason": "Qualification globale non terminée ; suites et reprises ciblées documentées séparément, aucun total final vert inventé",
            "state": "unavailable",
            "value": null
          },
          "tests_failure": {
            "evidence": [],
            "reason": "Qualification globale non terminée ; suites et reprises ciblées documentées séparément, aucun total final vert inventé",
            "state": "unavailable",
            "value": null
          },
          "tests_success": {
            "evidence": [],
            "reason": "Qualification globale non terminée ; suites et reprises ciblées documentées séparément, aucun total final vert inventé",
            "state": "unavailable",
            "value": null
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
            "evidence": [
              {
                "line": 1,
                "note": "Aucun outil web utilisé dans les tours de codage ; HTTP de fixtures et transports internes exclus"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "0"
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
        "proof_ids": [
          "exec-2d93fa92-d705-4f5e-a8d5-92c99be76a37",
          "exec-3f9c3908-16bb-4766-a8bc-456a3404e994",
          "exec-fc96165c-fff5-4fe7-82c6-93abc466daa0",
          "exec-d1b2479a-63cf-49a9-a233-1a88b5cdf84e",
          "exec-d9657820-fafd-443f-9086-11e2289a8756",
          "exec-90740ea2-6a2b-494b-a701-61ea45c1c024",
          "exec-bb782200-d69f-419c-a026-ea78342b2942",
          "exec-ff51424a-3031-4e57-959f-4acaab57b8bd",
          "exec-280d46e7-742f-4ced-911c-5a52c4fc5c13",
          "exec-3d32e005-abb2-4902-9a52-912a22fc05d3",
          "exec-9d485ac8-431e-475f-aa26-183fba821c30",
          "exec-a0ca0c24-97e2-42ef-b0cd-6e397075ccc5",
          "exec-15fdf4b2-f761-4029-895e-e446dad05880",
          "exec-4bbd2431-523a-4493-99b5-10ff42d6d070",
          "exec-b46317df-522a-4e8e-a587-a78bbcda7328",
          "exec-d91115cd-3d3c-4ac4-9da4-2f512c13b384",
          "exec-29915495-a852-4dcd-aa75-8a69d655ec3c",
          "exec-75a2e005-10a7-432b-9938-3b9c38e661d1",
          "exec-f7b20f06-d629-4d67-bad4-7c4a0daa92b3",
          "exec-4ffa3ee1-789d-4bcc-bffc-1dfb149a2bb2",
          "exec-d77bf602-1505-4997-8105-5cbb82c5ad02",
          "exec-ecd1d168-c85f-406d-8a0f-c1858f58b580",
          "exec-0cf53168-7647-4e9a-8f52-90f468eb6413",
          "exec-9364feb6-af90-4529-99a2-79ef4f7d2753",
          "exec-b1276842-2329-49ad-85d6-d1c99bfa737d",
          "exec-ff9f0aab-c0da-4d9d-a9c2-a043d06aa31b",
          "exec-1075d8e8-ccfa-4182-a6aa-21cef956a60a",
          "exec-35ad829f-6c06-4d5c-b59e-693ab167e218",
          "exec-7bf62a01-5104-43c6-802a-061aff047ab4",
          "exec-005ce7af-5f4d-4d25-a84d-874f25bf758a",
          "exec-b4911f24-5aea-4c90-9f18-ae2225db5877",
          "exec-8e1870ed-0401-4418-9fd9-6b0b7b67a835",
          "exec-5c16f012-6a1c-4ac1-84dd-b0812eec9482",
          "exec-5173069f-27ac-49ee-b9d0-962d4c72cecd",
          "exec-b3a85c9f-3c1f-4171-b7a7-0660fa31494d",
          "exec-dd32498a-d007-4b29-96e7-d7260b888cc6",
          "exec-451847d0-fca9-4a75-a1ef-172fb15ffadb",
          "exec-4a018fc9-382e-4c5d-803b-f447d06afa65",
          "exec-29f1b8bb-d841-4974-9011-92683ad03a1b",
          "exec-c118e330-29d6-4fc9-a434-8eb55a7fea3e",
          "exec-36b60972-a862-40aa-94b6-a2b8b6179f4b",
          "exec-ab0eb899-3576-4cd2-916e-ea94c9dfb543",
          "exec-ccdb4f35-b5f2-41b0-9d59-f7e5dba52d4e",
          "exec-408eb40e-c494-4ba6-b208-d06c72473601",
          "exec-3f5233a4-4fa5-4156-b7f6-a85e5633040e",
          "exec-5abc3f47-a485-4d64-981e-6e9d0ad3e7e0",
          "exec-f5f16c73-5c75-4b40-9835-90259d980980",
          "exec-9a25e209-710b-4f9d-80da-e1bc24269ea5",
          "exec-b427ab8a-b6c4-4c50-8be9-5e918db2708d",
          "exec-3b86632f-f920-4de0-97f3-892e47975ff3",
          "exec-1167c77b-be28-4b5c-a8a8-6e9c4bdf98e6",
          "exec-af4a72a9-2965-4876-b790-2591dab36613",
          "exec-cb4d3e36-b757-446d-9fc8-259b8f43ecfc",
          "exec-670187cb-8858-4bc7-9ead-ea435ff8cd14",
          "exec-5ca9019a-a052-464e-ac01-87017649a4b1",
          "exec-e3653faf-b6a6-4d3f-bad1-95458648fc00",
          "exec-972c94b7-7d5a-40a3-989b-4ecb0635156a",
          "exec-27e815e7-c768-47d3-8475-80a3abe6e890",
          "exec-267a65f4-43aa-46d9-beb0-93829f0dcde3",
          "exec-9fcd3c27-eaad-4fdd-93e2-f0c15f453732",
          "exec-40ab9781-58c7-4828-8cd2-431367478d35",
          "exec-eac4e0e5-8273-46b8-8038-2d34ae66ccce",
          "exec-f306fb31-1b5a-436e-956d-9d1c603ce093",
          "exec-e1144a89-ea26-42f8-ac4a-d0f335a035f2",
          "exec-63fa3f7a-5405-413b-b827-a3e1600a3d62",
          "exec-cd76ad7e-7923-4f6f-9ffc-9462b94dd94c",
          "exec-a68d478b-df97-43f2-ba07-4eb0e66f8ff0",
          "exec-fcac10fa-9456-4872-8b7b-161af5fe3af2",
          "exec-71ddd768-b7d9-4787-8996-d1497ab66958",
          "exec-455aeec4-de73-48b6-8b6e-1449147f969f",
          "exec-c67f9d47-398c-4ec6-a73c-469a71dc44a8",
          "exec-28931476-48fb-41ef-b20e-5ea96faa4a3b",
          "exec-e0004c32-cb5b-4448-9997-29b2f1985dd2",
          "exec-67810e5e-1284-4c6f-b4c7-c06ff1764bb4",
          "exec-84e78de2-0ef0-4970-ac65-57318a8f84ee",
          "exec-7a0f2f9c-64b1-4c22-bace-f1a910478927",
          "exec-840e1231-ff2a-44f8-8716-2cd4c482f8fb",
          "exec-c9cb9b06-e4c9-4630-89a9-2023b91a298e",
          "exec-1720b81c-8bbc-4c5e-a31f-df2ff40f17ad",
          "exec-ab5a70c9-649c-41d5-ba53-1cb197313722",
          "exec-c1547b16-255b-4cf7-bf5e-5f723d81b947",
          "exec-394f660d-4219-4e87-aac4-a61a5b2d9e91",
          "exec-e43a35da-d21f-4934-bbe6-b1a3eca344d8",
          "exec-49d005aa-93b9-496b-b9af-34ccfa68cf41",
          "exec-67df5100-54df-4aaa-9c36-13b4ce5bb474",
          "exec-d03dee9a-3f79-4ba1-8ef0-68facd714144",
          "exec-27f681f9-df88-48fa-9ff1-d8de66f8b583",
          "exec-38076540-b5d9-42ca-a327-262e47264ed7",
          "exec-3fa4cc97-d662-47ce-84aa-54c793d7e467",
          "exec-0e7a47f0-3157-4c51-be22-d4b2d2d3c629",
          "exec-bac7559c-0b0e-4bf5-88ff-5711ab13b87c",
          "exec-f48e6281-337a-49f2-9d59-0936cd52a82a",
          "exec-db368ede-0a73-42fe-b1d3-38ea2a5ae1df",
          "exec-e61ab735-81f2-419c-8ce9-212b75e74ea5",
          "exec-19485cc5-1576-41f3-9e51-4dc80355ec65",
          "exec-2fe1dca3-b404-4972-8411-3287f0a32b4a",
          "exec-ff79d6a8-1a57-4580-b4c8-2a79b844f525",
          "exec-f74dec45-00c4-4a35-a8d0-cae06267b781",
          "exec-37642c17-44fc-4061-9e2d-83e40ef03bba",
          "exec-64d7a9b2-ec18-4efa-8124-f6ea1b66594f",
          "exec-d3618598-8ae8-4aa6-852e-ae67fed9e60a",
          "exec-3704bd5a-c4ce-493e-bb44-f316cc99832e",
          "exec-f6c2f99b-4ce0-4ab7-aca5-d49a10036c8b",
          "exec-3910e0e1-5885-46dd-828c-ac68d59406e7",
          "exec-04e4f30b-4730-459d-a5e4-62cf3b1ad556",
          "exec-aacc3ce7-fbeb-4b62-a893-33fdfdfe313b",
          "exec-e8935fdc-c541-4e33-ad77-a7525f093b34",
          "exec-219d5b51-d9df-48d7-82e5-c6b6022774b2",
          "exec-26885462-2a16-4bd3-9f6f-7d8a98513895",
          "exec-c738d86b-555c-4626-9639-01c2c28f69ee",
          "exec-1d58a524-486e-4450-9a54-b447f67e2ceb",
          "exec-3f13f078-f01d-4857-9ca7-7a7ed1f3ac16",
          "exec-83713605-14cb-4da9-bcc7-ace764bf86cc",
          "exec-c3684e1e-f8a5-444c-8122-9d9db8c9a3bd",
          "exec-676df164-71f6-419c-9855-51571ea390c4",
          "exec-1ba7063e-8ade-4252-8eb7-f33699612a69",
          "exec-028bf6d4-5340-4360-8a42-420420f75bed",
          "exec-129ef2b0-97be-42e1-8029-cd0f0fef7e90",
          "exec-994e5735-0f2d-4d2a-9595-a832ce1c75d3",
          "exec-1974519e-1de6-455d-a999-02efbc4f55bf",
          "exec-cb402fd6-da3b-426f-b92f-d9b011dbb630",
          "exec-179bb291-7a95-48e9-b3f1-ecbd34d33702",
          "exec-4ebda2f8-1d5c-4030-bc4c-d2fcb12e03cd",
          "exec-67283e5a-9257-44c7-8d52-b91f88436596",
          "exec-cf01ccc2-fed7-4ce9-9f30-f2f03dfba406",
          "exec-0d33cf86-e9d2-41f1-b5b9-6caa143bd300",
          "exec-57352ecf-b65b-48ca-ad13-c2905d968267",
          "exec-6e2f2d31-6774-47d3-8707-b04a052e9217",
          "exec-b30f631e-5ee1-46a2-9811-0ea2f1ffa390",
          "exec-db1f98b3-b1df-480b-980d-abdc5fb8104f",
          "exec-38b7421e-f403-4bd1-8992-740b3306ff59",
          "exec-7e0480e9-ce28-47c4-878a-ae6d5462028b",
          "exec-4a19a760-b938-4c77-8780-df7252b74b5f",
          "exec-1ef6c7c7-1eab-43ca-b151-89126c1d2063",
          "exec-86599ae1-1ef1-4010-8933-c0c2a7d75e53",
          "exec-bbb1ef36-b269-4c74-a906-faf0bedf0db0"
        ],
        "sessions": [
          "01a1ad34-8efb-7863-b766-c93888337933",
          "01a1ac03-26ac-75f1-bc87-498c123f40ea"
        ],
        "web_calls": []
      },
      "id": "sgs-cab-2.3.0-qualification-01",
      "input_sha256": "aeff0b734659fab184a0bb257b516031e12b50598c709b2e6e313ce93f141e39",
      "notes": {
        "1": [
          "Les décisions de périmètre, permissions natives et effets exécutés restent distincts. Aucune autorisation CAB n’est inventée pour cette session directe. Voir BLOCKERS.md et QUALIFICATION.md."
        ],
        "3": [
          "Liste ciblée, non assimilée à un nombre exhaustif de fichiers touchés ou d’écritures. Les incréments de version et modifications préexistantes sont distingués ; aucun nombre de tentatives déduit du diff Git. Les treize prompts modifiés sont dans /home/devops/datas/prompts."
        ],
        "4": [
          "126 commandes natives ont un code0 et10 un code non nul. Le code d’une enveloppe Python ne prouve pas la réussite du test Node qu’elle capture ; les résultats des suites figurent en section1. Une invocation contenant plusieurs opérations reste une seule exécution native."
        ],
        "6": [
          "Les rapports Pixs ont servi de références de structure en lecture seule, sans transfert de leurs mesures vers CAB. Aucun quota interrogé et aucun temps de génération, de service ou de pause estimé. La pause et la reprise restent dans l’historique ; la durée globale finale reste non établie."
        ]
      },
      "scope": "cumulative",
      "state": "blocked",
      "tables": {
        "1": [
          {
            "columns": [
              "Contrôle",
              "Réussis",
              "Échoués ou erreurs",
              "Ignorés",
              "Portée"
            ],
            "rows": [
              [
                "SGS ciblé final",
                43,
                0,
                0,
                "Fixtures et invariants du moteur"
              ],
              [
                "Python global",
                174,
                1,
                0,
                "175 tests ; test préexistant du checkpoint"
              ],
              [
                "Node global séquentiel",
                1245,
                11,
                31,
                "1287 cas ; reprises ciblées séparées"
              ],
              [
                "Reprise de fixtures de packaging",
                3,
                0,
                0,
                "Trois des onze échecs ; ne pas additionner aux cas uniques"
              ],
              [
                "OpenSpec global strict",
                21,
                0,
                0,
                "Éléments examinés ; une seule invocation, pas21commandes"
              ]
            ],
            "title": "Qualification locale observée"
          }
        ],
        "2": [
          {
            "columns": [
              "Source",
              "Mesure exploitable",
              "Limite"
            ],
            "rows": [
              [
                "Codex read_thread",
                "136 commandes natives uniques",
                "Deux tours ; collecte figée avant le présent rapport"
              ],
              [
                "Messages et appels outils totaux",
                "N/A",
                "Métadonnées de parties ne constituent pas un comptage natif exhaustif de messages"
              ],
              [
                "Tokens, cache, coûts, compactions",
                "N/A",
                "Mesures attribuables non exposées, aucune estimation"
              ]
            ],
            "title": "Collecte native et couverture"
          }
        ],
        "3": [
          {
            "columns": [
              "Chemin absolu",
              "Portée",
              "Écritures",
              "Refus",
              "Erreurs"
            ],
            "rows": [
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cab_sgs.py",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/sgs/SKILL.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/sgs/agents/openai.yaml",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/sgs/references/schema.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/.codex/commands/SGS.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/tests/test_sgs.py",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/tests/active-component-update.test.mjs",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/PROJECT.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/TECHNICAL.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/BUILD.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/README.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/CHANGELOG.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/DEVELOPMENT_MAP.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/openspec/BATCH_CODES.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ]
            ],
            "title": "Fichiers principaux du périmètre"
          }
        ],
        "4": [
          {
            "columns": [
              "Commande (100 caractères max)",
              "Exécutions",
              "Code de sortie",
              "Preuve native"
            ],
            "rows": [
              [
                "/usr/bin/zsh -lc 'cat openspec/changes/add-reusable-project-statistics/CHECKPOINT.md'",
                1,
                0,
                "exec-2d93fa92-d705-4f5e-a8d5-92c99be76a37"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nimport json\nfor name in ['AGENTS.md','p…",
                1,
                0,
                "exec-3f9c3908-16bb-4766-a8bc-456a3404e994"
              ],
              [
                "/usr/bin/zsh -lc 'git status --short'",
                1,
                0,
                "exec-fc96165c-fff5-4fe7-82c6-93abc466daa0"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nimport re,json\nroots=['src','plugins/ca…",
                1,
                0,
                "exec-d1b2479a-63cf-49a9-a233-1a88b5cdf84e"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\np=Path('plugins/cab-approval-bridge/ski…",
                1,
                0,
                "exec-d9657820-fafd-443f-9086-11e2289a8756"
              ],
              [
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --s…",
                1,
                0,
                "exec-90740ea2-6a2b-494b-a701-61ea45c1c024"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B -m unittest discover -s tests -p 'test_*.py'\"",
                1,
                1,
                "exec-bb782200-d69f-419c-a026-ea78342b2942"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nfrom pathlib import Path\nimport subprocess,sys,tempfile,os\npa…",
                1,
                0,
                "exec-ff51424a-3031-4e57-959f-4acaab57b8bd"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '1,140p' tests/test_change_erasure.py; sed -n '8430,8530p' src/cgpt_approv…",
                1,
                0,
                "exec-280d46e7-742f-4ced-911c-5a52c4fc5c13"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nfrom pathlib import Path\nimport json,hashlib\nregistry=json.lo…",
                1,
                0,
                "exec-3d32e005-abb2-4902-9a52-912a22fc05d3"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nfor name in ['.gitignore','openspec/cha…",
                1,
                0,
                "exec-9d485ac8-431e-475f-aa26-183fba821c30"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\np=Path('.gitignore');s=p.read_text()\nif…",
                1,
                0,
                "exec-a0ca0c24-97e2-42ef-b0cd-6e397075ccc5"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valid…",
                1,
                0,
                "exec-15fdf4b2-f761-4029-895e-e446dad05880"
              ],
              [
                "/usr/bin/zsh -lc 'git diff --check -- SGS.md ACSP.md CGP.md CISM.md CISMP.md ISM.md ISMP.md RCAM.md…",
                1,
                0,
                "exec-4bbd2431-523a-4493-99b5-10ff42d6d070"
              ],
              [
                "/usr/bin/zsh -lc 'git diff --check'",
                1,
                2,
                "exec-b46317df-522a-4e8e-a587-a78bbcda7328"
              ],
              [
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive'",
                1,
                0,
                "exec-d91115cd-3d3c-4ac4-9da4-2f512c13b384"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                1,
                0,
                "exec-29915495-a852-4dcd-aa75-8a69d655ec3c"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nimport subprocess\nfrom pathlib import Path\nfiles=sorted(str(p…",
                1,
                0,
                "exec-75a2e005-10a7-432b-9938-3b9c38e661d1"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUIL…",
                1,
                0,
                "exec-f7b20f06-d629-4d67-bad4-7c4a0daa92b3"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n 'unsafe|0o775|mode' plugins/cab-approval-bridge/scripts/cgpt-approval-bridg…",
                1,
                0,
                "exec-4ffa3ee1-789d-4bcc-bffc-1dfb149a2bb2"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '34,82p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-a…",
                1,
                0,
                "exec-d77bf602-1505-4997-8105-5cbb82c5ad02"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nimport os,stat\nprint('Acteur',os.getuid…",
                1,
                0,
                "exec-ecd1d168-c85f-406d-8a0f-c1858f58b580"
              ],
              [
                "/usr/bin/zsh -lc \"node --input-type=module - <<'JS'\nimport {mkdtemp,cp,chmod,lstat,readdir,rm} from…",
                1,
                0,
                "exec-0cf53168-7647-4e9a-8f52-90f468eb6413"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n 'corr.le les commandes|strictCommands=true' tests --glob '*.test.mjs'; sed …",
                1,
                0,
                "exec-9364feb6-af90-4529-99a2-79ef4f7d2753"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nimport subprocess\nr=subprocess.run(['node','--test','--test-r…",
                1,
                0,
                "exec-b1276842-2329-49ad-85d6-d1c99bfa737d"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nimport subprocess\nr=subprocess.run(['node','--test','--test-r…",
                1,
                0,
                "exec-ff9f0aab-c0da-4d9d-a9c2-a043d06aa31b"
              ],
              [
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'trois artefacts cibles|propriétaires expliciteme…",
                1,
                0,
                "exec-1075d8e8-ccfa-4182-a6aa-21cef956a60a"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '720,748p' tests/controller-configuration.test.mjs; rg -n 'externalRoots|b…",
                1,
                1,
                "exec-35ad829f-6c06-4d5c-b59e-693ab167e218"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nfrom pathlib import Path\nimport subprocess,tempfile\nprobes=[]…",
                1,
                0,
                "exec-7bf62a01-5104-43c6-802a-061aff047ab4"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n 'permission|experimental|saved' tests/controller-session-recovery.test.mjs …",
                1,
                1,
                "exec-005ce7af-5f4d-4d25-a84d-874f25bf758a"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n 'native-permission-control-unavailable|savedPermissions|saved.*permission|p…",
                1,
                0,
                "exec-b4911f24-5aea-4c90-9f18-ae2225db5877"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n 'openCodeV2TestHandler' tests/controller-session-recovery.test.mjs tests/co…",
                1,
                0,
                "exec-8e1870ed-0401-4418-9fd9-6b0b7b67a835"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '118,230p' tests/helpers/opencode-v2-test-server.mjs; sed -n '174,201p' pl…",
                1,
                0,
                "exec-5c16f012-6a1c-4ac1-84dd-b0812eec9482"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '1,58p' tests/helpers/opencode-v2-test-server.mjs; sed -n '750,788p' plugi…",
                1,
                0,
                "exec-5173069f-27ac-49ee-b9d0-962d4c72cecd"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n 'async function session\\\\(|projectID:' plugins/cab-approval-bridge/scripts/…",
                1,
                0,
                "exec-b3a85c9f-3c1f-4171-b7a7-0660fa31494d"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '832,866p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-openco…",
                1,
                0,
                "exec-dd32498a-d007-4b29-96e7-d7260b888cc6"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '160,188p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-openco…",
                1,
                0,
                "exec-451847d0-fca9-4a75-a1ef-172fb15ffadb"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n 'nativePermissionPolicy|checkNativeAsk\\\\(' plugins/cab-approval-bridge/scri…",
                1,
                0,
                "exec-4a018fc9-382e-4c5d-803b-f447d06afa65"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n 'kind: \\\"command\\\"|kind: .command.|kind: \\\"bash\\\"|nativeKind.*=' plugins/ca…",
                1,
                0,
                "exec-29f1b8bb-d841-4974-9011-92683ad03a1b"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '36,72p' tests/controller-session-recovery.test.mjs; sed -n '112,155p' tes…",
                1,
                1,
                "exec-c118e330-29d6-4fc9-a434-8eb55a7fea3e"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nfrom pathlib import Path\nimport tempfile,subprocess\nsource=Pa…",
                1,
                0,
                "exec-36b60972-a862-40aa-94b6-a2b8b6179f4b"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n 'function hasNativeAsk|function nativeAskState|nativeAskState' plugins/cab-…",
                1,
                0,
                "exec-ab0eb899-3576-4cd2-916e-ea94c9dfb543"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY…",
                1,
                0,
                "exec-ccdb4f35-b5f2-41b0-9d59-f7e5dba52d4e"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                1,
                0,
                "exec-408eb40e-c494-4ba6-b208-d06c72473601"
              ],
              [
                "/usr/bin/zsh -lc \"cat /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/prompt/S…",
                1,
                0,
                "exec-3f5233a4-4fa5-4156-b7f6-a85e5633040e"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/p…",
                1,
                0,
                "exec-5abc3f47-a485-4d64-981e-6e9d0ad3e7e0"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '300,525p' /home/devops/datas/prompts/SCM.md; sed -n '526,750p' /home/devo…",
                1,
                0,
                "exec-f5f16c73-5c75-4b40-9835-90259d980980"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\npaths=['.agents/plugins/marketplace.jso…",
                1,
                0,
                "exec-9a25e209-710b-4f9d-80da-e1bc24269ea5"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '680,1050p' /home/devops/datas/prompts/SGS.md\"",
                1,
                0,
                "exec-b427ab8a-b6c4-4c50-8be9-5e918db2708d"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '1,240p' /home/devops/datas/prompts/ACL.md\"",
                1,
                0,
                "exec-3b86632f-f920-4de0-97f3-892e47975ff3"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nfor name in ['openspec/specs/archive-se…",
                1,
                0,
                "exec-1167c77b-be28-4b5c-a8a8-6e9c4bdf98e6"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nfrom collections import Counter\nlabels=…",
                1,
                0,
                "exec-af4a72a9-2965-4876-b790-2591dab36613"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n 'export|argv|statistics/view|bundle|changeId|change_id|tokens|inputTokens|m…",
                1,
                0,
                "exec-cb4d3e36-b757-446d-9fc8-259b8f43ecfc"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '20,85p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observat…",
                1,
                0,
                "exec-670187cb-8858-4bc7-9ead-ea435ff8cd14"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nfor name,start,end in [('/home/devops/d…",
                1,
                0,
                "exec-5ca9019a-a052-464e-ac01-87017649a4b1"
              ],
              [
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --s…",
                1,
                1,
                "exec-e3653faf-b6a6-4d3f-bad1-95458648fc00"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\np=Path('openspec/changes/add-reusable-p…",
                1,
                0,
                "exec-972c94b7-7d5a-40a3-989b-4ecb0635156a"
              ],
              [
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --s…",
                1,
                0,
                "exec-27e815e7-c768-47d3-8475-80a3abe6e890"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py INSPEC…",
                1,
                0,
                "exec-267a65f4-43aa-46d9-beb0-93829f0dcde3"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -v'",
                1,
                0,
                "exec-9fcd3c27-eaad-4fdd-93e2-f0c15f453732"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nimport sys\nfrom pathlib import Path\nfrom collections import C…",
                1,
                0,
                "exec-40ab9781-58c7-4828-8cd2-431367478d35"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nnames=['2026-10-06-fix-manual-controlle…",
                1,
                0,
                "exec-eac4e0e5-8273-46b8-8038-2d34ae66ccce"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nfrom pathlib import Path\nfrom collections import Counter\nimpo…",
                1,
                0,
                "exec-f306fb31-1b5a-436e-956d-9d1c603ce093"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n 'CABU\\\\.md|CAB\\\\.md|commandFiles|commands/|commandNames' plugins/cab-approv…",
                1,
                0,
                "exec-e1144a89-ea26-42f8-ac4a-d0f335a035f2"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n 'CABU.md|CAB.md|commands|script' plugins/cab-approval-bridge/skills/approva…",
                1,
                0,
                "exec-63fa3f7a-5405-413b-b827-a3e1600a3d62"
              ],
              [
                "/usr/bin/zsh -lc \"rg -l '2\\\\.2\\\\.39' pyproject.toml .agents/plugins/marketplace.json .codex/command…",
                1,
                0,
                "exec-cd76ad7e-7923-4f6f-9ffc-9462b94dd94c"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\np=Path('/home/devops/datas/prompts/SGS.…",
                1,
                0,
                "exec-a68d478b-df97-43f2-ba07-4eb0e66f8ff0"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nimport sys,re\nfrom pathlib import Path\nsys.path.insert(0,'plu…",
                1,
                0,
                "exec-fcac10fa-9456-4872-8b7b-161af5fe3af2"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nnames=['2026-10-29-fix-codemode-discove…",
                1,
                0,
                "exec-71ddd768-b7d9-4787-8996-d1497ab66958"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                1,
                0,
                "exec-455aeec4-de73-48b6-8b6e-1449147f969f"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nimport sys,re\nfrom pathlib import Path\nfrom collections impor…",
                1,
                0,
                "exec-c67f9d47-398c-4ec6-a73c-469a71dc44a8"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nfrom pathlib import Path\nimport sys,re\nsys.path.insert(0,'plu…",
                1,
                0,
                "exec-28931476-48fb-41ef-b20e-5ea96faa4a3b"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nfor name in ['2026-10-28-fix-update-cre…",
                1,
                0,
                "exec-e0004c32-cb5b-4448-9997-29b2f1985dd2"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nroot=Path('/home/devops/datas/prompts')…",
                1,
                0,
                "exec-67810e5e-1284-4c6f-b4c7-c06ff1764bb4"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nimport json\nsection='''## Statistiques …",
                1,
                0,
                "exec-84e78de2-0ef0-4970-ac65-57318a8f84ee"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n 'REQUIRED|MODULE|scripts.*readdir|readdir.*scripts|requiredFiles|REQUIRED_S…",
                1,
                0,
                "exec-7a0f2f9c-64b1-4c22-bace-f1a910478927"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '1128,1175p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-upda…",
                1,
                0,
                "exec-840e1231-ff2a-44f8-8716-2cd4c482f8fb"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '85,145p' tests/active-component-update.test.mjs; sed -n '300,330p' tests/…",
                1,
                0,
                "exec-c9cb9b06-e4c9-4630-89a9-2023b91a298e"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '1,62p' tests/controller-service-distribution.test.mjs; sed -n '1,70p' tes…",
                1,
                0,
                "exec-1720b81c-8bbc-4c5e-a31f-df2ff40f17ad"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nfor name,a,b in [('2026-10-20-fix-stopp…",
                1,
                0,
                "exec-ab5a70c9-649c-41d5-ba53-1cb197313722"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nimport json,hashlib\nbase=Path('openspec…",
                1,
                0,
                "exec-c1547b16-255b-4cf7-bf5e-5f723d81b947"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nfrom datetime import datetime,timezone\n…",
                1,
                0,
                "exec-394f660d-4219-4e87-aac4-a61a5b2d9e91"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -v'",
                1,
                0,
                "exec-e43a35da-d21f-4934-bbe6-b1a3eca344d8"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nimport re\nnames=[p.name for p in Path('…",
                1,
                0,
                "exec-49d005aa-93b9-496b-b9af-34ccfa68cf41"
              ],
              [
                "/usr/bin/zsh -lc 'node --test tests/controller-service-distribution.test.mjs tests/active-component…",
                1,
                1,
                "exec-67df5100-54df-4aaa-9c36-13b4ce5bb474"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nimport subprocess\nr=subprocess.run(['node','--test','--test-name…",
                1,
                0,
                "exec-d03dee9a-3f79-4ba1-8ef0-68facd714144"
              ],
              [
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'déploiement complet puis deuxième invocation' te…",
                1,
                1,
                "exec-27f681f9-df88-48fa-9ff1-d8de66f8b583"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '235,266p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update…",
                1,
                0,
                "exec-38076540-b5d9-42ca-a327-262e47264ed7"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\np=Path('tests/controller-service-distri…",
                1,
                0,
                "exec-3fa4cc97-d662-47ce-84aa-54c793d7e467"
              ],
              [
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'déploiement complet puis deuxième invocation' te…",
                1,
                0,
                "exec-0e7a47f0-3157-4c51-be22-d4b2d2d3c629"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '1,26p' tests/active-component-update.test.mjs; sed -n '282,310p' tests/ac…",
                1,
                0,
                "exec-bac7559c-0b0e-4bf5-88ff-5711ab13b87c"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '250,275p' tests/controller-service-distribution.test.mjs; sed -n '610,645…",
                1,
                0,
                "exec-f48e6281-337a-49f2-9d59-0936cd52a82a"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nimport difflib\nfor name in ['server','r…",
                1,
                0,
                "exec-db368ede-0a73-42fe-b1d3-38ea2a5ae1df"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nfrom pathlib import Path\nimport sys\nsys.path.insert(0,'plugin…",
                1,
                0,
                "exec-e61ab735-81f2-419c-8ce9-212b75e74ea5"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                1,
                0,
                "exec-19485cc5-1576-41f3-9e51-4dc80355ec65"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n 'écrire|écriture|rapport|STATISTICS|six sections' plugins/cab-approval-brid…",
                1,
                0,
                "exec-2fe1dca3-b404-4972-8411-3287f0a32b4a"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nimport subprocess\nr=subprocess.run(['node','--test','--test-r…",
                1,
                0,
                "exec-ff79d6a8-1a57-4580-b4c8-2a79b844f525"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valid…",
                1,
                0,
                "exec-f74dec45-00c4-4a35-a8d0-cae06267b781"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nimport os,re,shutil\nfrom pathlib import Path\nfrom collections im…",
                1,
                0,
                "exec-37642c17-44fc-4061-9e2d-83e40ef03bba"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nimport subprocess\nr=subprocess.run(['node','--test','--test-repo…",
                1,
                0,
                "exec-64d7a9b2-ec18-4efa-8124-f6ea1b66594f"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nimport re\np=Path('plugins/cab-approval-…",
                1,
                0,
                "exec-d3618598-8ae8-4aa6-852e-ae67fed9e60a"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B -m unittest discover -s tests -p 'test_*.py'\"",
                1,
                0,
                "exec-3704bd5a-c4ce-493e-bb44-f316cc99832e"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nimport sys,json\nfrom pathlib import Path\nfrom collections imp…",
                1,
                0,
                "exec-f6c2f99b-4ce0-4ab7-aca5-d49a10036c8b"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUIL…",
                1,
                0,
                "exec-3910e0e1-5885-46dd-828c-ac68d59406e7"
              ],
              [
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'update prépare les trois commandes' tests/contro…",
                1,
                0,
                "exec-04e4f30b-4730-459d-a5e4-62cf3b1ad556"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY…",
                1,
                0,
                "exec-aacc3ce7-fbeb-4b62-a893-33fdfdfe313b"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '1,100p' STATISTICS.md; sed -n '175,285p' STATISTICS.md; python3 -B -m uni…",
                1,
                0,
                "exec-e8935fdc-c541-4e33-ad77-a7525f093b34"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '1,125p' AGENTS.md\"",
                1,
                0,
                "exec-219d5b51-d9df-48d7-82e5-c6b6022774b2"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nfor name in ['PROJECT.md','TECHNICAL.md…",
                1,
                0,
                "exec-26885462-2a16-4bd3-9f6f-7d8a98513895"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nfor name in ['openspec/changes/archive/…",
                1,
                0,
                "exec-c738d86b-555c-4626-9639-01c2c28f69ee"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nimport re\nselected=[]\nfor p in sorted(P…",
                1,
                0,
                "exec-1d58a524-486e-4450-9a54-b447f67e2ceb"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '1330,1380p' /home/devops/datas/prompts/SGS.md\"",
                1,
                0,
                "exec-3f13f078-f01d-4857-9ca7-7a7ed1f3ac16"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '1,20p' openspec/changes/add-reusable-project-statistics/specs/global-proj…",
                1,
                0,
                "exec-83713605-14cb-4da9-bcc7-ace764bf86cc"
              ],
              [
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --s…",
                1,
                0,
                "exec-c3684e1e-f8a5-444c-8122-9d9db8c9a3bd"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n '\"'^def render|elif section|percentage_keys|for kind in'\"' plugins/cab-appr…",
                1,
                0,
                "exec-676df164-71f6-419c-9855-51571ea390c4"
              ],
              [
                "/usr/bin/zsh -lc \"sed -n '1082,1198p' plugins/cab-approval-bridge/scripts/cab_sgs.py\"",
                1,
                0,
                "exec-1ba7063e-8ade-4252-8eb7-f33699612a69"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py INSPEC…",
                1,
                0,
                "exec-028bf6d4-5340-4360-8a42-420420f75bed"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                1,
                0,
                "exec-129ef2b0-97be-42e1-8029-cd0f0fef7e90"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nimport sys\nfrom pathlib import Path\nfrom collections import C…",
                1,
                0,
                "exec-994e5735-0f2d-4d2a-9595-a832ce1c75d3"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nfrom pathlib import Path\nfrom collections import Counter\nimpo…",
                1,
                0,
                "exec-1974519e-1de6-455d-a999-02efbc4f55bf"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nimport sys\nfrom pathlib import Path\nfrom collections import C…",
                1,
                0,
                "exec-cb402fd6-da3b-426f-b92f-d9b011dbb630"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B - <<'PY'\nfrom pathlib import Path\nfrom collections import Counter\nimpo…",
                1,
                0,
                "exec-179bb291-7a95-48e9-b3f1-ecbd34d33702"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                1,
                0,
                "exec-4ebda2f8-1d5c-4030-bc4c-d2fcb12e03cd"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\np=Path('plugins/cab-approval-bridge/ski…",
                1,
                0,
                "exec-67283e5a-9257-44c7-8d52-b91f88436596"
              ],
              [
                "/usr/bin/zsh -lc 'cat /home/adema261/.codex/plugins/cache/openai-curated-remote/write-like-me/0.1.1…",
                1,
                0,
                "exec-cf01ccc2-fed7-4ce9-9f30-f2f03dfba406"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nimport os,shutil\nprint('sudo:',shutil.w…",
                1,
                1,
                "exec-0d33cf86-e9d2-41f1-b5b9-6caa143bd300"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n 'action=recover|def publish|def recover|recover\\\\(root\\\\)' plugins/cab-appr…",
                1,
                0,
                "exec-57352ecf-b65b-48ca-ad13-c2905d968267"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                1,
                1,
                "exec-6e2f2d31-6774-47d3-8707-b04a052e9217"
              ],
              [
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                1,
                0,
                "exec-b30f631e-5ee1-46a2-9811-0ea2f1ffa390"
              ],
              [
                "/usr/bin/zsh -lc \"rg -n 'copie.*broker|broker.*copie|DIU|cicd|synchron.*broker' BUILD.md\"",
                1,
                0,
                "exec-db1f98b3-b1df-480b-980d-abdc5fb8104f"
              ],
              [
                "/usr/bin/zsh -lc 'sudo -n -l -- /usr/local/bin/diu projects cicd cab 2.2.40'",
                1,
                0,
                "exec-38b7421e-f403-4bd1-8992-740b3306ff59"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\nimport stat\nfor name in ['AGENTS.md','s…",
                1,
                0,
                "exec-7e0480e9-ce28-47c4-878a-ae6d5462028b"
              ],
              [
                "/usr/bin/zsh -lc 'node --test tests/controller-service-distribution.test.mjs'",
                1,
                0,
                "exec-4a19a760-b938-4c77-8780-df7252b74b5f"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUIL…",
                1,
                0,
                "exec-1ef6c7c7-1eab-43ca-b151-89126c1d2063"
              ],
              [
                "/usr/bin/zsh -lc \"python3 -B -m unittest discover -s tests -p 'test_*.py'\"",
                1,
                0,
                "exec-86599ae1-1ef1-4010-8933-c0c2a7d75e53"
              ],
              [
                "/usr/bin/zsh -lc \"python3 - <<'PY'\nfrom pathlib import Path\np=Path('/home/devops/datas/cab/openspec…",
                1,
                0,
                "exec-bbb1ef36-b269-4c74-a906-faf0bedf0db0"
              ]
            ],
            "title": "Commandes natives observées, avant rédaction du rapport"
          }
        ],
        "5": [
          {
            "columns": [
              "Type",
              "Nombre",
              "URL effectivement visitée",
              "Pourcentage"
            ],
            "rows": [
              [
                "Outils web de production",
                0,
                "Aucune",
                "N/A — dénominateur nul"
              ]
            ],
            "title": "Accès web"
          }
        ],
        "6": [
          {
            "columns": [
              "Élément",
              "Valeur"
            ],
            "rows": [
              [
                "Version CAB préparée",
                "2.3.0"
              ],
              [
                "État du change",
                "Ouvert — dépendances de validation et de périmètre ; archivage en attente"
              ],
              [
                "Statistiques globales",
                "175 archives ; rapport et registre publiés localement"
              ],
              [
                "Git / CI/CD",
                "Aucun commit, tag, push ou déploiement effectué"
              ],
              [
                "Début du mandat mesuré par le tour natif",
                "2026-11-05T14:00:50+00:00"
              ],
              [
                "Fin du change et durée finale",
                "N/A — change non archivé"
              ]
            ],
            "title": "État et provenance"
          }
        ]
      }
    },
    {
      "agent_details": [
        {
          "model": "N/A",
          "provider": "OpenAI",
          "reasoning": "N/A",
          "role": "coder",
          "service_percent": "N/A — télémétrie active absente",
          "throughput": "N/A — non mesuré",
          "ttmt": "N/A — non mesuré",
          "version": "N/A — version du client non collectée"
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
          "end": "1793915766",
          "start": "1793887250"
        },
        "breakdowns": {},
        "costs": {},
        "metrics": {
          "commands": {
            "evidence": [
              {
                "line": 1,
                "note": "SESSION_OBSERVATION.json ; relevé natif figé sur trois tours, identifiants dédupliqués, sorties exclues"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "234"
          },
          "commands_failure": {
            "evidence": [
              {
                "line": 1,
                "note": "SESSION_OBSERVATION.json ; relevé natif figé sur trois tours, identifiants dédupliqués, sorties exclues"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "15"
          },
          "commands_success": {
            "evidence": [
              {
                "line": 1,
                "note": "SESSION_OBSERVATION.json ; relevé natif figé sur trois tours, identifiants dédupliqués, sorties exclues"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "219"
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
                "note": "Bornes calendaires natives, pause incluse ; fin relevée après archivage"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "28516"
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
            "evidence": [
              {
                "line": 1,
                "note": "QUALIFICATION.md ; dernier bilan validé, campagnes répétées et31ignorés exclus des tests produit"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "0"
          },
          "openspec_strict_success": {
            "evidence": [
              {
                "line": 1,
                "note": "QUALIFICATION.md ; dernier bilan validé, campagnes répétées et31ignorés exclus des tests produit"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "21"
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
                "note": "QUALIFICATION.md ; dernier bilan validé, campagnes répétées et31ignorés exclus des tests produit"
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
                "note": "QUALIFICATION.md ; dernier bilan validé, campagnes répétées et31ignorés exclus des tests produit"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "13"
          },
          "tests": {
            "evidence": [
              {
                "line": 1,
                "note": "QUALIFICATION.md ; dernier bilan validé, campagnes répétées et31ignorés exclus des tests produit"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "1469"
          },
          "tests_failure": {
            "evidence": [
              {
                "line": 1,
                "note": "QUALIFICATION.md ; dernier bilan validé, campagnes répétées et31ignorés exclus des tests produit"
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
                "note": "QUALIFICATION.md ; dernier bilan validé, campagnes répétées et31ignorés exclus des tests produit"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "1469"
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
            "evidence": [
              {
                "line": 1,
                "note": "Aucun outil web utilisé dans les tours de codage ; HTTP de fixtures et transports internes exclus"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "0"
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
        "proof_ids": [
          "exec-2d93fa92-d705-4f5e-a8d5-92c99be76a37",
          "exec-3f9c3908-16bb-4766-a8bc-456a3404e994",
          "exec-fc96165c-fff5-4fe7-82c6-93abc466daa0",
          "exec-d1b2479a-63cf-49a9-a233-1a88b5cdf84e",
          "exec-d9657820-fafd-443f-9086-11e2289a8756",
          "exec-90740ea2-6a2b-494b-a701-61ea45c1c024",
          "exec-bb782200-d69f-419c-a026-ea78342b2942",
          "exec-ff51424a-3031-4e57-959f-4acaab57b8bd",
          "exec-280d46e7-742f-4ced-911c-5a52c4fc5c13",
          "exec-3d32e005-abb2-4902-9a52-912a22fc05d3",
          "exec-9d485ac8-431e-475f-aa26-183fba821c30",
          "exec-a0ca0c24-97e2-42ef-b0cd-6e397075ccc5",
          "exec-15fdf4b2-f761-4029-895e-e446dad05880",
          "exec-4bbd2431-523a-4493-99b5-10ff42d6d070",
          "exec-b46317df-522a-4e8e-a587-a78bbcda7328",
          "exec-d91115cd-3d3c-4ac4-9da4-2f512c13b384",
          "exec-29915495-a852-4dcd-aa75-8a69d655ec3c",
          "exec-75a2e005-10a7-432b-9938-3b9c38e661d1",
          "exec-f7b20f06-d629-4d67-bad4-7c4a0daa92b3",
          "exec-4ffa3ee1-789d-4bcc-bffc-1dfb149a2bb2",
          "exec-d77bf602-1505-4997-8105-5cbb82c5ad02",
          "exec-ecd1d168-c85f-406d-8a0f-c1858f58b580",
          "exec-0cf53168-7647-4e9a-8f52-90f468eb6413",
          "exec-9364feb6-af90-4529-99a2-79ef4f7d2753",
          "exec-b1276842-2329-49ad-85d6-d1c99bfa737d",
          "exec-ff9f0aab-c0da-4d9d-a9c2-a043d06aa31b",
          "exec-1075d8e8-ccfa-4182-a6aa-21cef956a60a",
          "exec-35ad829f-6c06-4d5c-b59e-693ab167e218",
          "exec-7bf62a01-5104-43c6-802a-061aff047ab4",
          "exec-005ce7af-5f4d-4d25-a84d-874f25bf758a",
          "exec-b4911f24-5aea-4c90-9f18-ae2225db5877",
          "exec-8e1870ed-0401-4418-9fd9-6b0b7b67a835",
          "exec-5c16f012-6a1c-4ac1-84dd-b0812eec9482",
          "exec-5173069f-27ac-49ee-b9d0-962d4c72cecd",
          "exec-b3a85c9f-3c1f-4171-b7a7-0660fa31494d",
          "exec-dd32498a-d007-4b29-96e7-d7260b888cc6",
          "exec-451847d0-fca9-4a75-a1ef-172fb15ffadb",
          "exec-4a018fc9-382e-4c5d-803b-f447d06afa65",
          "exec-29f1b8bb-d841-4974-9011-92683ad03a1b",
          "exec-c118e330-29d6-4fc9-a434-8eb55a7fea3e",
          "exec-36b60972-a862-40aa-94b6-a2b8b6179f4b",
          "exec-ab0eb899-3576-4cd2-916e-ea94c9dfb543",
          "exec-ccdb4f35-b5f2-41b0-9d59-f7e5dba52d4e",
          "exec-408eb40e-c494-4ba6-b208-d06c72473601",
          "exec-3f5233a4-4fa5-4156-b7f6-a85e5633040e",
          "exec-5abc3f47-a485-4d64-981e-6e9d0ad3e7e0",
          "exec-f5f16c73-5c75-4b40-9835-90259d980980",
          "exec-9a25e209-710b-4f9d-80da-e1bc24269ea5",
          "exec-b427ab8a-b6c4-4c50-8be9-5e918db2708d",
          "exec-3b86632f-f920-4de0-97f3-892e47975ff3",
          "exec-1167c77b-be28-4b5c-a8a8-6e9c4bdf98e6",
          "exec-af4a72a9-2965-4876-b790-2591dab36613",
          "exec-cb4d3e36-b757-446d-9fc8-259b8f43ecfc",
          "exec-670187cb-8858-4bc7-9ead-ea435ff8cd14",
          "exec-5ca9019a-a052-464e-ac01-87017649a4b1",
          "exec-e3653faf-b6a6-4d3f-bad1-95458648fc00",
          "exec-972c94b7-7d5a-40a3-989b-4ecb0635156a",
          "exec-27e815e7-c768-47d3-8475-80a3abe6e890",
          "exec-267a65f4-43aa-46d9-beb0-93829f0dcde3",
          "exec-9fcd3c27-eaad-4fdd-93e2-f0c15f453732",
          "exec-40ab9781-58c7-4828-8cd2-431367478d35",
          "exec-eac4e0e5-8273-46b8-8038-2d34ae66ccce",
          "exec-f306fb31-1b5a-436e-956d-9d1c603ce093",
          "exec-e1144a89-ea26-42f8-ac4a-d0f335a035f2",
          "exec-63fa3f7a-5405-413b-b827-a3e1600a3d62",
          "exec-cd76ad7e-7923-4f6f-9ffc-9462b94dd94c",
          "exec-a68d478b-df97-43f2-ba07-4eb0e66f8ff0",
          "exec-fcac10fa-9456-4872-8b7b-161af5fe3af2",
          "exec-71ddd768-b7d9-4787-8996-d1497ab66958",
          "exec-455aeec4-de73-48b6-8b6e-1449147f969f",
          "exec-c67f9d47-398c-4ec6-a73c-469a71dc44a8",
          "exec-28931476-48fb-41ef-b20e-5ea96faa4a3b",
          "exec-e0004c32-cb5b-4448-9997-29b2f1985dd2",
          "exec-67810e5e-1284-4c6f-b4c7-c06ff1764bb4",
          "exec-84e78de2-0ef0-4970-ac65-57318a8f84ee",
          "exec-7a0f2f9c-64b1-4c22-bace-f1a910478927",
          "exec-840e1231-ff2a-44f8-8716-2cd4c482f8fb",
          "exec-c9cb9b06-e4c9-4630-89a9-2023b91a298e",
          "exec-1720b81c-8bbc-4c5e-a31f-df2ff40f17ad",
          "exec-ab5a70c9-649c-41d5-ba53-1cb197313722",
          "exec-c1547b16-255b-4cf7-bf5e-5f723d81b947",
          "exec-394f660d-4219-4e87-aac4-a61a5b2d9e91",
          "exec-e43a35da-d21f-4934-bbe6-b1a3eca344d8",
          "exec-49d005aa-93b9-496b-b9af-34ccfa68cf41",
          "exec-67df5100-54df-4aaa-9c36-13b4ce5bb474",
          "exec-d03dee9a-3f79-4ba1-8ef0-68facd714144",
          "exec-27f681f9-df88-48fa-9ff1-d8de66f8b583",
          "exec-38076540-b5d9-42ca-a327-262e47264ed7",
          "exec-3fa4cc97-d662-47ce-84aa-54c793d7e467",
          "exec-0e7a47f0-3157-4c51-be22-d4b2d2d3c629",
          "exec-bac7559c-0b0e-4bf5-88ff-5711ab13b87c",
          "exec-f48e6281-337a-49f2-9d59-0936cd52a82a",
          "exec-db368ede-0a73-42fe-b1d3-38ea2a5ae1df",
          "exec-e61ab735-81f2-419c-8ce9-212b75e74ea5",
          "exec-19485cc5-1576-41f3-9e51-4dc80355ec65",
          "exec-2fe1dca3-b404-4972-8411-3287f0a32b4a",
          "exec-ff79d6a8-1a57-4580-b4c8-2a79b844f525",
          "exec-f74dec45-00c4-4a35-a8d0-cae06267b781",
          "exec-37642c17-44fc-4061-9e2d-83e40ef03bba",
          "exec-64d7a9b2-ec18-4efa-8124-f6ea1b66594f",
          "exec-d3618598-8ae8-4aa6-852e-ae67fed9e60a",
          "exec-3704bd5a-c4ce-493e-bb44-f316cc99832e",
          "exec-f6c2f99b-4ce0-4ab7-aca5-d49a10036c8b",
          "exec-3910e0e1-5885-46dd-828c-ac68d59406e7",
          "exec-04e4f30b-4730-459d-a5e4-62cf3b1ad556",
          "exec-aacc3ce7-fbeb-4b62-a893-33fdfdfe313b",
          "exec-e8935fdc-c541-4e33-ad77-a7525f093b34",
          "exec-219d5b51-d9df-48d7-82e5-c6b6022774b2",
          "exec-26885462-2a16-4bd3-9f6f-7d8a98513895",
          "exec-c738d86b-555c-4626-9639-01c2c28f69ee",
          "exec-1d58a524-486e-4450-9a54-b447f67e2ceb",
          "exec-3f13f078-f01d-4857-9ca7-7a7ed1f3ac16",
          "exec-83713605-14cb-4da9-bcc7-ace764bf86cc",
          "exec-c3684e1e-f8a5-444c-8122-9d9db8c9a3bd",
          "exec-676df164-71f6-419c-9855-51571ea390c4",
          "exec-1ba7063e-8ade-4252-8eb7-f33699612a69",
          "exec-028bf6d4-5340-4360-8a42-420420f75bed",
          "exec-129ef2b0-97be-42e1-8029-cd0f0fef7e90",
          "exec-994e5735-0f2d-4d2a-9595-a832ce1c75d3",
          "exec-1974519e-1de6-455d-a999-02efbc4f55bf",
          "exec-cb402fd6-da3b-426f-b92f-d9b011dbb630",
          "exec-179bb291-7a95-48e9-b3f1-ecbd34d33702",
          "exec-4ebda2f8-1d5c-4030-bc4c-d2fcb12e03cd",
          "exec-67283e5a-9257-44c7-8d52-b91f88436596",
          "exec-cf01ccc2-fed7-4ce9-9f30-f2f03dfba406",
          "exec-0d33cf86-e9d2-41f1-b5b9-6caa143bd300",
          "exec-57352ecf-b65b-48ca-ad13-c2905d968267",
          "exec-6e2f2d31-6774-47d3-8707-b04a052e9217",
          "exec-b30f631e-5ee1-46a2-9811-0ea2f1ffa390",
          "exec-db1f98b3-b1df-480b-980d-abdc5fb8104f",
          "exec-38b7421e-f403-4bd1-8992-740b3306ff59",
          "exec-7e0480e9-ce28-47c4-878a-ae6d5462028b",
          "exec-4a19a760-b938-4c77-8780-df7252b74b5f",
          "exec-1ef6c7c7-1eab-43ca-b151-89126c1d2063",
          "exec-86599ae1-1ef1-4010-8933-c0c2a7d75e53",
          "exec-bbb1ef36-b269-4c74-a906-faf0bedf0db0"
        ],
        "sessions": [
          "01a1ad34-8efb-7863-b766-c93888337933",
          "01a1ac03-26ac-75f1-bc87-498c123f40ea"
        ],
        "web_calls": []
      },
      "id": "sgs-cab-2.3.0-archived-final-02",
      "input_sha256": "7e97a6a0c185d37edc5edb3080ef2db8be4be1444f4bf0d772dd90d39c0ba11f",
      "notes": {
        "1": [
          "Session SCM directe, sans orchestrateur. Corrections transverses qualifiées, requêtes agnostiques et carte Statistiques vérifiées. Archivage normal réussi ; QUALIFICATION.md conserve les preuves. Les limites et essais précédents restent historiques."
        ],
        "3": [
          "Liste ciblée, non assimilée à un nombre exhaustif de fichiers touchés ou d’écritures. Les incréments de version et modifications préexistantes sont distingués ; aucun nombre de tentatives déduit du diff Git. Les treize prompts modifiés sont dans /home/devops/datas/prompts."
        ],
        "4": [
          "234 commandes natives observées :219avec code0,15avec code non nul. Relevé figé avant opérations de rapport et livraison, non incluses. Les résultats internes des suites sont vérifiés séparément."
        ],
        "6": [
          "Durée calendaire native du premier tour de codage au relevé post-archivage, pause incluse. Durée active, tokens, coûts et télémétrie non exposés restent N/A. Les mesures Pixs restent exclues. Publication DIU et activation non anticipées."
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
                "Python global",
                "185réussis,0échec",
                "unittest discover, code0"
              ],
              [
                "Node global",
                "1284réussis,31ignorés,0échec",
                "1315cas,394811ms, code0"
              ],
              [
                "Node ciblé après QUERY",
                "10réussis,0échec",
                "distribution et composant SGS"
              ],
              [
                "Syntaxe Python",
                "24fichiers, code0",
                "py_compile"
              ],
              [
                "Navigateurs",
                "Chromium et Firefox réussis",
                "output/sgs-2.3.0-browser/web-monitor-browser-results.json"
              ],
              [
                "OpenSpec strict",
                "21/21réussis",
                "canon synchronisé par archive"
              ],
              [
                "Archivage",
                "2026-11-05-add-reusable-project-statistics",
                "specsUpdated=true,11exigences ajoutées"
              ],
              [
                "SGS global",
                "176archives,génération6",
                "VERIFY --sources avant ajout de cette archive"
              ]
            ],
            "title": "Qualification finale après réconciliation"
          }
        ],
        "2": [
          {
            "columns": [
              "Source",
              "Mesure exploitable",
              "Limite"
            ],
            "rows": [
              [
                "Codex read_thread",
                "136 commandes natives uniques",
                "Deux tours ; collecte figée avant le présent rapport"
              ],
              [
                "Messages et appels outils totaux",
                "N/A",
                "Métadonnées de parties ne constituent pas un comptage natif exhaustif de messages"
              ],
              [
                "Tokens, cache, coûts, compactions",
                "N/A",
                "Mesures attribuables non exposées, aucune estimation"
              ]
            ],
            "title": "Collecte native et couverture"
          }
        ],
        "3": [
          {
            "columns": [
              "Chemin absolu",
              "Portée",
              "Écritures",
              "Refus",
              "Erreurs"
            ],
            "rows": [
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cab_sgs.py",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/sgs/SKILL.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/sgs/agents/openai.yaml",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/sgs/references/schema.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/.codex/commands/SGS.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/tests/test_sgs.py",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/tests/active-component-update.test.mjs",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/PROJECT.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/TECHNICAL.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/BUILD.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/README.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/CHANGELOG.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/DEVELOPMENT_MAP.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ],
              [
                "/home/devops/datas/cab/openspec/BATCH_CODES.md",
                "Moteur, distribution, tests ou documentation ciblée",
                "N/A",
                "N/A",
                "N/A"
              ]
            ],
            "title": "Fichiers principaux du périmètre"
          }
        ],
        "4": [
          {
            "columns": [
              "Identifiant",
              "Tour",
              "Commande (aperçu borné)",
              "Code",
              "État"
            ],
            "rows": [
              [
                "exec-bdf1241c-498e-48e7-a297-4cc29e26532e",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '100,120p' tests/test_change_erasure.py; sed -n '184,199p' plugins/cab-appr",
                "0",
                "completed"
              ],
              [
                "exec-8edc7650-35e7-4c1d-81e6-e0319e220eb7",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '184,210p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencod",
                "0",
                "completed"
              ],
              [
                "exec-9a7dcb6a-bbeb-4343-9938-706b3f7c9fd5",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '1,68p' tests/monitor-service-start.test.mjs; head -18 tests/web-monitor.te",
                "0",
                "completed"
              ],
              [
                "exec-f42f2977-e752-4078-bca3-8e63208f66cb",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'components|component|briques|version|health|/api/identity' plugins/cab-appr",
                "0",
                "completed"
              ],
              [
                "exec-7c201d29-4fb2-438e-89c7-09f7e8d56514",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_change_erasure.py -v'",
                "0",
                "completed"
              ],
              [
                "exec-d5d279b9-848d-4556-95e0-698ea92d4014",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re",
                "0",
                "completed"
              ],
              [
                "exec-43e52a4c-9c88-4620-b2c7-00f13d20b6da",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '1,80p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-da",
                "0",
                "completed"
              ],
              [
                "exec-b9b58343-7162-46d6-950d-d278ec69110c",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'node --test tests/change-erasure.test.mjs tests/change-erasure-integration.test.mj",
                "0",
                "completed"
              ],
              [
                "exec-cd02771f-e047-4c45-a231-a37d931c6d8a",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re",
                "0",
                "completed"
              ],
              [
                "exec-9cf691c7-1150-4113-b503-7c358fff9704",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'statistics|health.*grid|grid.*health|\\\\.health' plugins/cab-approval-bridge",
                "0",
                "completed"
              ],
              [
                "exec-a31df694-134a-422a-8efb-b529b21b747d",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st",
                "0",
                "completed"
              ],
              [
                "exec-8427044f-b953-4738-aa49-0d9f8cde392e",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n '\"'^function isStale|const isStale|monitor-data|process-lifecycle.mjs|script",
                "0",
                "completed"
              ],
              [
                "exec-bf48623c-b191-4481-b8d2-611ba4a370e8",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/web-",
                "0",
                "completed"
              ],
              [
                "exec-afb75ea9-3e36-4d9b-9a04-f7e9184a9fd9",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'node --test tests/sgs-component.test.mjs'",
                "0",
                "completed"
              ],
              [
                "exec-e483ae6c-87c7-4bfc-931e-45f570285a58",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import json,hashlib root=Path('.') paths",
                "0",
                "completed"
              ],
              [
                "exec-ee2679f1-77c2-49e4-9797-0bbeed39af06",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'componentVersions|sources\\\\)|sources\\\\]|components.*5|copied.length|a-z0-9'",
                "0",
                "completed"
              ],
              [
                "exec-faa3fae0-9758-4282-8daa-a45bb15665b2",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '176,201p' tests/web-monitor.test.mjs; python3 - <<'PY' from pathlib import",
                "0",
                "completed"
              ],
              [
                "exec-b34262fa-4486-4963-8784-e0ab8d2383ef",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '200,253p' tests/web-monitor-browser.mjs; sed -n '425,442p' tests/web-monit",
                "0",
                "completed"
              ],
              [
                "exec-b9be95f3-d36e-4584-8bd7-a18bb52ed67d",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'nativeAction|source.type.*shell|nativeAction.*shell' plugins/cab-approval-b",
                "0",
                "completed"
              ],
              [
                "exec-ec7e64e3-59a2-4298-ad6d-9b582f3afca5",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'corrèle les commandes avec strictCommands=true|re",
                "0",
                "completed"
              ],
              [
                "exec-226330fb-c89b-43f8-a46d-6d29bad35aac",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess files=['tests/controller-configuration.test.",
                "0",
                "completed"
              ],
              [
                "exec-01697df6-6e82-4a84-b294-10ee73ee5693",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path for kind in ['server','router','journal'",
                "0",
                "completed"
              ],
              [
                "exec-b6197583-352e-47e1-a7d1-5708d40be8ce",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('tests/web-monitor-browser.mjs');",
                "0",
                "completed"
              ],
              [
                "exec-d87af084-4eba-4461-9b90-63bfaeadff09",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess files=['tests/controller-configuration.test.",
                "0",
                "completed"
              ],
              [
                "exec-f8e223c5-6f19-416d-af57-0ff1635fbc20",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess,os from pathlib import Path out=Path('/home/",
                "0",
                "completed"
              ],
              [
                "exec-5681d202-1302-4984-b212-b8f65006e6bd",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '908,947p' tests/controller-session-recovery.test.mjs; python3 - <<'PY' fro",
                "0",
                "completed"
              ],
              [
                "exec-93fcbba2-8768-4f22-8bb3-aeb106270ce8",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'reconcile refuse autorisation absente' tests/cont",
                "1",
                "failed"
              ],
              [
                "exec-d66d96a5-d534-4199-b690-e4da6f930cba",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'preflight-native-ask-required|preflight-native-allow-not-proved' plugins/ca",
                "0",
                "completed"
              ],
              [
                "exec-1bdb13be-3d61-44b5-927a-c1f337c20ca7",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '1230,1285p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-c",
                "0",
                "completed"
              ],
              [
                "exec-f2a678b7-c2e1-4669-b056-ce1f2f099999",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'reconcile refuse autorisation absente' tests/cont",
                "0",
                "completed"
              ],
              [
                "exec-85185e6d-4928-4972-8f94-4cb463527f0d",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,json,re from urllib",
                "0",
                "completed"
              ],
              [
                "exec-82526340-7f41-4bcd-810f-4a9ef88afca0",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"git log -1 --format='%H %s'\"",
                "0",
                "completed"
              ],
              [
                "exec-e45c3105-2d1c-470a-b549-079fd689f877",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'projects.*cicd|project.*cicd|git.*push|force-with-lease' /home/devops/datas",
                "2",
                "failed"
              ],
              [
                "exec-71f72d39-39fc-448e-8476-090b90ae3fe5",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '1390,1425p' /home/devops/datas/diu/root-install-debian.sh; rg --files /hom",
                "0",
                "completed"
              ],
              [
                "exec-e7cd304e-0b21-4271-9e9a-0135886d0063",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '1414,1485p' /home/devops/datas/diu/root-install-debian.sh; rg -n '\"'^.*cic",
                "0",
                "completed"
              ],
              [
                "exec-47ec058d-d26c-4b7b-890d-1783cabf0401",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '485,516p' /home/devops/datas/diu/modules/projects/git.sh; sed -n '557,614p",
                "0",
                "completed"
              ],
              [
                "exec-f8536084-7701-4ec2-b383-2fbb6c18e770",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '820,867p' /home/devops/datas/diu/modules/projects/git.sh; sed -n '3514,354",
                "0",
                "completed"
              ],
              [
                "exec-cec64588-ea2f-42c3-a60b-01a8d09ee294",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'PROJECTS_CICD_RECONCILE' /home/devops/datas/diu/modules/projects/git.sh\"",
                "0",
                "completed"
              ],
              [
                "exec-9ac5eb22-1bcc-463b-ba59-48e921adac7f",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'GIT_TERMINAL_PROMPT=0 git fetch --no-tags github main'",
                "0",
                "completed"
              ],
              [
                "exec-0f4d0735-efa1-4896-bb3d-30eb98b23981",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,re,collections ref=",
                "0",
                "completed"
              ],
              [
                "exec-c349139a-0b1b-4a6b-be7c-d63fd0f612c1",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,json root=Path.cwd(",
                "1",
                "failed"
              ],
              [
                "exec-3f4de1d1-2adc-42eb-9243-32a4088dcd61",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,json from collectio",
                "0",
                "completed"
              ],
              [
                "exec-ddb9171a-3aaa-4161-b312-81d4a7d7335f",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,json,re out=Path('o",
                "0",
                "completed"
              ],
              [
                "exec-66490209-3699-4cad-a85c-f1fa88c8b479",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import json,re from pathlib import Path records=json.loads(Pat",
                "0",
                "completed"
              ],
              [
                "exec-98299dd9-0ffa-44d8-b81d-6704c866ec02",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import json,re,ast,hashlib root=Path.",
                "0",
                "completed"
              ],
              [
                "exec-555a7192-bd43-4509-9da7-b3ca9d467b16",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '254,274p' tests/web-monitor.test.mjs; sed -n '74,92p' tests/monitor-servic",
                "0",
                "completed"
              ],
              [
                "exec-1f777898-4fb0-4076-8986-f6c400f8ee90",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess from pathlib import Path paths=subprocess.ru",
                "0",
                "completed"
              ],
              [
                "exec-532d156b-e03e-4b4f-8dad-dbfb70bd7673",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import json,hashlib,sys sys.path.inse",
                "0",
                "completed"
              ],
              [
                "exec-e8df9cf2-ff83-4861-9d4f-06defd26d9f4",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-pr",
                "0",
                "completed"
              ],
              [
                "exec-5e57bfb6-b45e-40fc-b7e6-93cd7b5814fe",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'git diff --check'",
                "0",
                "completed"
              ],
              [
                "exec-b596ce7f-31a4-40b7-bd04-8c33330ccd2c",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive'",
                "0",
                "completed"
              ],
              [
                "exec-16e104b9-9758-45c4-a960-dd7aec2e593d",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B -m unittest discover -s tests -p 'test_*.py'\"",
                "0",
                "completed"
              ],
              [
                "exec-f10c4d40-cb98-41ac-ae79-4553db3f2748",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD",
                "0",
                "completed"
              ],
              [
                "exec-a8806504-7002-4d89-811a-e6ba285c9545",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec archive --help'",
                "0",
                "completed"
              ],
              [
                "exec-dfa66e7c-06c3-4b3a-aeea-04294f6f131b",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,sys,tempfile,os fil",
                "0",
                "completed"
              ],
              [
                "exec-bbd21159-2462-4881-8a27-99cc48425b2a",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess from pathlib import Path files=sorted(str(p)",
                "0",
                "completed"
              ],
              [
                "exec-e5433bc0-1731-4e74-a3bd-369aae3341b5",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess,os from pathlib import Path out=Path('/home/",
                "0",
                "completed"
              ],
              [
                "exec-940e18e9-80da-4423-b7b5-f19244841e8e",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'pwd; git status --short | tail -8'",
                "0",
                "completed"
              ],
              [
                "exec-97950038-0170-480d-9e1b-dfbfdf150a00",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n '\"'^(#|Version)|agnost|INSPECT|VERSION|QUERY|agent|orchestr'\"' plugins/cab-a",
                "0",
                "completed"
              ],
              [
                "exec-1553a230-b389-4b95-8327-060f502ede40",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'cat AGENTS.md PROJECT.md TECHNICAL.md BUILD.md DEVOPS.md'",
                "0",
                "completed"
              ],
              [
                "exec-92017f7a-25dd-4420-86fe-aada6c5ab62d",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"cat plugins/cab-approval-bridge/skills/sgs/SKILL.md plugins/cab-approval-bridge/sk",
                "0",
                "completed"
              ],
              [
                "exec-f480c89c-dfc6-4405-a31f-8adcd047a07c",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'ls output/sgs-2.3.0-browser; cat openspec/changes/add-reusable-project-statistics/",
                "0",
                "completed"
              ],
              [
                "exec-6ee2aebf-e945-49ff-ae58-56feef91e19e",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '670,735p' plugins/cab-approval-bridge/scripts/cab_sgs.py; sed -n '1790,193",
                "0",
                "completed"
              ],
              [
                "exec-ee549a00-4faf-4ee0-8f7d-0939c0060245",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"cat output/sgs-2.3.0-browser/web-monitor-browser-results.json; rg --files output |",
                "0",
                "completed"
              ],
              [
                "exec-a9c63a89-ac71-4a38-87b9-8d2c700c8454",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '1,95p' plugins/cab-approval-bridge/skills/sgs/SKILL.md; rg -n 'def verify|",
                "0",
                "completed"
              ],
              [
                "exec-364ec7b0-bb43-4baa-82ce-6c9b9832680b",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '1370,1430p' plugins/cab-approval-bridge/scripts/cab_sgs.py; cat .codex/com",
                "0",
                "completed"
              ],
              [
                "exec-ccb7872d-7395-45de-8e57-c21323d035c2",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '175,205p' plugins/cab-approval-bridge/scripts/cab_sgs.py; sed -n '1155,118",
                "0",
                "completed"
              ],
              [
                "exec-7af01ad7-6cc6-462f-bc3b-fa208f73bc79",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"head -30 /home/adema261/.codex/skills/.system/skill-creator/SKILL.md; rg -n 'sgs|s",
                "0",
                "completed"
              ],
              [
                "exec-854d014e-bcca-4d1a-91b4-a525eb21bbb5",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"tail -18 tests/test_sgs.py; rg -n '\"'^##|moteur|INSPECT'\"' /home/devops/datas/prom",
                "0",
                "completed"
              ],
              [
                "exec-a5379348-7158-4350-a275-e26fb300de7e",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '83,111p' /home/devops/datas/prompts/SGS.md; head -26 README.md; cat pyproj",
                "0",
                "completed"
              ],
              [
                "exec-793eb797-084a-4fa1-b89e-2618ab87bce5",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n '\"'^def entry|''^def inventory'\"' plugins/cab-approval-bridge/scripts/cab_sg",
                "0",
                "completed"
              ],
              [
                "exec-2a75c393-6ddb-4d40-9e42-31f5b5865b35",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/s",
                "0",
                "completed"
              ],
              [
                "exec-a3785c51-188c-4daf-bc0a-2f4146c2faee",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('tests/test_sgs.py');s=p.read_",
                "0",
                "completed"
              ],
              [
                "exec-29e216df-b4bd-4615-9554-29d65cb996b3",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'node --test tests/sgs-component.test.mjs tests/protocol-distribution.test.mjs'",
                "0",
                "completed"
              ],
              [
                "exec-736f4c1c-7b4a-4bd4-9366-6efc661afa06",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive'",
                "1",
                "failed"
              ],
              [
                "exec-d09c82a5-61b4-474e-b5dd-897c837d3478",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable",
                "0",
                "completed"
              ],
              [
                "exec-0ae16563-2554-46c9-9f93-dfb0bd5ef28e",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B -m unittest discover -s tests -p 'test_*.py' -q\"",
                "0",
                "completed"
              ],
              [
                "exec-20e5a531-5139-4753-99ad-e637279b442d",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valida",
                "0",
                "completed"
              ],
              [
                "exec-57fcc6e5-ddb2-4fa8-a4a3-14596a6bc637",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'git diff --check'",
                "0",
                "completed"
              ],
              [
                "exec-61981c49-c7b1-406c-a6d5-2993251d2aaa",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive'",
                "0",
                "completed"
              ],
              [
                "exec-8e2de567-7615-4bee-bc2e-3f463ac1d592",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'SGS|1.18' /home/devops/datas/prompts/{INDEX.md,README.md} 2>/dev/null; cat ",
                "2",
                "failed"
              ],
              [
                "exec-ee9825a0-d6a7-4814-9227-d17d845ba863",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD",
                "0",
                "completed"
              ],
              [
                "exec-deafcb20-ebd4-4c4a-9aa8-e7c6e32cb892",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '440,468p' /home/devops/datas/prompts/INDEX.md; head -25 DEVELOPMENT_MAP.md",
                "0",
                "completed"
              ],
              [
                "exec-1366f16e-e91d-4fbd-b575-1f998ac23f02",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import tempfile,subprocess,os files=[",
                "0",
                "completed"
              ],
              [
                "exec-e94c0213-107b-4bab-8941-32b4405ac045",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('/home/devops/datas/prompts/IN",
                "0",
                "completed"
              ],
              [
                "exec-032df10f-24af-4bd9-9cb7-32656bb4f71d",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY ",
                "0",
                "completed"
              ],
              [
                "exec-ab069060-2a67-4be3-af14-dd41b8085679",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py QUERY -",
                "0",
                "completed"
              ],
              [
                "exec-0816a7dc-39ad-4b66-9758-c728309ccb00",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'cicd|archiv|BLOCKER|statist|livraison|commit|DIU' /home/devops/datas/prompt",
                "0",
                "completed"
              ],
              [
                "exec-51aaf73a-9cbf-4e66-a2fb-51823882546d",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec archive add-reusable-project-statistics --yes",
                "0",
                "completed"
              ],
              [
                "exec-ab4c47f1-0532-4b2f-8788-bc6b90a8b63b",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"head -15 openspec/specs/global-project-statistics/spec.md; sed -n '917,938p' /home",
                "0",
                "completed"
              ],
              [
                "exec-d5e8a946-53e6-40e6-b9f4-ec39769e59e9",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '40,90p' plugins/cab-approval-bridge/scripts/cab_sgs.py; python3 -B - <<'PY",
                "0",
                "completed"
              ],
              [
                "exec-2d93fa92-d705-4f5e-a8d5-92c99be76a37",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'cat openspec/changes/add-reusable-project-statistics/CHECKPOINT.md'",
                "0",
                "completed"
              ],
              [
                "exec-3f9c3908-16bb-4766-a8bc-456a3404e994",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import json for name in ['AGENTS.md','py",
                "0",
                "completed"
              ],
              [
                "exec-fc96165c-fff5-4fe7-82c6-93abc466daa0",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'git status --short'",
                "0",
                "completed"
              ],
              [
                "exec-d1b2479a-63cf-49a9-a233-1a88b5cdf84e",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import re,json roots=['src','plugins/cab",
                "0",
                "completed"
              ],
              [
                "exec-d9657820-fafd-443f-9086-11e2289a8756",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/skil",
                "0",
                "completed"
              ],
              [
                "exec-90740ea2-6a2b-494b-a701-61ea45c1c024",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st",
                "0",
                "completed"
              ],
              [
                "exec-bb782200-d69f-419c-a026-ea78342b2942",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B -m unittest discover -s tests -p 'test_*.py'\"",
                "1",
                "failed"
              ],
              [
                "exec-ff51424a-3031-4e57-959f-4acaab57b8bd",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,sys,tempfile,os pat",
                "0",
                "completed"
              ],
              [
                "exec-280d46e7-742f-4ced-911c-5a52c4fc5c13",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"sed -n '1,140p' tests/test_change_erasure.py; sed -n '8430,8530p' src/cgpt_approva",
                "0",
                "completed"
              ],
              [
                "exec-3d32e005-abb2-4902-9a52-912a22fc05d3",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import json,hashlib registry=json.loa",
                "0",
                "completed"
              ],
              [
                "exec-9d485ac8-431e-475f-aa26-183fba821c30",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path for name in ['.gitignore','openspec/chan",
                "0",
                "completed"
              ],
              [
                "exec-a0ca0c24-97e2-42ef-b0cd-6e397075ccc5",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('.gitignore');s=p.read_text() if ",
                "0",
                "completed"
              ],
              [
                "exec-15fdf4b2-f761-4029-895e-e446dad05880",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valida",
                "0",
                "completed"
              ],
              [
                "exec-4bbd2431-523a-4493-99b5-10ff42d6d070",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'git diff --check -- SGS.md ACSP.md CGP.md CISM.md CISMP.md ISM.md ISMP.md RCAM.md ",
                "0",
                "completed"
              ],
              [
                "exec-b46317df-522a-4e8e-a587-a78bbcda7328",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'git diff --check'",
                "2",
                "failed"
              ],
              [
                "exec-d91115cd-3d3c-4ac4-9da4-2f512c13b384",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive'",
                "0",
                "completed"
              ],
              [
                "exec-29915495-a852-4dcd-aa75-8a69d655ec3c",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "0",
                "completed"
              ],
              [
                "exec-75a2e005-10a7-432b-9938-3b9c38e661d1",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess from pathlib import Path files=sorted(str(p)",
                "0",
                "completed"
              ],
              [
                "exec-f7b20f06-d629-4d67-bad4-7c4a0daa92b3",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD",
                "0",
                "completed"
              ],
              [
                "exec-4ffa3ee1-789d-4bcc-bffc-1dfb149a2bb2",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'unsafe|0o775|mode' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge",
                "0",
                "completed"
              ],
              [
                "exec-d77bf602-1505-4997-8105-5cbb82c5ad02",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"sed -n '34,82p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-ar",
                "0",
                "completed"
              ],
              [
                "exec-ecd1d168-c85f-406d-8a0f-c1858f58b580",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import os,stat print('Acteur',os.getuid(",
                "0",
                "completed"
              ],
              [
                "exec-0cf53168-7647-4e9a-8f52-90f468eb6413",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"node --input-type=module - <<'JS' import {mkdtemp,cp,chmod,lstat,readdir,rm} from ",
                "0",
                "completed"
              ],
              [
                "exec-9364feb6-af90-4529-99a2-79ef4f7d2753",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'corr.le les commandes|strictCommands=true' tests --glob '*.test.mjs'; sed -",
                "0",
                "completed"
              ],
              [
                "exec-b1276842-2329-49ad-85d6-d1c99bfa737d",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re",
                "0",
                "completed"
              ],
              [
                "exec-ff9f0aab-c0da-4d9d-a9c2-a043d06aa31b",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re",
                "0",
                "completed"
              ],
              [
                "exec-1075d8e8-ccfa-4182-a6aa-21cef956a60a",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'trois artefacts cibles|propriétaires explicitemen",
                "0",
                "completed"
              ],
              [
                "exec-35ad829f-6c06-4d5c-b59e-693ab167e218",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"sed -n '720,748p' tests/controller-configuration.test.mjs; rg -n 'externalRoots|br",
                "1",
                "failed"
              ],
              [
                "exec-7bf62a01-5104-43c6-802a-061aff047ab4",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,tempfile probes=[] ",
                "0",
                "completed"
              ],
              [
                "exec-005ce7af-5f4d-4d25-a84d-874f25bf758a",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'permission|experimental|saved' tests/controller-session-recovery.test.mjs |",
                "1",
                "failed"
              ],
              [
                "exec-b4911f24-5aea-4c90-9f18-ae2225db5877",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'native-permission-control-unavailable|savedPermissions|saved.*permission|pe",
                "0",
                "completed"
              ],
              [
                "exec-8e1870ed-0401-4418-9fd9-6b0b7b67a835",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'openCodeV2TestHandler' tests/controller-session-recovery.test.mjs tests/con",
                "0",
                "completed"
              ],
              [
                "exec-5c16f012-6a1c-4ac1-84dd-b0812eec9482",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"sed -n '118,230p' tests/helpers/opencode-v2-test-server.mjs; sed -n '174,201p' plu",
                "0",
                "completed"
              ],
              [
                "exec-5173069f-27ac-49ee-b9d0-962d4c72cecd",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"sed -n '1,58p' tests/helpers/opencode-v2-test-server.mjs; sed -n '750,788p' plugin",
                "0",
                "completed"
              ],
              [
                "exec-b3a85c9f-3c1f-4171-b7a7-0660fa31494d",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'async function session\\\\(|projectID:' plugins/cab-approval-bridge/scripts/c",
                "0",
                "completed"
              ],
              [
                "exec-dd32498a-d007-4b29-96e7-d7260b888cc6",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"sed -n '832,866p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencod",
                "0",
                "completed"
              ],
              [
                "exec-451847d0-fca9-4a75-a1ef-172fb15ffadb",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"sed -n '160,188p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencod",
                "0",
                "completed"
              ],
              [
                "exec-4a018fc9-382e-4c5d-803b-f447d06afa65",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'nativePermissionPolicy|checkNativeAsk\\\\(' plugins/cab-approval-bridge/scrip",
                "0",
                "completed"
              ],
              [
                "exec-29f1b8bb-d841-4974-9011-92683ad03a1b",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'kind: \\\"command\\\"|kind: .command.|kind: \\\"bash\\\"|nativeKind.*=' plugins/cab",
                "0",
                "completed"
              ],
              [
                "exec-c118e330-29d6-4fc9-a434-8eb55a7fea3e",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"sed -n '36,72p' tests/controller-session-recovery.test.mjs; sed -n '112,155p' test",
                "1",
                "failed"
              ],
              [
                "exec-36b60972-a862-40aa-94b6-a2b8b6179f4b",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import tempfile,subprocess source=Pat",
                "0",
                "completed"
              ],
              [
                "exec-ab0eb899-3576-4cd2-916e-ea94c9dfb543",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'function hasNativeAsk|function nativeAskState|nativeAskState' plugins/cab-a",
                "0",
                "completed"
              ],
              [
                "exec-ccdb4f35-b5f2-41b0-9d59-f7e5dba52d4e",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY ",
                "0",
                "completed"
              ],
              [
                "exec-408eb40e-c494-4ba6-b208-d06c72473601",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "0",
                "completed"
              ],
              [
                "exec-2d8f5722-c039-4b54-a0b8-1b9973c797b9",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import sys,json,hashlib from datetime",
                "0",
                "completed"
              ],
              [
                "exec-ec705251-ab16-4d37-81e1-069dbf13be7d",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py CHANGE ",
                "0",
                "completed"
              ],
              [
                "exec-a509f6d2-1f26-4751-84ae-76d74c956922",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-pr",
                "0",
                "completed"
              ],
              [
                "exec-a79bedf7-4056-4a35-87ec-1ab28519a2b0",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'sudo -n -l -- /usr/local/bin/diu projects cicd cab 2.3.0'",
                "0",
                "completed"
              ],
              [
                "exec-01bf817d-cad7-4e8e-8595-3c5fc0490ed0",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import re,sys,stat sys.path.insert(0,",
                "0",
                "completed"
              ],
              [
                "exec-a6afdd1f-cfca-4178-9adc-a2f0e422e951",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY ",
                "0",
                "completed"
              ],
              [
                "exec-456e808c-fa9a-4273-bb39-ae3346911495",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-pr",
                "0",
                "completed"
              ],
              [
                "exec-3f5233a4-4fa5-4156-b7f6-a85e5633040e",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"cat /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/prompt/SK",
                "0",
                "completed"
              ],
              [
                "exec-5abc3f47-a485-4d64-981e-6e9d0ad3e7e0",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/pr",
                "0",
                "completed"
              ],
              [
                "exec-f5f16c73-5c75-4b40-9835-90259d980980",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '300,525p' /home/devops/datas/prompts/SCM.md; sed -n '526,750p' /home/devop",
                "0",
                "completed"
              ],
              [
                "exec-9a25e209-710b-4f9d-80da-e1bc24269ea5",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path paths=['.agents/plugins/marketplace.json",
                "0",
                "completed"
              ],
              [
                "exec-b427ab8a-b6c4-4c50-8be9-5e918db2708d",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '680,1050p' /home/devops/datas/prompts/SGS.md\"",
                "0",
                "completed"
              ],
              [
                "exec-3b86632f-f920-4de0-97f3-892e47975ff3",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1,240p' /home/devops/datas/prompts/ACL.md\"",
                "0",
                "completed"
              ],
              [
                "exec-1167c77b-be28-4b5c-a8a8-6e9c4bdf98e6",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path for name in ['openspec/specs/archive-ses",
                "0",
                "completed"
              ],
              [
                "exec-af4a72a9-2965-4876-b790-2591dab36613",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path from collections import Counter labels=C",
                "0",
                "completed"
              ],
              [
                "exec-cb4d3e36-b757-446d-9fc8-259b8f43ecfc",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -n 'export|argv|statistics/view|bundle|changeId|change_id|tokens|inputTokens|me",
                "0",
                "completed"
              ],
              [
                "exec-670187cb-8858-4bc7-9ead-ea435ff8cd14",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '20,85p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observati",
                "0",
                "completed"
              ],
              [
                "exec-5ca9019a-a052-464e-ac01-87017649a4b1",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path for name,start,end in [('/home/devops/da",
                "0",
                "completed"
              ],
              [
                "exec-e3653faf-b6a6-4d3f-bad1-95458648fc00",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st",
                "1",
                "failed"
              ],
              [
                "exec-972c94b7-7d5a-40a3-989b-4ecb0635156a",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-pr",
                "0",
                "completed"
              ],
              [
                "exec-27e815e7-c768-47d3-8475-80a3abe6e890",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st",
                "0",
                "completed"
              ],
              [
                "exec-267a65f4-43aa-46d9-beb0-93829f0dcde3",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py INSPECT",
                "0",
                "completed"
              ],
              [
                "exec-9fcd3c27-eaad-4fdd-93e2-f0c15f453732",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -v'",
                "0",
                "completed"
              ],
              [
                "exec-40ab9781-58c7-4828-8cd2-431367478d35",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import sys from pathlib import Path from collections import Co",
                "0",
                "completed"
              ],
              [
                "exec-eac4e0e5-8273-46b8-8038-2d34ae66ccce",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path names=['2026-10-06-fix-manual-controller",
                "0",
                "completed"
              ],
              [
                "exec-f306fb31-1b5a-436e-956d-9d1c603ce093",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path from collections import Counter impor",
                "0",
                "completed"
              ],
              [
                "exec-e1144a89-ea26-42f8-ac4a-d0f335a035f2",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -n 'CABU\\\\.md|CAB\\\\.md|commandFiles|commands/|commandNames' plugins/cab-approva",
                "0",
                "completed"
              ],
              [
                "exec-63fa3f7a-5405-413b-b827-a3e1600a3d62",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -n 'CABU.md|CAB.md|commands|script' plugins/cab-approval-bridge/skills/approval",
                "0",
                "completed"
              ],
              [
                "exec-cd76ad7e-7923-4f6f-9ffc-9462b94dd94c",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -l '2\\\\.2\\\\.39' pyproject.toml .agents/plugins/marketplace.json .codex/commands",
                "0",
                "completed"
              ],
              [
                "exec-a68d478b-df97-43f2-ba07-4eb0e66f8ff0",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('/home/devops/datas/prompts/SGS.m",
                "0",
                "completed"
              ],
              [
                "exec-fcac10fa-9456-4872-8b7b-161af5fe3af2",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import sys,re from pathlib import Path sys.path.insert(0,'plug",
                "0",
                "completed"
              ],
              [
                "exec-71ddd768-b7d9-4787-8996-d1497ab66958",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path names=['2026-10-29-fix-codemode-discover",
                "0",
                "completed"
              ],
              [
                "exec-455aeec4-de73-48b6-8b6e-1449147f969f",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "0",
                "completed"
              ],
              [
                "exec-c67f9d47-398c-4ec6-a73c-469a71dc44a8",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import sys,re from pathlib import Path from collections import",
                "0",
                "completed"
              ],
              [
                "exec-28931476-48fb-41ef-b20e-5ea96faa4a3b",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import sys,re sys.path.insert(0,'plug",
                "0",
                "completed"
              ],
              [
                "exec-e0004c32-cb5b-4448-9997-29b2f1985dd2",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path for name in ['2026-10-28-fix-update-cred",
                "0",
                "completed"
              ],
              [
                "exec-67810e5e-1284-4c6f-b4c7-c06ff1764bb4",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path root=Path('/home/devops/datas/prompts') ",
                "0",
                "completed"
              ],
              [
                "exec-84e78de2-0ef0-4970-ac65-57318a8f84ee",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import json section='''## Statistiques d",
                "0",
                "completed"
              ],
              [
                "exec-7a0f2f9c-64b1-4c22-bace-f1a910478927",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -n 'REQUIRED|MODULE|scripts.*readdir|readdir.*scripts|requiredFiles|REQUIRED_SC",
                "0",
                "completed"
              ],
              [
                "exec-840e1231-ff2a-44f8-8716-2cd4c482f8fb",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1128,1175p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-updat",
                "0",
                "completed"
              ],
              [
                "exec-c9cb9b06-e4c9-4630-89a9-2023b91a298e",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '85,145p' tests/active-component-update.test.mjs; sed -n '300,330p' tests/c",
                "0",
                "completed"
              ],
              [
                "exec-1720b81c-8bbc-4c5e-a31f-df2ff40f17ad",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1,62p' tests/controller-service-distribution.test.mjs; sed -n '1,70p' test",
                "0",
                "completed"
              ],
              [
                "exec-ab5a70c9-649c-41d5-ba53-1cb197313722",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path for name,a,b in [('2026-10-20-fix-stoppe",
                "0",
                "completed"
              ],
              [
                "exec-c1547b16-255b-4cf7-bf5e-5f723d81b947",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import json,hashlib base=Path('openspec/",
                "0",
                "completed"
              ],
              [
                "exec-394f660d-4219-4e87-aac4-a61a5b2d9e91",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path from datetime import datetime,timezone r",
                "0",
                "completed"
              ],
              [
                "exec-e43a35da-d21f-4934-bbe6-b1a3eca344d8",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -v'",
                "0",
                "completed"
              ],
              [
                "exec-49d005aa-93b9-496b-b9af-34ccfa68cf41",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import re names=[p.name for p in Path('p",
                "0",
                "completed"
              ],
              [
                "exec-67df5100-54df-4aaa-9c36-13b4ce5bb474",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'node --test tests/controller-service-distribution.test.mjs tests/active-component-",
                "1",
                "failed"
              ],
              [
                "exec-d03dee9a-3f79-4ba1-8ef0-68facd714144",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-name-",
                "0",
                "completed"
              ],
              [
                "exec-27f681f9-df88-48fa-9ff1-d8de66f8b583",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'déploiement complet puis deuxième invocation' tes",
                "1",
                "failed"
              ],
              [
                "exec-38076540-b5d9-42ca-a327-262e47264ed7",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '235,266p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.",
                "0",
                "completed"
              ],
              [
                "exec-3fa4cc97-d662-47ce-84aa-54c793d7e467",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('tests/controller-service-distrib",
                "0",
                "completed"
              ],
              [
                "exec-0e7a47f0-3157-4c51-be22-d4b2d2d3c629",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'déploiement complet puis deuxième invocation' tes",
                "0",
                "completed"
              ],
              [
                "exec-bac7559c-0b0e-4bf5-88ff-5711ab13b87c",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1,26p' tests/active-component-update.test.mjs; sed -n '282,310p' tests/act",
                "0",
                "completed"
              ],
              [
                "exec-f48e6281-337a-49f2-9d59-0936cd52a82a",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '250,275p' tests/controller-service-distribution.test.mjs; sed -n '610,645p",
                "0",
                "completed"
              ],
              [
                "exec-db368ede-0a73-42fe-b1d3-38ea2a5ae1df",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import difflib for name in ['server','ro",
                "0",
                "completed"
              ],
              [
                "exec-e61ab735-81f2-419c-8ce9-212b75e74ea5",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import sys sys.path.insert(0,'plugins",
                "0",
                "completed"
              ],
              [
                "exec-19485cc5-1576-41f3-9e51-4dc80355ec65",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "0",
                "completed"
              ],
              [
                "exec-2fe1dca3-b404-4972-8411-3287f0a32b4a",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -n 'écrire|écriture|rapport|STATISTICS|six sections' plugins/cab-approval-bridg",
                "0",
                "completed"
              ],
              [
                "exec-ff79d6a8-1a57-4580-b4c8-2a79b844f525",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re",
                "0",
                "completed"
              ],
              [
                "exec-f74dec45-00c4-4a35-a8d0-cae06267b781",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valida",
                "0",
                "completed"
              ],
              [
                "exec-37642c17-44fc-4061-9e2d-83e40ef03bba",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' import os,re,shutil from pathlib import Path from collections imp",
                "0",
                "completed"
              ],
              [
                "exec-64d7a9b2-ec18-4efa-8124-f6ea1b66594f",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-repor",
                "0",
                "completed"
              ],
              [
                "exec-d3618598-8ae8-4aa6-852e-ae67fed9e60a",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import re p=Path('plugins/cab-approval-b",
                "0",
                "completed"
              ],
              [
                "exec-3704bd5a-c4ce-493e-bb44-f316cc99832e",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B -m unittest discover -s tests -p 'test_*.py'\"",
                "0",
                "completed"
              ],
              [
                "exec-f6c2f99b-4ce0-4ab7-aca5-d49a10036c8b",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import sys,json from pathlib import Path from collections impo",
                "0",
                "completed"
              ],
              [
                "exec-3910e0e1-5885-46dd-828c-ac68d59406e7",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD",
                "0",
                "completed"
              ],
              [
                "exec-04e4f30b-4730-459d-a5e4-62cf3b1ad556",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'update prépare les trois commandes' tests/control",
                "0",
                "completed"
              ],
              [
                "exec-aacc3ce7-fbeb-4b62-a893-33fdfdfe313b",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY ",
                "0",
                "completed"
              ],
              [
                "exec-e8935fdc-c541-4e33-ad77-a7525f093b34",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1,100p' STATISTICS.md; sed -n '175,285p' STATISTICS.md; python3 -B -m unit",
                "0",
                "completed"
              ],
              [
                "exec-219d5b51-d9df-48d7-82e5-c6b6022774b2",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1,125p' AGENTS.md\"",
                "0",
                "completed"
              ],
              [
                "exec-26885462-2a16-4bd3-9f6f-7d8a98513895",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path for name in ['PROJECT.md','TECHNICAL.md'",
                "0",
                "completed"
              ],
              [
                "exec-c738d86b-555c-4626-9639-01c2c28f69ee",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path for name in ['openspec/changes/archive/2",
                "0",
                "completed"
              ],
              [
                "exec-1d58a524-486e-4450-9a54-b447f67e2ceb",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import re selected=[] for p in sorted(Pa",
                "0",
                "completed"
              ],
              [
                "exec-3f13f078-f01d-4857-9ca7-7a7ed1f3ac16",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1330,1380p' /home/devops/datas/prompts/SGS.md\"",
                "0",
                "completed"
              ],
              [
                "exec-83713605-14cb-4da9-bcc7-ace764bf86cc",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1,20p' openspec/changes/add-reusable-project-statistics/specs/global-proje",
                "0",
                "completed"
              ],
              [
                "exec-c3684e1e-f8a5-444c-8122-9d9db8c9a3bd",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st",
                "0",
                "completed"
              ],
              [
                "exec-676df164-71f6-419c-9855-51571ea390c4",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -n '\"'^def render|elif section|percentage_keys|for kind in'\"' plugins/cab-appro",
                "0",
                "completed"
              ],
              [
                "exec-1ba7063e-8ade-4252-8eb7-f33699612a69",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1082,1198p' plugins/cab-approval-bridge/scripts/cab_sgs.py\"",
                "0",
                "completed"
              ],
              [
                "exec-028bf6d4-5340-4360-8a42-420420f75bed",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py INSPECT",
                "0",
                "completed"
              ],
              [
                "exec-129ef2b0-97be-42e1-8029-cd0f0fef7e90",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "0",
                "completed"
              ],
              [
                "exec-994e5735-0f2d-4d2a-9595-a832ce1c75d3",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import sys from pathlib import Path from collections import Co",
                "0",
                "completed"
              ],
              [
                "exec-1974519e-1de6-455d-a999-02efbc4f55bf",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path from collections import Counter impor",
                "0",
                "completed"
              ],
              [
                "exec-cb402fd6-da3b-426f-b92f-d9b011dbb630",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import sys from pathlib import Path from collections import Co",
                "0",
                "completed"
              ],
              [
                "exec-179bb291-7a95-48e9-b3f1-ecbd34d33702",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path from collections import Counter impor",
                "0",
                "completed"
              ],
              [
                "exec-4ebda2f8-1d5c-4030-bc4c-d2fcb12e03cd",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "0",
                "completed"
              ],
              [
                "exec-67283e5a-9257-44c7-8d52-b91f88436596",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/skil",
                "0",
                "completed"
              ],
              [
                "exec-cf01ccc2-fed7-4ce9-9f30-f2f03dfba406",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'cat /home/adema261/.codex/plugins/cache/openai-curated-remote/write-like-me/0.1.1/",
                "0",
                "completed"
              ],
              [
                "exec-0d33cf86-e9d2-41f1-b5b9-6caa143bd300",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import os,shutil print('sudo:',shutil.wh",
                "1",
                "failed"
              ],
              [
                "exec-57352ecf-b65b-48ca-ad13-c2905d968267",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -n 'action=recover|def publish|def recover|recover\\\\(root\\\\)' plugins/cab-appro",
                "0",
                "completed"
              ],
              [
                "exec-6e2f2d31-6774-47d3-8707-b04a052e9217",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "1",
                "failed"
              ],
              [
                "exec-b30f631e-5ee1-46a2-9811-0ea2f1ffa390",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "0",
                "completed"
              ],
              [
                "exec-db1f98b3-b1df-480b-980d-abdc5fb8104f",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -n 'copie.*broker|broker.*copie|DIU|cicd|synchron.*broker' BUILD.md\"",
                "0",
                "completed"
              ],
              [
                "exec-38b7421e-f403-4bd1-8992-740b3306ff59",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'sudo -n -l -- /usr/local/bin/diu projects cicd cab 2.2.40'",
                "0",
                "completed"
              ],
              [
                "exec-7e0480e9-ce28-47c4-878a-ae6d5462028b",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import stat for name in ['AGENTS.md','sr",
                "0",
                "completed"
              ],
              [
                "exec-4a19a760-b938-4c77-8780-df7252b74b5f",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'node --test tests/controller-service-distribution.test.mjs'",
                "0",
                "completed"
              ],
              [
                "exec-1ef6c7c7-1eab-43ca-b151-89126c1d2063",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD",
                "0",
                "completed"
              ],
              [
                "exec-86599ae1-1ef1-4010-8933-c0c2a7d75e53",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B -m unittest discover -s tests -p 'test_*.py'\"",
                "0",
                "completed"
              ],
              [
                "exec-bbb1ef36-b269-4c74-a906-faf0bedf0db0",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('/home/devops/datas/cab/openspec/",
                "0",
                "completed"
              ]
            ],
            "title": "Commandes natives observées au relevé final"
          }
        ],
        "5": [
          {
            "columns": [
              "Type",
              "Nombre",
              "URL effectivement visitée",
              "Pourcentage"
            ],
            "rows": [
              [
                "Outils web de production",
                0,
                "Aucune",
                "N/A — dénominateur nul"
              ]
            ],
            "title": "Accès web"
          }
        ],
        "6": [
          {
            "columns": [
              "Élément",
              "État",
              "Preuve"
            ],
            "rows": [
              [
                "Change",
                "Archivé",
                "archive normale OpenSpec"
              ],
              [
                "Agents",
                "Codex codeur direct ; aucun orchestrateur",
                "métadonnées de session"
              ],
              [
                "Interface",
                "CLI/JSON agnostique ; QUERY sans mutation",
                "49tests SGS inclus dans185Python"
              ],
              [
                "Publication",
                "À exécuter après contrôle rapport/global",
                "DIU2.3.0 autorisé"
              ],
              [
                "Collecte",
                "Trois tours, aperçus tronqués, pas de sorties",
                "SESSION_OBSERVATION.json"
              ]
            ],
            "title": "Clôture et provenance"
          }
        ]
      }
    },
    {
      "agent_details": [
        {
          "model": "N/A",
          "provider": "OpenAI",
          "reasoning": "N/A",
          "role": "coder",
          "service_percent": "N/A — télémétrie active absente",
          "throughput": "N/A — non mesuré",
          "ttmt": "N/A — non mesuré",
          "version": "N/A — version du client non collectée"
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
          "end": "1793917388",
          "start": "1793887250"
        },
        "breakdowns": {},
        "costs": {},
        "metrics": {
          "commands": {
            "evidence": [
              {
                "line": 1,
                "note": "SESSION_OBSERVATION.json ; identifiants natifs dédupliqués, relevé figé après qualifications2.3.1, opérations postérieures exclues"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "332"
          },
          "commands_failure": {
            "evidence": [
              {
                "line": 1,
                "note": "SESSION_OBSERVATION.json ; identifiants natifs dédupliqués, relevé figé après qualifications2.3.1, opérations postérieures exclues"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "17"
          },
          "commands_success": {
            "evidence": [
              {
                "line": 1,
                "note": "SESSION_OBSERVATION.json ; identifiants natifs dédupliqués, relevé figé après qualifications2.3.1, opérations postérieures exclues"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "315"
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
                "note": "Bornes du relevé calendaire de réalisation et clôture, pause incluse ; livraison2.3.1 postérieure exclue"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "30138"
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
            "reason": "Le cumul exhaustif des exécutions historiques n’est pas établi par les aperçus bornés ;21désignait des éléments, pas des commandes. Deux commandes strictes de clôture réussies sont documentées séparément.",
            "state": "unavailable",
            "value": null
          },
          "openspec_standard_success": {
            "evidence": [],
            "reason": "Le cumul exhaustif des exécutions historiques n’est pas établi par les aperçus bornés ;21désignait des éléments, pas des commandes. Deux commandes strictes de clôture réussies sont documentées séparément.",
            "state": "unavailable",
            "value": null
          },
          "openspec_strict_failure": {
            "evidence": [],
            "reason": "Le cumul exhaustif des exécutions historiques n’est pas établi par les aperçus bornés ;21désignait des éléments, pas des commandes. Deux commandes strictes de clôture réussies sont documentées séparément.",
            "state": "unavailable",
            "value": null
          },
          "openspec_strict_success": {
            "evidence": [],
            "reason": "Le cumul exhaustif des exécutions historiques n’est pas établi par les aperçus bornés ;21désignait des éléments, pas des commandes. Deux commandes strictes de clôture réussies sont documentées séparément.",
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
                "note": "QUALIFICATION.md ; bilan final2.3.1, campagnes précédentes et31tests ignorés exclus"
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
                "note": "QUALIFICATION.md ; bilan final2.3.1, campagnes précédentes et31tests ignorés exclus"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "13"
          },
          "tests": {
            "evidence": [
              {
                "line": 1,
                "note": "QUALIFICATION.md ; bilan final2.3.1, campagnes précédentes et31tests ignorés exclus"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "1469"
          },
          "tests_failure": {
            "evidence": [
              {
                "line": 1,
                "note": "QUALIFICATION.md ; bilan final2.3.1, campagnes précédentes et31tests ignorés exclus"
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
                "note": "QUALIFICATION.md ; bilan final2.3.1, campagnes précédentes et31tests ignorés exclus"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "1469"
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
            "evidence": [
              {
                "line": 1,
                "note": "Aucun outil web utilisé dans les tours de codage ; HTTP de fixtures et transports internes exclus"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "0"
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
        "proof_ids": [
          "exec-2d93fa92-d705-4f5e-a8d5-92c99be76a37",
          "exec-3f9c3908-16bb-4766-a8bc-456a3404e994",
          "exec-fc96165c-fff5-4fe7-82c6-93abc466daa0",
          "exec-d1b2479a-63cf-49a9-a233-1a88b5cdf84e",
          "exec-d9657820-fafd-443f-9086-11e2289a8756",
          "exec-90740ea2-6a2b-494b-a701-61ea45c1c024",
          "exec-bb782200-d69f-419c-a026-ea78342b2942",
          "exec-ff51424a-3031-4e57-959f-4acaab57b8bd",
          "exec-280d46e7-742f-4ced-911c-5a52c4fc5c13",
          "exec-3d32e005-abb2-4902-9a52-912a22fc05d3",
          "exec-9d485ac8-431e-475f-aa26-183fba821c30",
          "exec-a0ca0c24-97e2-42ef-b0cd-6e397075ccc5",
          "exec-15fdf4b2-f761-4029-895e-e446dad05880",
          "exec-4bbd2431-523a-4493-99b5-10ff42d6d070",
          "exec-b46317df-522a-4e8e-a587-a78bbcda7328",
          "exec-d91115cd-3d3c-4ac4-9da4-2f512c13b384",
          "exec-29915495-a852-4dcd-aa75-8a69d655ec3c",
          "exec-75a2e005-10a7-432b-9938-3b9c38e661d1",
          "exec-f7b20f06-d629-4d67-bad4-7c4a0daa92b3",
          "exec-4ffa3ee1-789d-4bcc-bffc-1dfb149a2bb2",
          "exec-d77bf602-1505-4997-8105-5cbb82c5ad02",
          "exec-ecd1d168-c85f-406d-8a0f-c1858f58b580",
          "exec-0cf53168-7647-4e9a-8f52-90f468eb6413",
          "exec-9364feb6-af90-4529-99a2-79ef4f7d2753",
          "exec-b1276842-2329-49ad-85d6-d1c99bfa737d",
          "exec-ff9f0aab-c0da-4d9d-a9c2-a043d06aa31b",
          "exec-1075d8e8-ccfa-4182-a6aa-21cef956a60a",
          "exec-35ad829f-6c06-4d5c-b59e-693ab167e218",
          "exec-7bf62a01-5104-43c6-802a-061aff047ab4",
          "exec-005ce7af-5f4d-4d25-a84d-874f25bf758a",
          "exec-b4911f24-5aea-4c90-9f18-ae2225db5877",
          "exec-8e1870ed-0401-4418-9fd9-6b0b7b67a835",
          "exec-5c16f012-6a1c-4ac1-84dd-b0812eec9482",
          "exec-5173069f-27ac-49ee-b9d0-962d4c72cecd",
          "exec-b3a85c9f-3c1f-4171-b7a7-0660fa31494d",
          "exec-dd32498a-d007-4b29-96e7-d7260b888cc6",
          "exec-451847d0-fca9-4a75-a1ef-172fb15ffadb",
          "exec-4a018fc9-382e-4c5d-803b-f447d06afa65",
          "exec-29f1b8bb-d841-4974-9011-92683ad03a1b",
          "exec-c118e330-29d6-4fc9-a434-8eb55a7fea3e",
          "exec-36b60972-a862-40aa-94b6-a2b8b6179f4b",
          "exec-ab0eb899-3576-4cd2-916e-ea94c9dfb543",
          "exec-ccdb4f35-b5f2-41b0-9d59-f7e5dba52d4e",
          "exec-408eb40e-c494-4ba6-b208-d06c72473601",
          "exec-3f5233a4-4fa5-4156-b7f6-a85e5633040e",
          "exec-5abc3f47-a485-4d64-981e-6e9d0ad3e7e0",
          "exec-f5f16c73-5c75-4b40-9835-90259d980980",
          "exec-9a25e209-710b-4f9d-80da-e1bc24269ea5",
          "exec-b427ab8a-b6c4-4c50-8be9-5e918db2708d",
          "exec-3b86632f-f920-4de0-97f3-892e47975ff3",
          "exec-1167c77b-be28-4b5c-a8a8-6e9c4bdf98e6",
          "exec-af4a72a9-2965-4876-b790-2591dab36613",
          "exec-cb4d3e36-b757-446d-9fc8-259b8f43ecfc",
          "exec-670187cb-8858-4bc7-9ead-ea435ff8cd14",
          "exec-5ca9019a-a052-464e-ac01-87017649a4b1",
          "exec-e3653faf-b6a6-4d3f-bad1-95458648fc00",
          "exec-972c94b7-7d5a-40a3-989b-4ecb0635156a",
          "exec-27e815e7-c768-47d3-8475-80a3abe6e890",
          "exec-267a65f4-43aa-46d9-beb0-93829f0dcde3",
          "exec-9fcd3c27-eaad-4fdd-93e2-f0c15f453732",
          "exec-40ab9781-58c7-4828-8cd2-431367478d35",
          "exec-eac4e0e5-8273-46b8-8038-2d34ae66ccce",
          "exec-f306fb31-1b5a-436e-956d-9d1c603ce093",
          "exec-e1144a89-ea26-42f8-ac4a-d0f335a035f2",
          "exec-63fa3f7a-5405-413b-b827-a3e1600a3d62",
          "exec-cd76ad7e-7923-4f6f-9ffc-9462b94dd94c",
          "exec-a68d478b-df97-43f2-ba07-4eb0e66f8ff0",
          "exec-fcac10fa-9456-4872-8b7b-161af5fe3af2",
          "exec-71ddd768-b7d9-4787-8996-d1497ab66958",
          "exec-455aeec4-de73-48b6-8b6e-1449147f969f",
          "exec-c67f9d47-398c-4ec6-a73c-469a71dc44a8",
          "exec-28931476-48fb-41ef-b20e-5ea96faa4a3b",
          "exec-e0004c32-cb5b-4448-9997-29b2f1985dd2",
          "exec-67810e5e-1284-4c6f-b4c7-c06ff1764bb4",
          "exec-84e78de2-0ef0-4970-ac65-57318a8f84ee",
          "exec-7a0f2f9c-64b1-4c22-bace-f1a910478927",
          "exec-840e1231-ff2a-44f8-8716-2cd4c482f8fb",
          "exec-c9cb9b06-e4c9-4630-89a9-2023b91a298e",
          "exec-1720b81c-8bbc-4c5e-a31f-df2ff40f17ad",
          "exec-ab5a70c9-649c-41d5-ba53-1cb197313722",
          "exec-c1547b16-255b-4cf7-bf5e-5f723d81b947",
          "exec-394f660d-4219-4e87-aac4-a61a5b2d9e91",
          "exec-e43a35da-d21f-4934-bbe6-b1a3eca344d8",
          "exec-49d005aa-93b9-496b-b9af-34ccfa68cf41",
          "exec-67df5100-54df-4aaa-9c36-13b4ce5bb474",
          "exec-d03dee9a-3f79-4ba1-8ef0-68facd714144",
          "exec-27f681f9-df88-48fa-9ff1-d8de66f8b583",
          "exec-38076540-b5d9-42ca-a327-262e47264ed7",
          "exec-3fa4cc97-d662-47ce-84aa-54c793d7e467",
          "exec-0e7a47f0-3157-4c51-be22-d4b2d2d3c629",
          "exec-bac7559c-0b0e-4bf5-88ff-5711ab13b87c",
          "exec-f48e6281-337a-49f2-9d59-0936cd52a82a",
          "exec-db368ede-0a73-42fe-b1d3-38ea2a5ae1df",
          "exec-e61ab735-81f2-419c-8ce9-212b75e74ea5",
          "exec-19485cc5-1576-41f3-9e51-4dc80355ec65",
          "exec-2fe1dca3-b404-4972-8411-3287f0a32b4a",
          "exec-ff79d6a8-1a57-4580-b4c8-2a79b844f525",
          "exec-f74dec45-00c4-4a35-a8d0-cae06267b781",
          "exec-37642c17-44fc-4061-9e2d-83e40ef03bba",
          "exec-64d7a9b2-ec18-4efa-8124-f6ea1b66594f",
          "exec-d3618598-8ae8-4aa6-852e-ae67fed9e60a",
          "exec-3704bd5a-c4ce-493e-bb44-f316cc99832e",
          "exec-f6c2f99b-4ce0-4ab7-aca5-d49a10036c8b",
          "exec-3910e0e1-5885-46dd-828c-ac68d59406e7",
          "exec-04e4f30b-4730-459d-a5e4-62cf3b1ad556",
          "exec-aacc3ce7-fbeb-4b62-a893-33fdfdfe313b",
          "exec-e8935fdc-c541-4e33-ad77-a7525f093b34",
          "exec-219d5b51-d9df-48d7-82e5-c6b6022774b2",
          "exec-26885462-2a16-4bd3-9f6f-7d8a98513895",
          "exec-c738d86b-555c-4626-9639-01c2c28f69ee",
          "exec-1d58a524-486e-4450-9a54-b447f67e2ceb",
          "exec-3f13f078-f01d-4857-9ca7-7a7ed1f3ac16",
          "exec-83713605-14cb-4da9-bcc7-ace764bf86cc",
          "exec-c3684e1e-f8a5-444c-8122-9d9db8c9a3bd",
          "exec-676df164-71f6-419c-9855-51571ea390c4",
          "exec-1ba7063e-8ade-4252-8eb7-f33699612a69",
          "exec-028bf6d4-5340-4360-8a42-420420f75bed",
          "exec-129ef2b0-97be-42e1-8029-cd0f0fef7e90",
          "exec-994e5735-0f2d-4d2a-9595-a832ce1c75d3",
          "exec-1974519e-1de6-455d-a999-02efbc4f55bf",
          "exec-cb402fd6-da3b-426f-b92f-d9b011dbb630",
          "exec-179bb291-7a95-48e9-b3f1-ecbd34d33702",
          "exec-4ebda2f8-1d5c-4030-bc4c-d2fcb12e03cd",
          "exec-67283e5a-9257-44c7-8d52-b91f88436596",
          "exec-cf01ccc2-fed7-4ce9-9f30-f2f03dfba406",
          "exec-0d33cf86-e9d2-41f1-b5b9-6caa143bd300",
          "exec-57352ecf-b65b-48ca-ad13-c2905d968267",
          "exec-6e2f2d31-6774-47d3-8707-b04a052e9217",
          "exec-b30f631e-5ee1-46a2-9811-0ea2f1ffa390",
          "exec-db1f98b3-b1df-480b-980d-abdc5fb8104f",
          "exec-38b7421e-f403-4bd1-8992-740b3306ff59",
          "exec-7e0480e9-ce28-47c4-878a-ae6d5462028b",
          "exec-4a19a760-b938-4c77-8780-df7252b74b5f",
          "exec-1ef6c7c7-1eab-43ca-b151-89126c1d2063",
          "exec-86599ae1-1ef1-4010-8933-c0c2a7d75e53",
          "exec-bbb1ef36-b269-4c74-a906-faf0bedf0db0"
        ],
        "sessions": [
          "01a1ad34-8efb-7863-b766-c93888337933",
          "01a1ac03-26ac-75f1-bc87-498c123f40ea"
        ],
        "web_calls": []
      },
      "id": "sgs-cab-2.3.1-scm-closure-03",
      "input_sha256": "4fcfa42a329123d877b46805dc99b7a91dbfa0f05ef1603d96cba9148f334980",
      "notes": {
        "1": [
          "Change archivé et clôturé au plan produit. Publication GitHub2.3.0 vérifiée ; finalisation2.3.1 qualifiée. Aucun nouvel archivage ni changement fonctionnel. Les anciennes attentes sont historiques."
        ],
        "2": [
          "Même session directe Codex, sans orchestrateur ni télémétrie de pilotage. Modèle exact, tokens, coûts et temps actif non exposés restent N/A."
        ],
        "3": [
          "Liste exhaustive des fichiers actuellement amendés pour cette clôture, distincte de la liste historique complète du change ; aucune mesure de fichiers ou d’écritures déduite du diff Git."
        ],
        "4": [
          "Les commandes sont comptées par identifiant natif, avec leurs échecs historiques. Le relevé est figé avant cette génération et la livraison2.3.1."
        ],
        "5": [
          "Aucun appel web supplémentaire inventé à partir des liens de publication."
        ],
        "6": [
          "La maintenance globale est tentée séparément après ce rapport. Un contrat divergent laisse le couple préservé et n’empêche pas la clôture SCM. Forgejo indisponible et activation restent distincts de la qualification et de la publication GitHub."
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
                "Python global",
                "185réussis,0échec",
                "output/sgs-finalization-2.3.1/python-results.txt"
              ],
              [
                "Node global",
                "1284réussis,31ignorés,0échec",
                "output/sgs-finalization-2.3.1/node-results.json"
              ],
              [
                "Chromium / Firefox",
                "Recettes réussies",
                "output/sgs-finalization-2.3.1/web-monitor-browser-results.json"
              ],
              [
                "Syntaxe Python",
                "24fichiers réussis",
                "output/sgs-finalization-2.3.1/syntax-results.json"
              ],
              [
                "OpenSpec",
                "2commandes strictes réussies ;21éléments chacune",
                "QUALIFICATION.md"
              ],
              [
                "Skill SGS",
                "quick_validate réussi",
                "commande observée"
              ],
              [
                "Archivage",
                "Archive existante conservée ;13tâches validées",
                "tasks.md et canon"
              ]
            ],
            "title": "Qualification finale CAB2.3.1"
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
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/.codex/commands/CABU.md",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/.codex/commands/SGS.md",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/BUILD.md",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/CHANGELOG.md",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/DEVELOPMENT_MAP.md",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/PROJECT.md",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/README.md",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/TECHNICAL.md",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/openspec/BATCH_CODES.md",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/openspec/changes/archive/2026-11-05-add-reusable-project-statistics/QUALIFICATION.md",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/openspec/changes/archive/2026-11-05-add-reusable-project-statistics/SESSION_OBSERVATION.json",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/.codex-plugin/plugin.json",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_journal.py",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_router.py",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/broker/cgpt_approval_bridge_server.py",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cab_sgs.py",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-approval-metadata.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-artifact-proof.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-cleanup.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-context-portability.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-continuity.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-efficiency.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-erasure-manager.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-forward-repair.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-import-observations.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-maintenance-proof.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-manifest-extensions.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-policy.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-model-transition.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-data.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-events.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-management.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-native-instances.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observation-statistics.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-policy.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-replies.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-port-recovery.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prepare-model-policy.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-process-lifecycle.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-provider-connect.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-recovery-evidence.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-recovery.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-resource-coordination.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-run-steps.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runtime-migration.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-lifecycle.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-shell-stage.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-source-read.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-state-layout.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics-maintenance.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update-credential.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/distribution-validation.json",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-monitor.service",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/plugins/cabu/.codex-plugin/plugin.json",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/pyproject.toml",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/src/cgpt_approval_bridge_journal.py",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/src/cgpt_approval_bridge_router.py",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/src/cgpt_approval_bridge_server.py",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/active-component-update.test.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/approval-metadata.test.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/autonomous-recovery.test.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/concurrent-controller.test.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/controller-service-distribution.test.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/maintenance-bootstrap.test.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/monitor-service-start.test.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/native-instances.test.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/native-opencode.test.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/opencode-v2-client.test.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/protocol-continuity.test.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/provider-connect.test.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/shell-lifecycle.test.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/test_crash_recovery.py",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/test_session_reset.py",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/web-monitor-browser.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ],
              [
                "/home/devops/datas/cab/tests/web-monitor.test.mjs",
                "Version de distribution ou preuve documentaire de clôture"
              ]
            ],
            "title": "Fichiers amendés pour la clôture2.3.1"
          }
        ],
        "4": [
          {
            "columns": [
              "Identifiant",
              "Tour",
              "Aperçu borné",
              "Code",
              "État"
            ],
            "rows": [
              [
                "exec-bdf1241c-498e-48e7-a297-4cc29e26532e",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '100,120p' tests/test_change_erasure.py; sed -n '184,199p' plugins/cab-appr",
                "0",
                "completed"
              ],
              [
                "exec-8edc7650-35e7-4c1d-81e6-e0319e220eb7",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '184,210p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencod",
                "0",
                "completed"
              ],
              [
                "exec-9a7dcb6a-bbeb-4343-9938-706b3f7c9fd5",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '1,68p' tests/monitor-service-start.test.mjs; head -18 tests/web-monitor.te",
                "0",
                "completed"
              ],
              [
                "exec-f42f2977-e752-4078-bca3-8e63208f66cb",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'components|component|briques|version|health|/api/identity' plugins/cab-appr",
                "0",
                "completed"
              ],
              [
                "exec-7c201d29-4fb2-438e-89c7-09f7e8d56514",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_change_erasure.py -v'",
                "0",
                "completed"
              ],
              [
                "exec-d5d279b9-848d-4556-95e0-698ea92d4014",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re",
                "0",
                "completed"
              ],
              [
                "exec-43e52a4c-9c88-4620-b2c7-00f13d20b6da",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '1,80p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-monitor-da",
                "0",
                "completed"
              ],
              [
                "exec-b9b58343-7162-46d6-950d-d278ec69110c",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'node --test tests/change-erasure.test.mjs tests/change-erasure-integration.test.mj",
                "0",
                "completed"
              ],
              [
                "exec-cd02771f-e047-4c45-a231-a37d931c6d8a",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re",
                "0",
                "completed"
              ],
              [
                "exec-9cf691c7-1150-4113-b503-7c358fff9704",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'statistics|health.*grid|grid.*health|\\\\.health' plugins/cab-approval-bridge",
                "0",
                "completed"
              ],
              [
                "exec-a31df694-134a-422a-8efb-b529b21b747d",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st",
                "0",
                "completed"
              ],
              [
                "exec-8427044f-b953-4738-aa49-0d9f8cde392e",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n '\"'^function isStale|const isStale|monitor-data|process-lifecycle.mjs|script",
                "0",
                "completed"
              ],
              [
                "exec-bf48623c-b191-4481-b8d2-611ba4a370e8",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/web-",
                "0",
                "completed"
              ],
              [
                "exec-afb75ea9-3e36-4d9b-9a04-f7e9184a9fd9",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'node --test tests/sgs-component.test.mjs'",
                "0",
                "completed"
              ],
              [
                "exec-e483ae6c-87c7-4bfc-931e-45f570285a58",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import json,hashlib root=Path('.') paths",
                "0",
                "completed"
              ],
              [
                "exec-ee2679f1-77c2-49e4-9797-0bbeed39af06",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'componentVersions|sources\\\\)|sources\\\\]|components.*5|copied.length|a-z0-9'",
                "0",
                "completed"
              ],
              [
                "exec-faa3fae0-9758-4282-8daa-a45bb15665b2",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '176,201p' tests/web-monitor.test.mjs; python3 - <<'PY' from pathlib import",
                "0",
                "completed"
              ],
              [
                "exec-b34262fa-4486-4963-8784-e0ab8d2383ef",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '200,253p' tests/web-monitor-browser.mjs; sed -n '425,442p' tests/web-monit",
                "0",
                "completed"
              ],
              [
                "exec-b9be95f3-d36e-4584-8bd7-a18bb52ed67d",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'nativeAction|source.type.*shell|nativeAction.*shell' plugins/cab-approval-b",
                "0",
                "completed"
              ],
              [
                "exec-ec7e64e3-59a2-4298-ad6d-9b582f3afca5",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'corrèle les commandes avec strictCommands=true|re",
                "0",
                "completed"
              ],
              [
                "exec-226330fb-c89b-43f8-a46d-6d29bad35aac",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess files=['tests/controller-configuration.test.",
                "0",
                "completed"
              ],
              [
                "exec-01697df6-6e82-4a84-b294-10ee73ee5693",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path for kind in ['server','router','journal'",
                "0",
                "completed"
              ],
              [
                "exec-b6197583-352e-47e1-a7d1-5708d40be8ce",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('tests/web-monitor-browser.mjs');",
                "0",
                "completed"
              ],
              [
                "exec-d87af084-4eba-4461-9b90-63bfaeadff09",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess files=['tests/controller-configuration.test.",
                "0",
                "completed"
              ],
              [
                "exec-f8e223c5-6f19-416d-af57-0ff1635fbc20",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess,os from pathlib import Path out=Path('/home/",
                "0",
                "completed"
              ],
              [
                "exec-5681d202-1302-4984-b212-b8f65006e6bd",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '908,947p' tests/controller-session-recovery.test.mjs; python3 - <<'PY' fro",
                "0",
                "completed"
              ],
              [
                "exec-93fcbba2-8768-4f22-8bb3-aeb106270ce8",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'reconcile refuse autorisation absente' tests/cont",
                "1",
                "failed"
              ],
              [
                "exec-d66d96a5-d534-4199-b690-e4da6f930cba",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'preflight-native-ask-required|preflight-native-allow-not-proved' plugins/ca",
                "0",
                "completed"
              ],
              [
                "exec-1bdb13be-3d61-44b5-927a-c1f337c20ca7",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '1230,1285p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-c",
                "0",
                "completed"
              ],
              [
                "exec-f2a678b7-c2e1-4669-b056-ce1f2f099999",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'reconcile refuse autorisation absente' tests/cont",
                "0",
                "completed"
              ],
              [
                "exec-85185e6d-4928-4972-8f94-4cb463527f0d",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,json,re from urllib",
                "0",
                "completed"
              ],
              [
                "exec-82526340-7f41-4bcd-810f-4a9ef88afca0",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"git log -1 --format='%H %s'\"",
                "0",
                "completed"
              ],
              [
                "exec-e45c3105-2d1c-470a-b549-079fd689f877",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'projects.*cicd|project.*cicd|git.*push|force-with-lease' /home/devops/datas",
                "2",
                "failed"
              ],
              [
                "exec-71f72d39-39fc-448e-8476-090b90ae3fe5",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '1390,1425p' /home/devops/datas/diu/root-install-debian.sh; rg --files /hom",
                "0",
                "completed"
              ],
              [
                "exec-e7cd304e-0b21-4271-9e9a-0135886d0063",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '1414,1485p' /home/devops/datas/diu/root-install-debian.sh; rg -n '\"'^.*cic",
                "0",
                "completed"
              ],
              [
                "exec-47ec058d-d26c-4b7b-890d-1783cabf0401",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '485,516p' /home/devops/datas/diu/modules/projects/git.sh; sed -n '557,614p",
                "0",
                "completed"
              ],
              [
                "exec-f8536084-7701-4ec2-b383-2fbb6c18e770",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '820,867p' /home/devops/datas/diu/modules/projects/git.sh; sed -n '3514,354",
                "0",
                "completed"
              ],
              [
                "exec-cec64588-ea2f-42c3-a60b-01a8d09ee294",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'PROJECTS_CICD_RECONCILE' /home/devops/datas/diu/modules/projects/git.sh\"",
                "0",
                "completed"
              ],
              [
                "exec-9ac5eb22-1bcc-463b-ba59-48e921adac7f",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'GIT_TERMINAL_PROMPT=0 git fetch --no-tags github main'",
                "0",
                "completed"
              ],
              [
                "exec-0f4d0735-efa1-4896-bb3d-30eb98b23981",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,re,collections ref=",
                "0",
                "completed"
              ],
              [
                "exec-c349139a-0b1b-4a6b-be7c-d63fd0f612c1",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,json root=Path.cwd(",
                "1",
                "failed"
              ],
              [
                "exec-3f4de1d1-2adc-42eb-9243-32a4088dcd61",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,json from collectio",
                "0",
                "completed"
              ],
              [
                "exec-ddb9171a-3aaa-4161-b312-81d4a7d7335f",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,json,re out=Path('o",
                "0",
                "completed"
              ],
              [
                "exec-66490209-3699-4cad-a85c-f1fa88c8b479",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import json,re from pathlib import Path records=json.loads(Pat",
                "0",
                "completed"
              ],
              [
                "exec-98299dd9-0ffa-44d8-b81d-6704c866ec02",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import json,re,ast,hashlib root=Path.",
                "0",
                "completed"
              ],
              [
                "exec-555a7192-bd43-4509-9da7-b3ca9d467b16",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '254,274p' tests/web-monitor.test.mjs; sed -n '74,92p' tests/monitor-servic",
                "0",
                "completed"
              ],
              [
                "exec-1f777898-4fb0-4076-8986-f6c400f8ee90",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess from pathlib import Path paths=subprocess.ru",
                "0",
                "completed"
              ],
              [
                "exec-532d156b-e03e-4b4f-8dad-dbfb70bd7673",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import json,hashlib,sys sys.path.inse",
                "0",
                "completed"
              ],
              [
                "exec-e8df9cf2-ff83-4861-9d4f-06defd26d9f4",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-pr",
                "0",
                "completed"
              ],
              [
                "exec-5e57bfb6-b45e-40fc-b7e6-93cd7b5814fe",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'git diff --check'",
                "0",
                "completed"
              ],
              [
                "exec-b596ce7f-31a4-40b7-bd04-8c33330ccd2c",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive'",
                "0",
                "completed"
              ],
              [
                "exec-16e104b9-9758-45c4-a960-dd7aec2e593d",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B -m unittest discover -s tests -p 'test_*.py'\"",
                "0",
                "completed"
              ],
              [
                "exec-f10c4d40-cb98-41ac-ae79-4553db3f2748",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD",
                "0",
                "completed"
              ],
              [
                "exec-a8806504-7002-4d89-811a-e6ba285c9545",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec archive --help'",
                "0",
                "completed"
              ],
              [
                "exec-dfa66e7c-06c3-4b3a-aeea-04294f6f131b",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,sys,tempfile,os fil",
                "0",
                "completed"
              ],
              [
                "exec-bbd21159-2462-4881-8a27-99cc48425b2a",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess from pathlib import Path files=sorted(str(p)",
                "0",
                "completed"
              ],
              [
                "exec-e5433bc0-1731-4e74-a3bd-369aae3341b5",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess,os from pathlib import Path out=Path('/home/",
                "0",
                "completed"
              ],
              [
                "exec-940e18e9-80da-4423-b7b5-f19244841e8e",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'pwd; git status --short | tail -8'",
                "0",
                "completed"
              ],
              [
                "exec-97950038-0170-480d-9e1b-dfbfdf150a00",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n '\"'^(#|Version)|agnost|INSPECT|VERSION|QUERY|agent|orchestr'\"' plugins/cab-a",
                "0",
                "completed"
              ],
              [
                "exec-1553a230-b389-4b95-8327-060f502ede40",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'cat AGENTS.md PROJECT.md TECHNICAL.md BUILD.md DEVOPS.md'",
                "0",
                "completed"
              ],
              [
                "exec-92017f7a-25dd-4420-86fe-aada6c5ab62d",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"cat plugins/cab-approval-bridge/skills/sgs/SKILL.md plugins/cab-approval-bridge/sk",
                "0",
                "completed"
              ],
              [
                "exec-f480c89c-dfc6-4405-a31f-8adcd047a07c",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'ls output/sgs-2.3.0-browser; cat openspec/changes/add-reusable-project-statistics/",
                "0",
                "completed"
              ],
              [
                "exec-6ee2aebf-e945-49ff-ae58-56feef91e19e",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '670,735p' plugins/cab-approval-bridge/scripts/cab_sgs.py; sed -n '1790,193",
                "0",
                "completed"
              ],
              [
                "exec-ee549a00-4faf-4ee0-8f7d-0939c0060245",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"cat output/sgs-2.3.0-browser/web-monitor-browser-results.json; rg --files output |",
                "0",
                "completed"
              ],
              [
                "exec-a9c63a89-ac71-4a38-87b9-8d2c700c8454",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '1,95p' plugins/cab-approval-bridge/skills/sgs/SKILL.md; rg -n 'def verify|",
                "0",
                "completed"
              ],
              [
                "exec-364ec7b0-bb43-4baa-82ce-6c9b9832680b",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '1370,1430p' plugins/cab-approval-bridge/scripts/cab_sgs.py; cat .codex/com",
                "0",
                "completed"
              ],
              [
                "exec-ccb7872d-7395-45de-8e57-c21323d035c2",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '175,205p' plugins/cab-approval-bridge/scripts/cab_sgs.py; sed -n '1155,118",
                "0",
                "completed"
              ],
              [
                "exec-7af01ad7-6cc6-462f-bc3b-fa208f73bc79",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"head -30 /home/adema261/.codex/skills/.system/skill-creator/SKILL.md; rg -n 'sgs|s",
                "0",
                "completed"
              ],
              [
                "exec-854d014e-bcca-4d1a-91b4-a525eb21bbb5",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"tail -18 tests/test_sgs.py; rg -n '\"'^##|moteur|INSPECT'\"' /home/devops/datas/prom",
                "0",
                "completed"
              ],
              [
                "exec-a5379348-7158-4350-a275-e26fb300de7e",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '83,111p' /home/devops/datas/prompts/SGS.md; head -26 README.md; cat pyproj",
                "0",
                "completed"
              ],
              [
                "exec-793eb797-084a-4fa1-b89e-2618ab87bce5",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n '\"'^def entry|''^def inventory'\"' plugins/cab-approval-bridge/scripts/cab_sg",
                "0",
                "completed"
              ],
              [
                "exec-2a75c393-6ddb-4d40-9e42-31f5b5865b35",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/s",
                "0",
                "completed"
              ],
              [
                "exec-a3785c51-188c-4daf-bc0a-2f4146c2faee",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('tests/test_sgs.py');s=p.read_",
                "0",
                "completed"
              ],
              [
                "exec-29e216df-b4bd-4615-9554-29d65cb996b3",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'node --test tests/sgs-component.test.mjs tests/protocol-distribution.test.mjs'",
                "0",
                "completed"
              ],
              [
                "exec-736f4c1c-7b4a-4bd4-9366-6efc661afa06",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive'",
                "1",
                "failed"
              ],
              [
                "exec-d09c82a5-61b4-474e-b5dd-897c837d3478",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable",
                "0",
                "completed"
              ],
              [
                "exec-0ae16563-2554-46c9-9f93-dfb0bd5ef28e",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B -m unittest discover -s tests -p 'test_*.py' -q\"",
                "0",
                "completed"
              ],
              [
                "exec-20e5a531-5139-4753-99ad-e637279b442d",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valida",
                "0",
                "completed"
              ],
              [
                "exec-57fcc6e5-ddb2-4fa8-a4a3-14596a6bc637",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'git diff --check'",
                "0",
                "completed"
              ],
              [
                "exec-61981c49-c7b1-406c-a6d5-2993251d2aaa",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive'",
                "0",
                "completed"
              ],
              [
                "exec-8e2de567-7615-4bee-bc2e-3f463ac1d592",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'SGS|1.18' /home/devops/datas/prompts/{INDEX.md,README.md} 2>/dev/null; cat ",
                "2",
                "failed"
              ],
              [
                "exec-ee9825a0-d6a7-4814-9227-d17d845ba863",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD",
                "0",
                "completed"
              ],
              [
                "exec-deafcb20-ebd4-4c4a-9aa8-e7c6e32cb892",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '440,468p' /home/devops/datas/prompts/INDEX.md; head -25 DEVELOPMENT_MAP.md",
                "0",
                "completed"
              ],
              [
                "exec-1366f16e-e91d-4fbd-b575-1f998ac23f02",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import tempfile,subprocess,os files=[",
                "0",
                "completed"
              ],
              [
                "exec-e94c0213-107b-4bab-8941-32b4405ac045",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('/home/devops/datas/prompts/IN",
                "0",
                "completed"
              ],
              [
                "exec-032df10f-24af-4bd9-9cb7-32656bb4f71d",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY ",
                "0",
                "completed"
              ],
              [
                "exec-ab069060-2a67-4be3-af14-dd41b8085679",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py QUERY -",
                "0",
                "completed"
              ],
              [
                "exec-0816a7dc-39ad-4b66-9758-c728309ccb00",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n 'cicd|archiv|BLOCKER|statist|livraison|commit|DIU' /home/devops/datas/prompt",
                "0",
                "completed"
              ],
              [
                "exec-51aaf73a-9cbf-4e66-a2fb-51823882546d",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec archive add-reusable-project-statistics --yes",
                "0",
                "completed"
              ],
              [
                "exec-ab4c47f1-0532-4b2f-8788-bc6b90a8b63b",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"head -15 openspec/specs/global-project-statistics/spec.md; sed -n '917,938p' /home",
                "0",
                "completed"
              ],
              [
                "exec-d5e8a946-53e6-40e6-b9f4-ec39769e59e9",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '40,90p' plugins/cab-approval-bridge/scripts/cab_sgs.py; python3 -B - <<'PY",
                "0",
                "completed"
              ],
              [
                "exec-2d93fa92-d705-4f5e-a8d5-92c99be76a37",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'cat openspec/changes/add-reusable-project-statistics/CHECKPOINT.md'",
                "0",
                "completed"
              ],
              [
                "exec-3f9c3908-16bb-4766-a8bc-456a3404e994",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import json for name in ['AGENTS.md','py",
                "0",
                "completed"
              ],
              [
                "exec-fc96165c-fff5-4fe7-82c6-93abc466daa0",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'git status --short'",
                "0",
                "completed"
              ],
              [
                "exec-d1b2479a-63cf-49a9-a233-1a88b5cdf84e",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import re,json roots=['src','plugins/cab",
                "0",
                "completed"
              ],
              [
                "exec-d9657820-fafd-443f-9086-11e2289a8756",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/skil",
                "0",
                "completed"
              ],
              [
                "exec-90740ea2-6a2b-494b-a701-61ea45c1c024",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st",
                "0",
                "completed"
              ],
              [
                "exec-bb782200-d69f-419c-a026-ea78342b2942",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B -m unittest discover -s tests -p 'test_*.py'\"",
                "1",
                "failed"
              ],
              [
                "exec-ff51424a-3031-4e57-959f-4acaab57b8bd",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,sys,tempfile,os pat",
                "0",
                "completed"
              ],
              [
                "exec-280d46e7-742f-4ced-911c-5a52c4fc5c13",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"sed -n '1,140p' tests/test_change_erasure.py; sed -n '8430,8530p' src/cgpt_approva",
                "0",
                "completed"
              ],
              [
                "exec-3d32e005-abb2-4902-9a52-912a22fc05d3",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import json,hashlib registry=json.loa",
                "0",
                "completed"
              ],
              [
                "exec-9d485ac8-431e-475f-aa26-183fba821c30",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path for name in ['.gitignore','openspec/chan",
                "0",
                "completed"
              ],
              [
                "exec-a0ca0c24-97e2-42ef-b0cd-6e397075ccc5",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('.gitignore');s=p.read_text() if ",
                "0",
                "completed"
              ],
              [
                "exec-15fdf4b2-f761-4029-895e-e446dad05880",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valida",
                "0",
                "completed"
              ],
              [
                "exec-4bbd2431-523a-4493-99b5-10ff42d6d070",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'git diff --check -- SGS.md ACSP.md CGP.md CISM.md CISMP.md ISM.md ISMP.md RCAM.md ",
                "0",
                "completed"
              ],
              [
                "exec-b46317df-522a-4e8e-a587-a78bbcda7328",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'git diff --check'",
                "2",
                "failed"
              ],
              [
                "exec-d91115cd-3d3c-4ac4-9da4-2f512c13b384",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive'",
                "0",
                "completed"
              ],
              [
                "exec-29915495-a852-4dcd-aa75-8a69d655ec3c",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "0",
                "completed"
              ],
              [
                "exec-75a2e005-10a7-432b-9938-3b9c38e661d1",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess from pathlib import Path files=sorted(str(p)",
                "0",
                "completed"
              ],
              [
                "exec-f7b20f06-d629-4d67-bad4-7c4a0daa92b3",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD",
                "0",
                "completed"
              ],
              [
                "exec-4ffa3ee1-789d-4bcc-bffc-1dfb149a2bb2",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'unsafe|0o775|mode' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge",
                "0",
                "completed"
              ],
              [
                "exec-d77bf602-1505-4997-8105-5cbb82c5ad02",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"sed -n '34,82p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-broker-ar",
                "0",
                "completed"
              ],
              [
                "exec-ecd1d168-c85f-406d-8a0f-c1858f58b580",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import os,stat print('Acteur',os.getuid(",
                "0",
                "completed"
              ],
              [
                "exec-0cf53168-7647-4e9a-8f52-90f468eb6413",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"node --input-type=module - <<'JS' import {mkdtemp,cp,chmod,lstat,readdir,rm} from ",
                "0",
                "completed"
              ],
              [
                "exec-9364feb6-af90-4529-99a2-79ef4f7d2753",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'corr.le les commandes|strictCommands=true' tests --glob '*.test.mjs'; sed -",
                "0",
                "completed"
              ],
              [
                "exec-b1276842-2329-49ad-85d6-d1c99bfa737d",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re",
                "0",
                "completed"
              ],
              [
                "exec-ff9f0aab-c0da-4d9d-a9c2-a043d06aa31b",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re",
                "0",
                "completed"
              ],
              [
                "exec-1075d8e8-ccfa-4182-a6aa-21cef956a60a",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'trois artefacts cibles|propriétaires explicitemen",
                "0",
                "completed"
              ],
              [
                "exec-35ad829f-6c06-4d5c-b59e-693ab167e218",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"sed -n '720,748p' tests/controller-configuration.test.mjs; rg -n 'externalRoots|br",
                "1",
                "failed"
              ],
              [
                "exec-7bf62a01-5104-43c6-802a-061aff047ab4",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,tempfile probes=[] ",
                "0",
                "completed"
              ],
              [
                "exec-005ce7af-5f4d-4d25-a84d-874f25bf758a",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'permission|experimental|saved' tests/controller-session-recovery.test.mjs |",
                "1",
                "failed"
              ],
              [
                "exec-b4911f24-5aea-4c90-9f18-ae2225db5877",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'native-permission-control-unavailable|savedPermissions|saved.*permission|pe",
                "0",
                "completed"
              ],
              [
                "exec-8e1870ed-0401-4418-9fd9-6b0b7b67a835",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'openCodeV2TestHandler' tests/controller-session-recovery.test.mjs tests/con",
                "0",
                "completed"
              ],
              [
                "exec-5c16f012-6a1c-4ac1-84dd-b0812eec9482",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"sed -n '118,230p' tests/helpers/opencode-v2-test-server.mjs; sed -n '174,201p' plu",
                "0",
                "completed"
              ],
              [
                "exec-5173069f-27ac-49ee-b9d0-962d4c72cecd",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"sed -n '1,58p' tests/helpers/opencode-v2-test-server.mjs; sed -n '750,788p' plugin",
                "0",
                "completed"
              ],
              [
                "exec-b3a85c9f-3c1f-4171-b7a7-0660fa31494d",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'async function session\\\\(|projectID:' plugins/cab-approval-bridge/scripts/c",
                "0",
                "completed"
              ],
              [
                "exec-dd32498a-d007-4b29-96e7-d7260b888cc6",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"sed -n '832,866p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencod",
                "0",
                "completed"
              ],
              [
                "exec-451847d0-fca9-4a75-a1ef-172fb15ffadb",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"sed -n '160,188p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencod",
                "0",
                "completed"
              ],
              [
                "exec-4a018fc9-382e-4c5d-803b-f447d06afa65",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'nativePermissionPolicy|checkNativeAsk\\\\(' plugins/cab-approval-bridge/scrip",
                "0",
                "completed"
              ],
              [
                "exec-29f1b8bb-d841-4974-9011-92683ad03a1b",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'kind: \\\"command\\\"|kind: .command.|kind: \\\"bash\\\"|nativeKind.*=' plugins/cab",
                "0",
                "completed"
              ],
              [
                "exec-c118e330-29d6-4fc9-a434-8eb55a7fea3e",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"sed -n '36,72p' tests/controller-session-recovery.test.mjs; sed -n '112,155p' test",
                "1",
                "failed"
              ],
              [
                "exec-36b60972-a862-40aa-94b6-a2b8b6179f4b",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import tempfile,subprocess source=Pat",
                "0",
                "completed"
              ],
              [
                "exec-ab0eb899-3576-4cd2-916e-ea94c9dfb543",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"rg -n 'function hasNativeAsk|function nativeAskState|nativeAskState' plugins/cab-a",
                "0",
                "completed"
              ],
              [
                "exec-ccdb4f35-b5f2-41b0-9d59-f7e5dba52d4e",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY ",
                "0",
                "completed"
              ],
              [
                "exec-408eb40e-c494-4ba6-b208-d06c72473601",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "0",
                "completed"
              ],
              [
                "exec-2d8f5722-c039-4b54-a0b8-1b9973c797b9",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import sys,json,hashlib from datetime",
                "0",
                "completed"
              ],
              [
                "exec-ec705251-ab16-4d37-81e1-069dbf13be7d",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py CHANGE ",
                "0",
                "completed"
              ],
              [
                "exec-a509f6d2-1f26-4751-84ae-76d74c956922",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-pr",
                "0",
                "completed"
              ],
              [
                "exec-a79bedf7-4056-4a35-87ec-1ab28519a2b0",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'sudo -n -l -- /usr/local/bin/diu projects cicd cab 2.3.0'",
                "0",
                "completed"
              ],
              [
                "exec-01bf817d-cad7-4e8e-8595-3c5fc0490ed0",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import re,sys,stat sys.path.insert(0,",
                "0",
                "completed"
              ],
              [
                "exec-a6afdd1f-cfca-4178-9adc-a2f0e422e951",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY ",
                "0",
                "completed"
              ],
              [
                "exec-456e808c-fa9a-4273-bb39-ae3346911495",
                "01a1ad34-8efb-7863-b766-c93888337933",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-pr",
                "0",
                "completed"
              ],
              [
                "exec-3f5233a4-4fa5-4156-b7f6-a85e5633040e",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"cat /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/prompt/SK",
                "0",
                "completed"
              ],
              [
                "exec-5abc3f47-a485-4d64-981e-6e9d0ad3e7e0",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/pr",
                "0",
                "completed"
              ],
              [
                "exec-f5f16c73-5c75-4b40-9835-90259d980980",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '300,525p' /home/devops/datas/prompts/SCM.md; sed -n '526,750p' /home/devop",
                "0",
                "completed"
              ],
              [
                "exec-9a25e209-710b-4f9d-80da-e1bc24269ea5",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path paths=['.agents/plugins/marketplace.json",
                "0",
                "completed"
              ],
              [
                "exec-b427ab8a-b6c4-4c50-8be9-5e918db2708d",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '680,1050p' /home/devops/datas/prompts/SGS.md\"",
                "0",
                "completed"
              ],
              [
                "exec-3b86632f-f920-4de0-97f3-892e47975ff3",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1,240p' /home/devops/datas/prompts/ACL.md\"",
                "0",
                "completed"
              ],
              [
                "exec-1167c77b-be28-4b5c-a8a8-6e9c4bdf98e6",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path for name in ['openspec/specs/archive-ses",
                "0",
                "completed"
              ],
              [
                "exec-af4a72a9-2965-4876-b790-2591dab36613",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path from collections import Counter labels=C",
                "0",
                "completed"
              ],
              [
                "exec-cb4d3e36-b757-446d-9fc8-259b8f43ecfc",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -n 'export|argv|statistics/view|bundle|changeId|change_id|tokens|inputTokens|me",
                "0",
                "completed"
              ],
              [
                "exec-670187cb-8858-4bc7-9ead-ea435ff8cd14",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '20,85p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-observati",
                "0",
                "completed"
              ],
              [
                "exec-5ca9019a-a052-464e-ac01-87017649a4b1",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path for name,start,end in [('/home/devops/da",
                "0",
                "completed"
              ],
              [
                "exec-e3653faf-b6a6-4d3f-bad1-95458648fc00",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st",
                "1",
                "failed"
              ],
              [
                "exec-972c94b7-7d5a-40a3-989b-4ecb0635156a",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('openspec/changes/add-reusable-pr",
                "0",
                "completed"
              ],
              [
                "exec-27e815e7-c768-47d3-8475-80a3abe6e890",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st",
                "0",
                "completed"
              ],
              [
                "exec-267a65f4-43aa-46d9-beb0-93829f0dcde3",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py INSPECT",
                "0",
                "completed"
              ],
              [
                "exec-9fcd3c27-eaad-4fdd-93e2-f0c15f453732",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -v'",
                "0",
                "completed"
              ],
              [
                "exec-40ab9781-58c7-4828-8cd2-431367478d35",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import sys from pathlib import Path from collections import Co",
                "0",
                "completed"
              ],
              [
                "exec-eac4e0e5-8273-46b8-8038-2d34ae66ccce",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path names=['2026-10-06-fix-manual-controller",
                "0",
                "completed"
              ],
              [
                "exec-f306fb31-1b5a-436e-956d-9d1c603ce093",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path from collections import Counter impor",
                "0",
                "completed"
              ],
              [
                "exec-e1144a89-ea26-42f8-ac4a-d0f335a035f2",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -n 'CABU\\\\.md|CAB\\\\.md|commandFiles|commands/|commandNames' plugins/cab-approva",
                "0",
                "completed"
              ],
              [
                "exec-63fa3f7a-5405-413b-b827-a3e1600a3d62",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -n 'CABU.md|CAB.md|commands|script' plugins/cab-approval-bridge/skills/approval",
                "0",
                "completed"
              ],
              [
                "exec-cd76ad7e-7923-4f6f-9ffc-9462b94dd94c",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -l '2\\\\.2\\\\.39' pyproject.toml .agents/plugins/marketplace.json .codex/commands",
                "0",
                "completed"
              ],
              [
                "exec-a68d478b-df97-43f2-ba07-4eb0e66f8ff0",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('/home/devops/datas/prompts/SGS.m",
                "0",
                "completed"
              ],
              [
                "exec-fcac10fa-9456-4872-8b7b-161af5fe3af2",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import sys,re from pathlib import Path sys.path.insert(0,'plug",
                "0",
                "completed"
              ],
              [
                "exec-71ddd768-b7d9-4787-8996-d1497ab66958",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path names=['2026-10-29-fix-codemode-discover",
                "0",
                "completed"
              ],
              [
                "exec-455aeec4-de73-48b6-8b6e-1449147f969f",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "0",
                "completed"
              ],
              [
                "exec-c67f9d47-398c-4ec6-a73c-469a71dc44a8",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import sys,re from pathlib import Path from collections import",
                "0",
                "completed"
              ],
              [
                "exec-28931476-48fb-41ef-b20e-5ea96faa4a3b",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import sys,re sys.path.insert(0,'plug",
                "0",
                "completed"
              ],
              [
                "exec-e0004c32-cb5b-4448-9997-29b2f1985dd2",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path for name in ['2026-10-28-fix-update-cred",
                "0",
                "completed"
              ],
              [
                "exec-67810e5e-1284-4c6f-b4c7-c06ff1764bb4",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path root=Path('/home/devops/datas/prompts') ",
                "0",
                "completed"
              ],
              [
                "exec-84e78de2-0ef0-4970-ac65-57318a8f84ee",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import json section='''## Statistiques d",
                "0",
                "completed"
              ],
              [
                "exec-7a0f2f9c-64b1-4c22-bace-f1a910478927",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -n 'REQUIRED|MODULE|scripts.*readdir|readdir.*scripts|requiredFiles|REQUIRED_SC",
                "0",
                "completed"
              ],
              [
                "exec-840e1231-ff2a-44f8-8716-2cd4c482f8fb",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1128,1175p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-updat",
                "0",
                "completed"
              ],
              [
                "exec-c9cb9b06-e4c9-4630-89a9-2023b91a298e",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '85,145p' tests/active-component-update.test.mjs; sed -n '300,330p' tests/c",
                "0",
                "completed"
              ],
              [
                "exec-1720b81c-8bbc-4c5e-a31f-df2ff40f17ad",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1,62p' tests/controller-service-distribution.test.mjs; sed -n '1,70p' test",
                "0",
                "completed"
              ],
              [
                "exec-ab5a70c9-649c-41d5-ba53-1cb197313722",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path for name,a,b in [('2026-10-20-fix-stoppe",
                "0",
                "completed"
              ],
              [
                "exec-c1547b16-255b-4cf7-bf5e-5f723d81b947",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import json,hashlib base=Path('openspec/",
                "0",
                "completed"
              ],
              [
                "exec-394f660d-4219-4e87-aac4-a61a5b2d9e91",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path from datetime import datetime,timezone r",
                "0",
                "completed"
              ],
              [
                "exec-e43a35da-d21f-4934-bbe6-b1a3eca344d8",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -v'",
                "0",
                "completed"
              ],
              [
                "exec-49d005aa-93b9-496b-b9af-34ccfa68cf41",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import re names=[p.name for p in Path('p",
                "0",
                "completed"
              ],
              [
                "exec-67df5100-54df-4aaa-9c36-13b4ce5bb474",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'node --test tests/controller-service-distribution.test.mjs tests/active-component-",
                "1",
                "failed"
              ],
              [
                "exec-d03dee9a-3f79-4ba1-8ef0-68facd714144",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-name-",
                "0",
                "completed"
              ],
              [
                "exec-27f681f9-df88-48fa-9ff1-d8de66f8b583",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'déploiement complet puis deuxième invocation' tes",
                "1",
                "failed"
              ],
              [
                "exec-38076540-b5d9-42ca-a327-262e47264ed7",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '235,266p' plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-update.",
                "0",
                "completed"
              ],
              [
                "exec-3fa4cc97-d662-47ce-84aa-54c793d7e467",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('tests/controller-service-distrib",
                "0",
                "completed"
              ],
              [
                "exec-0e7a47f0-3157-4c51-be22-d4b2d2d3c629",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'déploiement complet puis deuxième invocation' tes",
                "0",
                "completed"
              ],
              [
                "exec-bac7559c-0b0e-4bf5-88ff-5711ab13b87c",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1,26p' tests/active-component-update.test.mjs; sed -n '282,310p' tests/act",
                "0",
                "completed"
              ],
              [
                "exec-f48e6281-337a-49f2-9d59-0936cd52a82a",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '250,275p' tests/controller-service-distribution.test.mjs; sed -n '610,645p",
                "0",
                "completed"
              ],
              [
                "exec-db368ede-0a73-42fe-b1d3-38ea2a5ae1df",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import difflib for name in ['server','ro",
                "0",
                "completed"
              ],
              [
                "exec-e61ab735-81f2-419c-8ce9-212b75e74ea5",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import sys sys.path.insert(0,'plugins",
                "0",
                "completed"
              ],
              [
                "exec-19485cc5-1576-41f3-9e51-4dc80355ec65",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "0",
                "completed"
              ],
              [
                "exec-2fe1dca3-b404-4972-8411-3287f0a32b4a",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -n 'écrire|écriture|rapport|STATISTICS|six sections' plugins/cab-approval-bridg",
                "0",
                "completed"
              ],
              [
                "exec-ff79d6a8-1a57-4580-b4c8-2a79b844f525",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-re",
                "0",
                "completed"
              ],
              [
                "exec-f74dec45-00c4-4a35-a8d0-cae06267b781",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valida",
                "0",
                "completed"
              ],
              [
                "exec-37642c17-44fc-4061-9e2d-83e40ef03bba",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' import os,re,shutil from pathlib import Path from collections imp",
                "0",
                "completed"
              ],
              [
                "exec-64d7a9b2-ec18-4efa-8124-f6ea1b66594f",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' import subprocess r=subprocess.run(['node','--test','--test-repor",
                "0",
                "completed"
              ],
              [
                "exec-d3618598-8ae8-4aa6-852e-ae67fed9e60a",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import re p=Path('plugins/cab-approval-b",
                "0",
                "completed"
              ],
              [
                "exec-3704bd5a-c4ce-493e-bb44-f316cc99832e",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B -m unittest discover -s tests -p 'test_*.py'\"",
                "0",
                "completed"
              ],
              [
                "exec-f6c2f99b-4ce0-4ab7-aca5-d49a10036c8b",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import sys,json from pathlib import Path from collections impo",
                "0",
                "completed"
              ],
              [
                "exec-3910e0e1-5885-46dd-828c-ac68d59406e7",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD",
                "0",
                "completed"
              ],
              [
                "exec-04e4f30b-4730-459d-a5e4-62cf3b1ad556",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"node --test --test-name-pattern 'update prépare les trois commandes' tests/control",
                "0",
                "completed"
              ],
              [
                "exec-aacc3ce7-fbeb-4b62-a893-33fdfdfe313b",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY ",
                "0",
                "completed"
              ],
              [
                "exec-e8935fdc-c541-4e33-ad77-a7525f093b34",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1,100p' STATISTICS.md; sed -n '175,285p' STATISTICS.md; python3 -B -m unit",
                "0",
                "completed"
              ],
              [
                "exec-219d5b51-d9df-48d7-82e5-c6b6022774b2",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1,125p' AGENTS.md\"",
                "0",
                "completed"
              ],
              [
                "exec-26885462-2a16-4bd3-9f6f-7d8a98513895",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path for name in ['PROJECT.md','TECHNICAL.md'",
                "0",
                "completed"
              ],
              [
                "exec-c738d86b-555c-4626-9639-01c2c28f69ee",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path for name in ['openspec/changes/archive/2",
                "0",
                "completed"
              ],
              [
                "exec-1d58a524-486e-4450-9a54-b447f67e2ceb",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import re selected=[] for p in sorted(Pa",
                "0",
                "completed"
              ],
              [
                "exec-3f13f078-f01d-4857-9ca7-7a7ed1f3ac16",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1330,1380p' /home/devops/datas/prompts/SGS.md\"",
                "0",
                "completed"
              ],
              [
                "exec-83713605-14cb-4da9-bcc7-ace764bf86cc",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1,20p' openspec/changes/add-reusable-project-statistics/specs/global-proje",
                "0",
                "completed"
              ],
              [
                "exec-c3684e1e-f8a5-444c-8122-9d9db8c9a3bd",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate add-reusable-project-statistics --st",
                "0",
                "completed"
              ],
              [
                "exec-676df164-71f6-419c-9855-51571ea390c4",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -n '\"'^def render|elif section|percentage_keys|for kind in'\"' plugins/cab-appro",
                "0",
                "completed"
              ],
              [
                "exec-1ba7063e-8ade-4252-8eb7-f33699612a69",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"sed -n '1082,1198p' plugins/cab-approval-bridge/scripts/cab_sgs.py\"",
                "0",
                "completed"
              ],
              [
                "exec-028bf6d4-5340-4360-8a42-420420f75bed",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py INSPECT",
                "0",
                "completed"
              ],
              [
                "exec-129ef2b0-97be-42e1-8029-cd0f0fef7e90",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "0",
                "completed"
              ],
              [
                "exec-994e5735-0f2d-4d2a-9595-a832ce1c75d3",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import sys from pathlib import Path from collections import Co",
                "0",
                "completed"
              ],
              [
                "exec-1974519e-1de6-455d-a999-02efbc4f55bf",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path from collections import Counter impor",
                "0",
                "completed"
              ],
              [
                "exec-cb402fd6-da3b-426f-b92f-d9b011dbb630",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import sys from pathlib import Path from collections import Co",
                "0",
                "completed"
              ],
              [
                "exec-179bb291-7a95-48e9-b3f1-ecbd34d33702",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path from collections import Counter impor",
                "0",
                "completed"
              ],
              [
                "exec-4ebda2f8-1d5c-4030-bc4c-d2fcb12e03cd",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "0",
                "completed"
              ],
              [
                "exec-67283e5a-9257-44c7-8d52-b91f88436596",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('plugins/cab-approval-bridge/skil",
                "0",
                "completed"
              ],
              [
                "exec-cf01ccc2-fed7-4ce9-9f30-f2f03dfba406",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'cat /home/adema261/.codex/plugins/cache/openai-curated-remote/write-like-me/0.1.1/",
                "0",
                "completed"
              ],
              [
                "exec-0d33cf86-e9d2-41f1-b5b9-6caa143bd300",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import os,shutil print('sudo:',shutil.wh",
                "1",
                "failed"
              ],
              [
                "exec-57352ecf-b65b-48ca-ad13-c2905d968267",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -n 'action=recover|def publish|def recover|recover\\\\(root\\\\)' plugins/cab-appro",
                "0",
                "completed"
              ],
              [
                "exec-6e2f2d31-6774-47d3-8707-b04a052e9217",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "1",
                "failed"
              ],
              [
                "exec-b30f631e-5ee1-46a2-9811-0ea2f1ffa390",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'python3 -B -m unittest discover -s tests -p test_sgs.py -q'",
                "0",
                "completed"
              ],
              [
                "exec-db1f98b3-b1df-480b-980d-abdc5fb8104f",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"rg -n 'copie.*broker|broker.*copie|DIU|cicd|synchron.*broker' BUILD.md\"",
                "0",
                "completed"
              ],
              [
                "exec-38b7421e-f403-4bd1-8992-740b3306ff59",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'sudo -n -l -- /usr/local/bin/diu projects cicd cab 2.2.40'",
                "0",
                "completed"
              ],
              [
                "exec-7e0480e9-ce28-47c4-878a-ae6d5462028b",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path import stat for name in ['AGENTS.md','sr",
                "0",
                "completed"
              ],
              [
                "exec-4a19a760-b938-4c77-8780-df7252b74b5f",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc 'node --test tests/controller-service-distribution.test.mjs'",
                "0",
                "completed"
              ],
              [
                "exec-1ef6c7c7-1eab-43ca-b151-89126c1d2063",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py REBUILD",
                "0",
                "completed"
              ],
              [
                "exec-86599ae1-1ef1-4010-8933-c0c2a7d75e53",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 -B -m unittest discover -s tests -p 'test_*.py'\"",
                "0",
                "completed"
              ],
              [
                "exec-bbb1ef36-b269-4c74-a906-faf0bedf0db0",
                "01a1ac03-26ac-75f1-bc87-498c123f40ea",
                "/usr/bin/zsh -lc \"python3 - <<'PY' from pathlib import Path p=Path('/home/devops/datas/cab/openspec/",
                "0",
                "completed"
              ],
              [
                "exec-b63679aa-ba5d-4789-8e7f-d7181e6d42ce",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"git status --short | head -12; git diff --cached --stat | tail -3; git log -1 --fo",
                "0",
                "completed"
              ],
              [
                "exec-7f0fc3c6-a57e-4ab8-91b0-173012084c5f",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"cat openspec/changes/archive/2026-11-05-add-reusable-project-statistics/DELIVERY.m",
                "0",
                "completed"
              ],
              [
                "exec-8f36447f-9e1e-46b3-a87c-ca28299bb911",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"sed -n '740,815p' /home/devops/datas/diu/modules/projects/git.sh; rg -n 'projects_",
                "0",
                "completed"
              ],
              [
                "exec-73d806fe-a6b8-4a5a-b2b1-bfa9a7889475",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('.gitignore');s=p.read_text();",
                "0",
                "completed"
              ],
              [
                "exec-31a09638-3a3a-4a1e-bed4-37f69a616970",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc 'git restore --staged -- .cab-cleanup-worktree .gitignore openspec/changes/archive/",
                "0",
                "completed"
              ],
              [
                "exec-4fd00bd9-821f-4268-9e62-d1525b6c28ab",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('openspec/changes/archive/2026",
                "0",
                "completed"
              ],
              [
                "exec-2d59431e-bcfe-4a34-8f3a-0a4dce1425ff",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY ",
                "1",
                "failed"
              ],
              [
                "exec-3d58f780-5f5a-40d0-816d-8fe4314a40c9",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import json,hashlib r=json.loads(Path",
                "0",
                "completed"
              ],
              [
                "exec-cabd5422-8b67-4604-8317-2616959ab54d",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"stat -c '%y %n' /home/devops/datas/prompts/SGS.md; sed -n '1,28p' /home/devops/dat",
                "0",
                "completed"
              ],
              [
                "exec-39a75ea9-39ed-4b46-9fc0-24e5b8f91c15",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess p=Path('output/sgs-",
                "0",
                "completed"
              ],
              [
                "exec-7bcfa3bd-652b-40ff-9e94-7fc3bc2e5edb",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess,re,sys,time from pathlib import Path log=Pat",
                "0",
                "completed"
              ],
              [
                "exec-f383b7a6-ce0d-4aea-878f-fd313ea21ccf",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import hashlib,json p=Path('/home/dev",
                "0",
                "completed"
              ],
              [
                "exec-3d0c23e9-02f7-441b-bdd5-11ab5e065c1e",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc 'tail -55 output/sgs-upstream-integration/diu-2.3.0-replay.log'",
                "0",
                "completed"
              ],
              [
                "exec-42c11721-6e3a-488f-9489-a85eaa9a36b0",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"git ls-remote --heads github main; git ls-remote --tags github 'v2.3.0*'; git fetc",
                "0",
                "completed"
              ],
              [
                "exec-033fd78a-748f-4e4e-aa7d-6c5a06c06eac",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess,json from pathlib import Path head=subproces",
                "0",
                "completed"
              ],
              [
                "exec-7a63c150-4109-4cff-9aa2-4c3feeb72c51",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc 'git merge --ff-only github/main'",
                "0",
                "completed"
              ],
              [
                "exec-a7bec5f4-925a-43c6-bd99-891cd2beaf5e",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"rg -n -m 4 'PROMPTS|prompts|OpenSpec|Python|python3' DEVOPS.md | head -12; git sta",
                "0",
                "completed"
              ],
              [
                "exec-67ef2a05-f0a2-44b0-9e41-cce55187e99e",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import sys,json,hashlib sys.path.inse",
                "0",
                "completed"
              ],
              [
                "exec-f59fa5bb-a162-45c6-a1d7-aca34b8d6b10",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc 'cat /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/prompt/SK",
                "0",
                "completed"
              ],
              [
                "exec-68908fa5-7458-4c16-9b80-8e6b6721dd0f",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"git status --short; head -45 AGENTS.md; rg -n 'prompt|PROMPT|SCM' DEVOPS.md | tail",
                "0",
                "completed"
              ],
              [
                "exec-7d027ac5-3bbd-462e-a0b2-c9270d3a8ce3",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/plugins/cache/tools-codex/prompt/0.7.26/skills/pr",
                "0",
                "completed"
              ],
              [
                "exec-22e0b8d6-90bc-4d7d-a44b-fbf477b23ae8",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"sed -n '285,600p' /home/devops/datas/prompts/SCM.md\"",
                "0",
                "completed"
              ],
              [
                "exec-b1bf6c52-675f-407f-aa56-c4a31d658a16",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"sed -n '601,800p' /home/devops/datas/prompts/SCM.md; sed -n '1,125p' /home/devops/",
                "0",
                "completed"
              ],
              [
                "exec-ad8b592f-53ca-4463-856b-bf0a4633001b",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc 'head -38 PROJECT.md; head -33 TECHNICAL.md; head -35 BUILD.md; head -32 DEVELOPMEN",
                "0",
                "completed"
              ],
              [
                "exec-ec0e28fc-63b3-4545-b06e-9d46bb86b239",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"sed -n '601,800p' /home/devops/datas/prompts/SCM.md\"",
                "0",
                "completed"
              ],
              [
                "exec-41753224-734b-49d5-b52b-16215e2445ab",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"rg -n '\"'^# |''^## '\"' /home/devops/datas/prompts/ACL.md | tail -23; cat plugins/c",
                "0",
                "completed"
              ],
              [
                "exec-8388207d-2ddd-43eb-9457-d7c73536a7fc",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"sed -n '130,228p' /home/devops/datas/prompts/ACL.md; sed -n '309,385p' /home/devop",
                "0",
                "completed"
              ],
              [
                "exec-fd033d1e-abcb-4849-9fe9-eb61b907f91c",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"rg -n 'version|Version' tests/{protocol-distribution,controller-service-distributi",
                "0",
                "completed"
              ],
              [
                "exec-0430c925-4a51-44e3-ba9d-81e29973d39b",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"tail -65 openspec/changes/archive/2026-11-05-add-reusable-project-statistics/QUALI",
                "0",
                "completed"
              ],
              [
                "exec-96f089cd-7831-4b60-ba49-8b07fec7296f",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess roots=['pyproject.t",
                "0",
                "completed"
              ],
              [
                "exec-6e80bb9f-44bb-4a99-8554-da7c23ca1824",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc 'sudo -n -l -- /usr/local/bin/diu projects cicd cab 2.3.1'",
                "0",
                "completed"
              ],
              [
                "exec-c5330885-ffae-4257-b386-77e3c28eb89a",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"sed -n '34,57p' tests/protocol-distribution.test.mjs; sed -n '1,45p' plugins/cab-a",
                "0",
                "completed"
              ],
              [
                "exec-def4d89a-4ac9-432e-9c66-492bdef3eae9",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path from datetime import datetime,timezon",
                "0",
                "completed"
              ],
              [
                "exec-e236a5bf-fe49-4b35-9c17-244c091970a8",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess,json from pathlib import Path r=subprocess.r",
                "0",
                "completed"
              ],
              [
                "exec-1fb1ffa3-9b04-4dee-9c22-c0ed22859c06",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc 'cat /home/devops/datas/prompts/INDEX.md'",
                "0",
                "completed"
              ],
              [
                "exec-74fad6ed-52aa-4818-9646-4eeb18950aeb",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"sed -n '1,430p' /home/devops/datas/prompts/SGS.md\"",
                "0",
                "completed"
              ],
              [
                "exec-b475d594-d431-4524-a7fa-ac632e321c95",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"sed -n '431,850p' /home/devops/datas/prompts/SGS.md\"",
                "0",
                "completed"
              ],
              [
                "exec-c47d29be-1511-45f4-8986-ca7731a7fd42",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"sed -n '851,1300p' /home/devops/datas/prompts/SGS.md\"",
                "0",
                "completed"
              ],
              [
                "exec-ba7b63d2-ecf5-4425-a09c-3896fc2c4bd6",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"sed -n '1301,1530p' /home/devops/datas/prompts/SGS.md; sed -n '235,350p' /home/dev",
                "0",
                "completed"
              ],
              [
                "exec-22825954-bfa1-402b-858f-a5c1baf45aea",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,os out=Path('output",
                "0",
                "completed"
              ],
              [
                "exec-de7d28a6-49e5-4cda-9cad-3fcdb4bd45e2",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive'",
                "0",
                "completed"
              ],
              [
                "exec-c58dde79-bc24-4e38-b9c8-cd64e3a62d32",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import json,hashlib,subprocess,tempfile,os from pathlib import",
                "0",
                "completed"
              ],
              [
                "exec-49cd0672-d5fe-4b91-9c7f-074378508b68",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc 'git diff --check'",
                "0",
                "completed"
              ],
              [
                "exec-ac79e6e0-aa7a-47b0-a739-a290ed790fac",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path for name in ['PROJECT.md','TECHNICAL.",
                "0",
                "completed"
              ],
              [
                "exec-865abd50-8c91-4e6f-8fbd-a7eeed9dea5b",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc 'git diff --numstat | tail -10'",
                "0",
                "completed"
              ],
              [
                "exec-6da9e1e2-982a-49d0-aaef-f30cc9989222",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import json,re from pathlib import Path x=json.loads(Path('ope",
                "0",
                "completed"
              ],
              [
                "exec-1feff127-6b84-4010-b63b-05172555157a",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc 'python3 -B /home/adema261/.codex/skills/.system/skill-creator/scripts/quick_valida",
                "0",
                "completed"
              ],
              [
                "exec-4017f274-ebc0-4818-aef3-fa072dd60472",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --specs --strict --no-interactive'",
                "0",
                "completed"
              ],
              [
                "exec-045cd93a-31f7-467e-9c25-c2c57bd4877d",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc 'git diff -- .codex/commands/SGS.md plugins/cab-approval-bridge/scripts/cab_sgs.py ",
                "0",
                "completed"
              ],
              [
                "exec-7374fd1a-2048-47de-a7f5-e7bf5e52ee93",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,json expected=set(j",
                "0",
                "completed"
              ],
              [
                "exec-20d27e22-5633-4a65-8eab-375a658cc33a",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess rows=[l.split(None,4) for l in subprocess.ch",
                "0",
                "completed"
              ],
              [
                "exec-3bb29ae3-4d14-4f54-b7c6-a8412a9a68d1",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess rows=[l.split(None,4) for l in subprocess.ch",
                "0",
                "completed"
              ],
              [
                "exec-cbbd2c18-06cf-409a-b167-8c4efcf6a3e6",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import json,hashlib,re base=Path('ope",
                "0",
                "completed"
              ],
              [
                "exec-68e83276-d39f-45f4-ae40-06707356872c",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py RECOVER",
                "0",
                "completed"
              ],
              [
                "exec-7e682c4f-44dc-4b83-8edd-5f9865945b52",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERSION",
                "0",
                "completed"
              ],
              [
                "exec-56dfd867-7bc2-46da-a2b6-71036d35b09f",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"sed -n '351,560p' /home/devops/datas/prompts/INDEX.md\"",
                "0",
                "completed"
              ],
              [
                "exec-0a64ca84-7829-4c42-891f-eb1c4be682c9",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"sed -n '1,154p' /home/devops/datas/prompts/SGS.md\"",
                "0",
                "completed"
              ],
              [
                "exec-f683e6ff-c4a8-4318-8c14-12ed58839d78",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess rows=[l.split(None,4) for l in subprocess.ch",
                "0",
                "completed"
              ],
              [
                "exec-99c3dfa0-7b40-47e6-8620-1290f5336f32",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path base=Path('openspec/changes/archive/2",
                "0",
                "completed"
              ],
              [
                "exec-8e94d4a3-6c2b-4873-8a24-6276a0b55da6",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"rg -n 'version (?:actuelle|courante|de base)|version source courante|partagent la ",
                "0",
                "completed"
              ],
              [
                "exec-8ca1e7bc-ce88-479e-b489-30ef50fb8aad",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"sed -n '940,965p' README.md; sed -n '338,353p' TECHNICAL.md; sed -n '540,553p' BUI",
                "0",
                "completed"
              ],
              [
                "exec-b3d1a1c0-4053-474a-8ed2-7b1a01b9ced3",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"rg -n 'version.*2\\\\.2\\\\.39|version.*1\\\\.10\\\\.6|courante.*2\\\\.2\\\\.39|servir 2\\\\.2\\\\",
                "0",
                "completed"
              ],
              [
                "exec-e70a5571-e956-414d-bce5-f4a633b0b1c1",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"sed -n '250,268p' PROJECT.md; sed -n '845,854p' BUILD.md; sed -n '890,900p' BUILD.",
                "0",
                "completed"
              ],
              [
                "exec-4604f0bf-8a05-4756-9481-f5fa254e8573",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path for name in ['PROJECT.md','TECHNICAL.",
                "0",
                "completed"
              ],
              [
                "exec-21aae4b9-3733-442e-a132-ad9547f3abe2",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc 'git diff --check'",
                "0",
                "completed"
              ],
              [
                "exec-01639917-1ef1-4fb0-940e-aa2788f1cdbf",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess rows=[l.split(None,4) for l in subprocess.ch",
                "0",
                "completed"
              ],
              [
                "exec-f4c79df7-daae-489a-ae32-2edcc958c5d5",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess,json,time from pathlib import Path files=sor",
                "0",
                "completed"
              ],
              [
                "exec-e0c0d31b-e6b5-4cc4-9ebd-c14517b03d3e",
                "01a1adbf-3303-77b1-8c96-adf3584250ef",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess rows=[l.split(None,4) for l in subprocess.ch",
                "0",
                "completed"
              ],
              [
                "exec-55bf45cf-13a9-48ca-890f-8caf1b7efb85",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import json x=json.loads(\\\"{\\\\\\\"schem",
                "0",
                "completed"
              ],
              [
                "exec-ad0ccd10-455c-4675-817f-2c9ea9da6fc6",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import json,time base=Path('openspec/",
                "0",
                "completed"
              ],
              [
                "exec-fc34e294-e600-481a-ae1d-3b75e25168a8",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py CHANGE ",
                "0",
                "completed"
              ],
              [
                "exec-6a721129-c7c1-46c1-9281-53b955ff58dc",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc '/home/devops/.local/npm/bin/openspec validate --all --strict --no-interactive'",
                "0",
                "completed"
              ],
              [
                "exec-ddac2a7e-ce9d-4b13-a278-1f6800845ccc",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('openspec/changes/archive/2026",
                "0",
                "completed"
              ],
              [
                "exec-a2db2578-845d-4e06-8bc2-4b12a50777fb",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY ",
                "0",
                "completed"
              ],
              [
                "exec-5b11a634-725c-48db-83e7-9ceedef086c4",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import re base=Path('openspec/changes",
                "0",
                "completed"
              ],
              [
                "exec-09092fd5-79bc-4faf-98a6-4fd84fa454c6",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py DELTA -",
                "0",
                "completed"
              ],
              [
                "exec-cb55f810-b4b6-4f31-ab24-c9b632851adc",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"git diff --check; git -C /home/devops/datas/prompts diff --check; git diff --stat ",
                "0",
                "completed"
              ],
              [
                "exec-5a71af06-f2d5-4e0a-9976-32f825496912",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY ",
                "0",
                "completed"
              ],
              [
                "exec-0fb5d140-481a-4de4-8273-cca44490798c",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py QUERY -",
                "0",
                "completed"
              ],
              [
                "exec-7057b393-926d-409f-9ee3-473cb896fca3",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess,re,json base=Path('",
                "0",
                "completed"
              ],
              [
                "exec-c9b16b6c-9267-4291-bd47-f33bcf05ab88",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'git diff --check'",
                "0",
                "completed"
              ],
              [
                "exec-1e738ec0-e643-4759-b1f5-c174ef648cd6",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'git status --short --untracked-files=all | tail -15'",
                "0",
                "completed"
              ],
              [
                "exec-63e81bdf-d2d2-4b63-bf17-16dc5f93654a",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"git log -2 --format='%h %s'; git status --short | head -12; git ls-files '.cab-*' ",
                "0",
                "completed"
              ],
              [
                "exec-b9aa260e-2052-4c1c-9671-3565abaad146",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess rows=[l.split(None,3) for l in subprocess.ch",
                "0",
                "completed"
              ],
              [
                "exec-52f4ab04-fd97-43e5-959c-3f2a5b545f65",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'kill -INT 2915959'",
                "0",
                "completed"
              ],
              [
                "exec-5855d835-0c4f-4344-b7d5-e75abc09c718",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess,re,sys p=subprocess.Popen(['sudo','-n','/usr",
                "130",
                "failed"
              ],
              [
                "exec-9aa9971a-b5bc-40e5-9f0e-38aaef642d64",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"git ls-remote --heads github main; git ls-remote --tags github '*2.3.0*'; git stat",
                "0",
                "completed"
              ],
              [
                "exec-803fb776-a4b9-4c85-a99b-65830b992fbf",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess rows=[l.split(None,4) for l in subprocess.ch",
                "0",
                "completed"
              ],
              [
                "exec-905c3f90-c76d-405a-a9d6-d3e30f7e2505",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"git ls-remote --heads origin main; git ls-remote --tags origin '*2.3.0*'; git show",
                "0",
                "completed"
              ],
              [
                "exec-1610b73a-d05f-481d-9163-61ea064b7415",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"rg -n '_projects_cicd_replay_merge_and_push|force-with-lease|RECONCILE|conflict|re",
                "0",
                "completed"
              ],
              [
                "exec-89d0cc0f-205c-4668-9034-df3d9a0da637",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess for ref in ['b509094e','HEAD','github/main']",
                "0",
                "completed"
              ],
              [
                "exec-74c67b26-d927-4c6b-8674-96962a938243",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"sed -n '450,516p' /home/devops/datas/diu/modules/projects/git.sh; sed -n '349,425p",
                "0",
                "completed"
              ],
              [
                "exec-e9eb3a3f-763b-4af3-b55b-5ef5b18b7061",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path import subprocess p=Path('.gitignore'",
                "0",
                "completed"
              ],
              [
                "exec-ba89ba6b-da6e-4f9b-9d37-a21a2d54d8bc",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"git diff --check; git diff --cached --stat | tail -1; git ls-remote --heads github",
                "0",
                "completed"
              ],
              [
                "exec-4f4535fd-2ac0-435e-b134-9b21a8c771e6",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'python3 -B plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py VERIFY ",
                "0",
                "completed"
              ],
              [
                "exec-f6a9c89c-1bd7-42a5-b7b5-51b886fbd994",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' from pathlib import Path p=Path('openspec/changes/archive/2026",
                "0",
                "completed"
              ],
              [
                "exec-f13afdc0-c19b-460a-ac62-544f21148da2",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc 'git add -- .gitignore openspec/changes/archive/2026-11-05-add-reusable-project-sta",
                "0",
                "completed"
              ],
              [
                "exec-748e1dbf-3c5a-455e-8185-c91f7e06db74",
                "01a1ad75-f5c3-7a33-8894-b4da72d05e68",
                "/usr/bin/zsh -lc \"python3 -B - <<'PY' import subprocess from pathlib import Path staged=subprocess.c",
                "0",
                "completed"
              ]
            ],
            "title": "Commandes observées au relevé de clôture"
          }
        ],
        "6": [
          {
            "columns": [
              "Élément",
              "Résultat",
              "Preuve"
            ],
            "rows": [
              [
                "GitHub2.3.0",
                "Publié :tagv2.3.0 et branche réconciliée",
                "af940d26 / d2dd0b33"
              ],
              [
                "Périmètre CAB",
                "Intégralité conservée, y compris3453fichiers de copie locale",
                "arbres Git local et distant"
              ],
              [
                "Forgejo",
                "Indisponible, publication non confirmée",
                "journal DIU2.3.0"
              ],
              [
                "GitLab",
                "Non configuré",
                "journal DIU2.3.0"
              ],
              [
                "Clôture2.3.1",
                "Qualification réussie ; livraison parDIU en fin de workflow",
                "QUALIFICATION.md"
              ],
              [
                "Global",
                "Tentative DELTA séparée, sans REBUILD",
                "contrat SGS courant"
              ],
              [
                "Activation",
                "Non exécutée",
                "aucun CABU ni démarrage de runtime"
              ]
            ],
            "title": "Livraison vérifiée et limites"
          }
        ]
      }
    }
  ]
}
-->
