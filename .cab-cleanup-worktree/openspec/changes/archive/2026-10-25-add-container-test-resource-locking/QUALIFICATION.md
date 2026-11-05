# Qualification SCM — CAB 1.10.0

État : ARCHIVÉ ET VÉRIFIÉ — préparation source 1.10.0 ; rapport STATISTIQUES.md produit et contrôlé.

## Objectif et autorisations

Session SCM directe Codex, sans agent de codage piloté ni compétence coding-session-statistics. Le développeur a validé le périmètre initial élargi au moniteur, puis demandé explicitement les navigateurs externes et la sélection PLLM automatique avec high/xhigh/repli. Il a confirmé qu'un modèle explicitement imposé incompatible reste conservé et bloque. Le cycle couvre spécification, réalisation, tests, synchronisation, archivage de ce seul change et rapport.

Version de préparation source : 1.9.0 vers 1.10.0. Ni publication, installation, migration de runtime, propagation de prompts consommateurs, action Git ni activation de fournisseur ne sont déduites de ce travail.

## Résultat fonctionnel

- Réservations Docker, LXC et navigateurs externes, atomiques et FIFO par environnement, conservées entre les commandes et après interruption. Les ressources indépendantes avancent. Le nettoyage et la vérification natifs distincts, réussis et postérieurs aux tests sont requis avant restitution. Fencing, générations, propriétaires, effets inconnus, gate, publication et purge sont protégés.
- Vue MONITOR : Manuel, 1s, 3s, 7s, 30s, 1m, 5m, 10m, 30m ; choix mémorisé et Actualiser. Les réponses automatiques déjà en vol sont écartées après passage en Manuel. La collecte serveur reste partagée.
- Carte Web : Disponible pendant 30 minutes après un rafraîchissement valide appliqué, Non observé ensuite. SSE coupé, HTTP échoué ou snapshot invalide ne prolongent pas ce délai. Les autres cartes gardent leur propre fraîcheur.
- Modèle du prompt prioritaire ; sinon PLLM automatique actuelle. Raisonnement explicite prioritaire ; sinon high, puis xhigh, puis priorité PLLM inférieure. Un modèle imposé incompatible bloque. Le prévol exact, complet et sans outils est corrélé avant armement. Les incompatibilités de raisonnement natives reconnues peuvent justifier le repli ; authentification, quota et réseau ne le justifient pas. Le choix et les preuves filtrées sont persistés et explicitement réutilisés par le superviseur.

## Validations observées

| Contrôle | État et résultat |
| --- | --- |
| Node, par fichier et sans double comptage | Exécuté et réussi : 367 réussis, 0 échoué ; 25 non exécutés |
| Python DEVOPS | Exécuté et réussi : 73 tests |
| Chromium et Firefox headless | Exécuté et réussi : 43 contrôles par navigateur, desktop/mobile ; versions 156.0.8078.47 et 153.5.1 |
| OpenCode natif isolé | Exécuté et réussi : 3 sessions, un broker source 1.10.0 ; profil temporaire et ports propres, sans LLM ni activation utilisateur |
| Syntaxe | Exécutée et réussie : 45 fichiers JavaScript/Python |
| Copies broker | Exécuté et réussi : 3/3 identiques octet pour octet aux sources |
| Encodage | Exécuté et réussi : UTF-8/LF pour les fichiers concernés |
| OpenSpec ciblé | Exécuté et réussi en strict, sans validation ignorée |
| OpenSpec global avant archivage | Exécuté et réussi : 14/14, 0 échec |
| OpenSpec global après archivage | Exécuté et réussi : 14/14 spécifications, 0 échec |
| Archivage et rapport | Exécutés et vérifiés : 13 exigences ajoutées, 20 modifiées ; rapport à six sections UTF-8/LF |
| Construction frontend/npm | Non pertinente : ressources statiques sans manifeste de construction projet ; qualification navigateur et distribution exécutées |
| Lint/types additionnels | Non disponibles dans la configuration du périmètre ; aucun outil ou paquet ajouté |
| Maintenance historique | Non exécutée : 25 tests exigent CAB_TEST_ORIGINAL_PLUGIN, ancien paquet de référence non fourni |
| Génération fournisseur high/xhigh | Non exécutée : sélection, incompatibilités et prévols sont testés par fixtures, sans secret ni appel fournisseur |
| Restitution physique LXC | Non exécutée : contrats de verrou et preuves natives testés sur fixtures ; variables d’accès LXC non lues ; seule identité non secrète du projet extraite selon SCM |

Les commandes, durées, résultats, empreintes et chemins des preuves figurent dans PREUVES-SCM.json. Les sorties brutes restent sous output/scm/add-container-test-resource-locking/ et les captures navigateur sous tests/runtime/. Les contrôles de forme OpenSpec initiaux ont été corrigés avant les validations finales ; le premier contrôle d'empreintes a signalé la régénération externe de DEVOPS.md, ensuite réconciliée sans l'écraser.

## Critères et preuves associées

