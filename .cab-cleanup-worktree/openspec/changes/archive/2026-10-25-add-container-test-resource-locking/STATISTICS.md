# Statistiques SCM — CAB 1.10.0

Archive : `2026-10-25-add-container-test-resource-locking`. Rapport établi après la preuve d'archivage réussie du 25 octobre 2026, dans une session SCM directe Codex. Aucun pilotage OpenCode ni skill coding-session-statistics n'a été lancé.

## 1. Statistiques générales et décisions

Projet : Codex Approval Bridge (`cab`). Version source : 1.9.0 → 1.10.0. Auteur : Codex direct ; aucun sous-agent délégué. Modèle exact, tokens et quotas de compte : **N/A**, non exposés/relevés pour cette session SCM. La durée intégrale de session est **N/A** : aucun relevé initial de session complet n'a été préparé. Fenêtre du relevé de fichiers : 2026-10-25T10:57:10+01:00 à 2026-10-25T12:08:29+01:00 ; elle ne représente pas la durée intégrale de la conversation.

Le développeur a validé le périmètre Docker/LXC et moniteur, puis demandé les navigateurs externes et la PLLM automatique avec high/xhigh/repli. Il a confirmé de conserver et bloquer un modèle explicite incompatible. Ces accords couvrent ce seul change, sa spécification, réalisation, tests, documentation, archivage et ce rapport. Décisions/permissions CAB natives en production : **N/A**, SCM n'étant pas une session pilotée ; aucune décision de RUN réel n'est attribuée à ce travail.

## 2. Types de messages et d'outils

Messages utilisateur/assistant et nombre total d'appels outils/commandes : **N/A**, aucun compteur exhaustif de session n'a été préparé ; aucune reconstruction depuis des journaux privés. Outils observés dans le périmètre : lecture/recherche locale, édition de sources, exécution de tests, consultation de documentation et inspection d'images de qualification. Les processus OpenCode et navigateurs lancés pour les tests utilisent des profils temporaires isolés.

| Validation distincte | Résultat observé |
| --- | --- |
| Node, dernier résultat par fichier sans double comptage des réexécutions | 392 déclarés : 367 réussis, 0 échoué, 25 non exécutés |
| Python | 73 réussis, 0 échoué |
| Total tests unitaires/intégration Node + Python | 465 déclarés ; 440 exécutés et réussis ; 25 non exécutés |
| Taux sur tests exécutés | 100 % (440/440) ; non exécutés exclus du dénominateur |
| Chromium + Firefox | 43 contrôles par navigateur ; 86 contrôles fonctionnels, comptés séparément des tests ci-dessus |
| Syntaxe JavaScript/Python | 45/45 fichiers vérifiés |
| Copies broker distribuées | 3/3 identiques aux sources |
| OpenSpec avant archivage | 14/14 en strict, cible comprise |
| OpenSpec après archivage | 14/14 spécifications en strict |

Les 25 tests non exécutés concernent la maintenance historique sans CAB_TEST_ORIGINAL_PLUGIN, ancien paquet de référence non fourni. Le test OpenCode natif initialement optionnel a été exécuté séparément avec le binaire DEVOPS et a réussi : trois sessions et un broker source 1.10.0 dans un contexte isolé. Aucun benchmark fournisseur réel high/xhigh ni test de restitution physique LXC n'est revendiqué.

## 3. Fichiers modifiés

Inventaire final limité au périmètre source et à cette archive : **86 fichiers**, soit **69 fichiers initiaux modifiés**, **17 créés** et **0 fichier initial supprimé**. Le seul déplacement est l'archivage autorisé du change cible. Les listes et empreintes sont dans PREUVES-SCM.json. Le relevé précédant les rapports distinguait 38 alignements de version seuls par reconstruction de l'empreinte initiale ; les autres évolutions couvrent implémentation, tests, documentation et OpenSpec. Lignes ajoutées/supprimées : **N/A**, aucun diff Git inspecté.

Les sorties de qualification sous output/scm/ et captures/artefacts régénérables sous tests/runtime/ sont hors de ce compteur de sources. DEVOPS.md a été régénéré par DIU pendant la session : seul l'horodatage 08:33:52Z → 10:10:46Z a changé, identité du reste prouvée par empreinte normalisée. Cette modification externe est préservée, exclue des changements attribués à Codex. AGENTS.md est inchangé.

## 4. Commandes

Les commandes retenues et leurs codes de sortie/durées figurent dans PREUVES-SCM.json et les sorties locales indiquées. Elles comprennent les suites Node par fichier, unittest Python, Chromium/Firefox headless, le test OpenCode natif isolé, node --check, py_compile, les contrôles UTF-8/LF et parité broker, puis OpenSpec validate ciblé/global et archive. Aucun contrôle n'a été désactivé pour obtenir un résultat vert.

Archivage réellement exécuté : `/home/devops/.local/npm/bin/openspec archive add-container-test-resource-locking --yes --json`, exit 0, synchronisation des spécifications incluse ; 13 exigences ajoutées, 20 modifiées, 0 supprimée et 0 renommée. Les tâches d'implémentation et d'éligibilité sont vérifiées avant archive ; ce rapport en constitue une obligation distincte après archive. Le Purpose générique généré pour coding-model-policy a été renseigné avant validation globale finale, sans changer les exigences.

Les premiers contrôles OpenSpec de forme ont été corrigés avant les validations finales. Le premier contrôle d'empreintes a signalé la régénération externe de DEVOPS.md ; le diagnostic a prouvé la différence limitée à l'horodatage et le contrôle a ensuite réussi. Ces observations ne sont pas comptées comme refus CAB ni échecs fonctionnels persistants.

Git, publication, installation système, migration du runtime actif et propagation de prompts consommateurs : non exécutés. Les secrets ne sont ni affichés ni transmis. Seules PROJECT_NAME et PROJECT_ID ont été extraites localement de project.env selon l'exception SCM ; les variables d'accès LXC n'ont pas été lues par l'agent.

## 5. Accès web

Une invocation de recherche documentaire comportant deux requêtes a consulté les contrats publics OpenCode. Références utilisées : [API serveur](https://docs.opencode.ai/docs/server/) et [modèles/variantes](https://docs.opencode.ai/docs/models/). Nombre exhaustif de requêtes HTTP locales des fixtures et octets transférés : **N/A**, non relevés pour la session. Les appels loopback de qualification ne sont pas assimilés à des visites web externes. Aucun appel de génération à un fournisseur réel n'est revendiqué.

## 6. Synthèse globale

Les ressources Docker/LXC et navigateurs externes restent protégées jusqu'à fin des tests et restitution prouvée ; la vue Web est configurable et sa disponibilité expire après 30 minutes sans rafraîchissement réussi ; le modèle de codage suit le prompt ou la PLLM automatique avec high/xhigh/repli, prévol exact et reprise du choix conservé. Un modèle explicite incompatible reste bloquant. Les erreurs d'authentification ou de quota ne deviennent pas des preuves d'incompatibilité de raisonnement.

La portée reste celle d'un même registre CAB, avec identités canoniques et preuves examinées par l'orchestrateur. Les anciennes clés ambiguës et retours à des lecteurs incompatibles exigent une réconciliation avant activation. Les mesures absentes restent N/A. La matrice documentaire, les limites et preuves détaillées figurent dans QUALIFICATION.md et PREUVES-SCM.json. Cette clôture concerne la préparation source du seul change archivé ; elle ne prouve aucune activation des services ou fournisseurs réels.
