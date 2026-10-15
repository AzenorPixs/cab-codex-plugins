# Statistiques — optimisation du protocole et collecte native CAB

Change : `optimize-cab-statistics-and-integration`. Demande SCM directe puis
validation explicite des six mesures et de la collecte native le 15 octobre 2026.
Aucune invocation du skill statistique, sonde LLM ni télémétrie de pilotage SCM.

### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---|---|---|
| Codex, modèle exact N/A | N/A | OpenAI | N/A | N/A | N/A | N/A |

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---|---|---|
| Aucun agent de pilotage distinct — SCM direct | N/A | N/A | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

**Résultat : correctif source implémenté, validé et archivé.** La collecte native
produit JSON et brouillon Markdown sans RUN d'observation. Les six mesures sont
couvertes : préparation continue, clôture documentaire hors exclusion globale,
FIFO, réduction des ressources, opérations complètes et traitement immédiat,
latences et causes d'attente. Permissions explicites, once et gate sont conservés.

| Population de tests, dernier état par suite | Cas | Part |
|---|---:|---:|
| Python | 50 | 25,4 % |
| Node avec simulations et contrôles locaux | 146 | 74,1 % |
| Intégration native OpenCode isolée | 1 | 0,5 % |
| Total | 197 | 100,0 % |

197/197 réussis, 0 échec final, 0 test ignoré. Les répétitions ne sont pas
additionnées. L'intégration native utilise trois sessions et un broker isolés,
sans modèle ni opération métier. Les permissions synthétiques des fixtures ne
sont pas des mandats de production de cette session SCM.

Messages, appels d'outils totaux, décisions sandbox, tokens, coût, cache et
compactions : N/A — collecte exhaustive non activée en SCM. Début effectif et
durée globale complète : N/A — exploration antérieure à la borne instrumentée.

## 2. Types de messages et d'outils

Rôles des messages et appels de l'agent : N/A — non agrégés exhaustivement.
Les preuves ci-dessous sont des validations exécutées, pas des estimations.

| Vérification exécutée | Cas | Résultat |
|---|---:|---|
| /home/devops/node/current/bin/node tests/native-statistics.test.mjs | 10 | réussie, exit 0 |
| /home/devops/node/current/bin/node tests/concurrent-run-registry.test.mjs | 16 | réussie, exit 0 |
| /home/devops/python/current/bin/python3 -B -m unittest discover -s tests -p 'test_*.py' | 50 | réussie, exit 0 |
| /home/devops/node/current/bin/node tests/concurrent-controller.test.mjs | 12 | réussie, exit 0 |
| /home/devops/node/current/bin/node tests/controller-configuration.test.mjs | 13 | réussie, exit 0 |
| /home/devops/node/current/bin/node tests/controller-job-restoration.test.mjs | 27 | réussie, exit 0 |
| /home/devops/node/current/bin/node tests/controller-session-recovery.test.mjs | 33 | réussie, exit 0 |
| /home/devops/node/current/bin/node tests/controller-service-distribution.test.mjs | 17 | réussie, exit 0 |
| /home/devops/node/current/bin/node tests/controller-healthcheck-compatibility.test.mjs | 6 | réussie, exit 0 |
| /home/devops/node/current/bin/node tests/concurrent-supervisor.test.mjs | 1 | réussie, exit 0 |
| /home/devops/node/current/bin/node tests/persistent-job-supervisor.test.mjs | 11 | réussie, exit 0 |
| CAB_TEST_OPENCODE=/home/devops/.opencode/bin/opencode /home/devops/node/current/bin/node tests/na... | 1 | réussie, exit 0 |

Syntaxe Python sur reset, générateur et deux tests modifiés : réussie.
Syntaxe Node sur les quatre modules modifiés : réussie ; les tests modifiés
sont exécutés directement. Frontend et construction npm : non pertinents.
Le mode Node --test en sandbox ne rapportait que le fichier parent ; il n'est
pas utilisé comme preuve fonctionnelle des cas internes.

## 3. Fichiers modifiés

Inventaire final : 32 fichiers sources, tests, documents et OpenSpec, hors
artefacts output. Ce nombre n'est pas un nombre de tentatives d'écriture,
de permissions ou de lignes modifiées, ni un état Git.

| Chemin absolu complet | Intervention |
|---|---|
| /home/devops/datas/cab/BUILD.md | modified |
| /home/devops/datas/cab/CHANGELOG.md | modified |
| /home/devops/datas/cab/ORCHESTRATED_CODING.md | modified |
| /home/devops/datas/cab/PROJECT.md | modified |
| /home/devops/datas/cab/README.md | modified |
| /home/devops/datas/cab/TECHNICAL.md | modified |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs | modified |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs | modified |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py | modified |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py | modified |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs | modified |
| /home/devops/datas/cab/plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-statistics.mjs | created |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md | modified |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/concurrent-runs.md | modified |
| /home/devops/datas/cab/plugins/cab-approval-bridge/skills/coding-session-statistics/SKILL.md | modified |
| /home/devops/datas/cab/tests/concurrent-controller.test.mjs | modified |
| /home/devops/datas/cab/tests/concurrent-run-registry.test.mjs | modified |
| /home/devops/datas/cab/tests/controller-service-distribution.test.mjs | modified |
| /home/devops/datas/cab/tests/native-opencode.test.mjs | modified |
| /home/devops/datas/cab/tests/native-statistics.test.mjs | created |
| /home/devops/datas/cab/tests/test_piloted_prompts.py | modified |
| /home/devops/datas/cab/tests/test_session_reset.py | modified |
| /home/devops/datas/cab/openspec/specs/native-session-statistics/spec.md | créé |
| /home/devops/datas/cab/openspec/specs/concurrent-run-coordination/spec.md | modifié |
| /home/devops/datas/cab/openspec/specs/archive-session-statistics/spec.md | modifié |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-15-optimize-cab-statistics-and-integration/design.md | créé puis archivé |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-15-optimize-cab-statistics-and-integration/proposal.md | créé puis archivé |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-15-optimize-cab-statistics-and-integration/specs/archive-session-statistics/spec.md | créé puis archivé |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-15-optimize-cab-statistics-and-integration/specs/concurrent-run-coordination/spec.md | créé puis archivé |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-15-optimize-cab-statistics-and-integration/specs/native-session-statistics/spec.md | créé puis archivé |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-15-optimize-cab-statistics-and-integration/tasks.md | créé puis archivé |
| /home/devops/datas/cab/openspec/changes/archive/2026-10-15-optimize-cab-statistics-and-integration/STATISTIQUES.md | créé après archive |