| Critère | Preuve |
| --- | --- |
| Même ressource exclusive, groupe sans détention partielle, indépendance | tests/resource-coordination.test.mjs et tests/concurrent-controller.test.mjs |
| Fin des tests distincte de restitution, nettoyage échoué, reprise, anciens jetons | mêmes suites ; résultats natifs filtrés et ordre durable |
| Chromium/Firefox protégés et reprise du pair après restitution | tests de registre et tests HTTP dédiés aux deux navigateurs |
| Purge refusée si ressource non résolue | tests/test_session_reset.py |
| Neuf cadences, Manuel, préférence, réponse tardive écartée, expiration Web | tests/web-monitor-browser.mjs dans les deux navigateurs |
| high/xhigh/politique inférieure ; priorité explicite ; historique et erreurs refusés | tests/model-policy.test.mjs, tests/concurrent-controller.test.mjs |
| Prévol exact, choix immuable/persisté, reprise explicite | tests HTTP et tests/concurrent-supervisor.test.mjs |
| Paquet complet et versions cohérentes | tests/controller-service-distribution.test.mjs, tests/active-component-update.test.mjs, contrôle des copies broker |

## Matrice de cohérence documentaire

| Fichier | État et preuve |
| --- | --- |
| Projet réel | Sources 1.10.0 et tests ci-dessus ; installation active non inspectée ni modifiée. Relevé d'empreintes limité aux sources autorisées. |
| AGENTS.md | Inchangé : priorités, sécurité, OpenSpec, secrets, Git et contrôles restent applicables ; empreinte initiale conservée. |
| PROJECT.md | Mis à jour : architecture courante, environnements de test, vue Web et sélection du modèle de codage 1.10.0. |
| TECHNICAL.md | Mis à jour : routes test-resources, ordre/propriétaires/fencing, cadence, délai Web, modèle, prévol et variable publique PLLM. |
| BUILD.md | Mis à jour : jeu 1.10.0, import model-policy, impacts de lecture/repli, absence d'installation et configuration publique à prévoir lors d'un déploiement autorisé. |
| DEVOPS.md | Non écrit par SCM. Régénération DIU concurrente conservée : seul horodatage 08:33:52Z vers 10:10:46Z ; identité de contenu prouvée après normalisation de cette ligne. Outils, autorisations et navigateurs identiques. |
| README.md | Mis à jour : réservations, réglage de cadence, état Web, sélection automatique et limites source/runtime. |
| CHANGELOG.md | Entrée 1.10.0 de préparation source, comportements, compatibilité et absence d'activation ; historique 1.9.0 préservé. |
| ORCHESTRATED_CODING.md | Mis à jour : référence de coordination embarquée synchronisée et politique modèle distribuée ; aucune session pilotée lancée. |
| openspec/config.yaml | Inchangé : schéma spec-driven, aucune configuration supplémentaire nécessaire. |
| openspec/specs/ | Six capacités synchronisées ; 13 exigences ajoutées et 20 modifiées ; contrôle global final après archivage réussi, 14/14 en strict. Le Purpose de coding-model-policy a été renseigné après génération. |
| Commande, skills et références distribuées | Mis à jour : contrat de réservations, navigateurs, model-policy et installation du jeu complet ; copies de prompts consommateurs inchangées. |

## Périmètre des fichiers et compatibilité

Le relevé précédant les rapports compte 77 fichiers créés ou modifiés, dont 38 portent uniquement l'alignement de version (vérifié par reconstruction et empreinte de la version initiale), et 39 concernent code, documentation, tests ou artefacts OpenSpec. La liste exhaustive et les empreintes sont conservées dans PREUVES-SCM.json. Aucun fichier source initial n'a disparu ; le déplacement du seul change cible est réservé à son archivage autorisé.

Les réservations coordonnent les RUN d'un même registre CAB, sans verrou hôte global entre contrôleurs indépendants. Les clés Docker/LXC/navigateur sont canoniques ; une ancienne clé ambiguë est refusée et doit être réconciliée avant activation. L'état enrichi testReservations est refusé par les anciens lecteurs stricts. Un retour à un ancien contrôleur/superviseur après nouvel armement négocié n'est pas qualifié : conserver états récents et lecteurs compatibles jusqu'à réconciliation. Aucun état réel n'a été converti ou restauré.

La preuve physique de nettoyage reste examinée par l'orchestrateur depuis les commandes approuvées ; CAB ne déduit pas seul l'état Docker/LXC/navigateur des sorties ou d'un booléen. Les tests unitaires utilisant /usr/bin/true sont des simulations et ne prouvent pas un nettoyage réel.

OC_Codex_PLLM_CATALOG doit être résolu vers le catalogue public du skill actif lors de l'installation autorisée. Les anciens contrats sans pllm-auto-v1 restent historiques. Une politique non visitée par active exige son évaluation actuelle avant repli. Ni quota, performance high/xhigh ni autorisation de transmettre du contenu ne sont inventés.

## Sources de contrat

Le [serveur OpenCode](https://docs.opencode.ai/docs/server/) décrit les messages et fournisseurs ; les [variantes OpenCode](https://docs.opencode.ai/docs/models/) distinguent leurs capacités par modèle. Ces références et le skill PLLM actif ont servi au contrat ; elles ne prouvent aucune génération fournisseur dans cette session SCM.

## Clôture

Archivage réussi sous 2026-10-25-add-container-test-resource-locking, spécifications synchronisées, contrôle global strict 14/14 réussi et STATISTIQUES.md vérifié : six sections, UTF-8/LF et totaux cohérents. Inventaire final : 86 fichiers (69 modifiés, 17 créés, aucune suppression initiale). Aucun gate CAB réel n'est émis dans cette session SCM directe. Les 25 tests historiques non exécutés restent explicitement distincts du succès des 440 tests exécutés.