Six artefacts du change ont été déplacés par OpenSpec vers cette archive ; le
rapport a été ajouté ensuite. Aucun fichier source supprimé ou renommé. AGENTS.md
et DEVOPS.md sont identiques à la baseline. Le corpus ciblé et les empreintes
figurent dans perimetre.json ; ce contrôle n'est pas un inventaire Git exhaustif.
UTF-8/LF vérifiés ; aucun écart hors périmètre constaté dans ce corpus.

## 4. Commandes

Les commandes exactes et sorties sont dans
`output/scm/optimize-cab-statistics-and-integration/verifications.json`.
Les libellés du tableau sont limités à 100 caractères. Mandats CAB réels :
non applicables en SCM. Refus sandbox exhaustifs : N/A. Les tests HTTP d'abord
en erreur EPERM ont réussi hors sandbox après revue automatique autorisée.
Aucune revue automatique n'a rejeté l'action.

Un test de distribution a détecté la version absente du nouveau module : corrigé,
puis 17/17 réussis. Un paragraphe trop long a été détecté après synchronisation :
rédaction corrigée dans le canon et le delta archivé, sans réarchivage. Le Purpose
provisoire généré pour la nouvelle capacité a été complété. Aucun test affaibli.

La première archive --json demandait --yes pour synchroniser trois spécifications
et n'a rien archivé. La confirmation était couverte par le périmètre SCM validé.
L'exécution confirmée a réussi une seule fois : 8 exigences ajoutées, 2 modifiées,
aucune supprimée ni renommée. Validation stricte finale : **9/9, exit 0, sans
avertissement**. Ces incidents ne sont pas des refus de permission CAB.

## 5. Accès web

Aucune recherche web, aucun envoi à un tiers ni déploiement. Les validations
réseau utilisent des services loopback temporaires et une instance OpenCode
isolée. Aucun appel aux RUN ou services actifs Pixs, aucune approbation métier,
aucune modification d'automation. URL externes visitées/refusées : sans objet.

## 6. Synthèse globale

| Durée observée de la session SCM | Valeur |
|---|---|
| Début effectif de session | N/A — exploration initiale non horodatée |
| Borne de suivi vérifiable | 2026-10-15T05:32:21+02:00 |
| Fin après archive, avant ce rapport | 2026-10-15T06:27:01+02:00 |
| Intervalle vérifiable, attentes incluses | 00 h 54 min 40 s |
| Durée globale complète | N/A — distincte de cet intervalle |

| Quota Codex 7 jours | Horodatage | Quota utilisé | Réinitialisation |
|---|---|---|---|
| Avant | N/A | N/A | N/A |
| Après archive | N/A | N/A | N/A |
| Différence | — | N/A | — |

Relevés non effectués en SCM ; aucune consommation reconstituée ni attribuée à
un RUN. Le quota est partagé par le compte. Temps de génération, TTMT, débit
et coût de l'agent : N/A.

| Domaine de validation finale | Réussites | Échecs | Part des cas |
|---|---:|---:|---:|
| Python | 50 | 0 | 25,4 % |
| Node | 147 | 0 | 74,6 % |
| Total tests | 197 | 0 | 100,0 % |

OpenSpec est validé strictement après archive ; les dix exigences du delta sont
identiques au canon. Rapport à six sections, UTF-8/LF, existence et totaux vérifiés.
La matrice documentaire et les critères sont dans PREPARATION-CLOTURE.md ;
l'état final est dans CLOTURE-SCM.md à côté des preuves. AGENTS reste inchangé
car les règles générales, permissions et rapport obligatoire sont conservés ;
DEVOPS reste un inventaire daté, sans modification de système ou dépendance.

Le registre passe au schéma 2 lors des nouvelles transitions ; une ancienne
installation ne doit pas charger cet état sans réconciliation coordonnée.
Pas d'état Git inspecté, commit, push, branche, installation ou modification
des services utilisateur. Seuls les processus des tests isolés sont lancés et
arrêtés. Aucun fichier sensible consulté ni secret ajouté ; les marqueurs des
tests sont exclusivement synthétiques.

Livraison source, sans nouvelle release inventée. Déploiement coordonné et mesure
d'un gain réel restent distincts. Le suivi externe existant n'est pas arrêté.
