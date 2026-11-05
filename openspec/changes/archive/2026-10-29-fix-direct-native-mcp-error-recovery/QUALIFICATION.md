# Qualification SCM — CAB 2.1.11

## Périmètre et autorité

Le développeur a validé le périmètre 2.1.11 puis son extension à la pagination adaptative. Un seul change ; aucun RUN, transcript, service actif, cache installé ou configuration OpenCode modifié. Activation CABU et récupération réelle distinctes. Les erreurs initiales de proposition access_id vide ne sont pas attribuées à CAB : la couverture de leur récupération native directe était absente de 2.1.10.

## Provenance et récupération directe

Lecture GET filtrée des parties tool des messages C10 msg_1862070e6001MV9q56I8PLHEeF et msg_186208974001a1V7cnmqNZ7N3j, sans affichage du raisonnement. Appels directs request_validation/get_approval, executed=false, objet error de type tool.execution, native.itemId fc_ lié exactement à call_, temps créés/exécution/fin complets ordonnés.

La normalisation source reconnaît effectivement ces deux parties historiques ; empreintes natives dérivées respectives bead80e32d946537f7bfc4f50d9138cc917e7c3a0034a441b76e59cfa6a4cd6b et 62053da7a5f96ea1f1ec4c94aeb08e57ecfcb7c00cfff43a54524440f95a7f19. Cette lecture ne tente pas un retry réel ni n’émet une décision ou once.

Le banc contrôleur isolé qualifie retry direct, même RUN/job/candidate, nouvel ID de prévol, décision synthétique explicite, accès, once unique, commande /usr/bin/true, fin exit0, readiness et complete. Douze mutations restent refusées : erreur libre, item divergent, temps absent/inversé, executed vrai, session/génération divergentes, lookup absent/faux, effet supplémentaire, marqueur libre fabriqué, refus non déterministe. La voie Code Mode et ses gardes restent conservées. Les empreintes historiques restent strictes : aucune empreinte conservée n’est régénérée pour forcer une reprise ; une divergence de préfixe préexistant reste bloquante et exige une réconciliation distincte.

Le premier essai positif de fixture avait laissé request_validation running et omis la readiness finale ; il a été corrigé pour produire toutes les preuves natives exigées. Aucun critère de complete n’a été affaibli.

## Pagination

Plafond de 2 Mio inchangé ; seule une réponse trop volumineuse réduit la limite de la même page de moitié, 200/100/50/25/12/6/3/1. Pas d’avance de curseur ni de réponse partielle conservée. Les erreurs HTTP étrangères ne sont pas réessayées ; curseurs répétés/malformés, enveloppes invalides et borne 100 pages restent contrôlés. Un seul message trop grand échoue explicitement.

Tests isolés : plusieurs pages complètes, réduction au milieu d’un historique avec curseur conservé, absence de doublons, ordre seulement à la première page, message unique trop grand, erreur HTTP sans réessai et gardes de curseurs existantes. Lecture réelle PA01 GET-only avec le client source : 138 messages complets ; une tentative200 réduite à100, puis deux requêtes à curseur sans order. Aucun contenu métier ou opaque affiché. Reçu : output/scm-direct-native-recovery/pagination-native-readonly.json.

## Cohérence documentaire

| Document | État / preuve |
| --- | --- |
| Projet réel | Sources préparées 2.1.11 ; services/cache actifs 2.1.10 préservés, aucune activation. |
| AGENTS.md | Non écrit par cette session ; précision externe de régénération DEVOPS observée et prise en compte, règles de source/sécurité conservées. |
| PROJECT.md | Référence courante et section directe/pagination actualisées. |
| TECHNICAL.md | Contrats et limites de la provenance directe et des pages bornées documentés. |
| BUILD.md | Version source/distribution et séparation activation/récupération. |
| DEVOPS.md | Inchangé, inventaire DIU et chemins des outils conservés ; prompt SCM résolu exclusivement ici. |
| DEVELOPMENT_MAP.md | Entrée provisoire ciblée, code non attribué ; ACL ultérieur. |
| openspec/BATCH_CODES.md | Même correspondance provisoire, aucun code inventé. |
| README.md | Résumé de la récupération directe et de la pagination. |
| CHANGELOG.md | Entrée 2.1.11 limitée aux deux remédiations. |
| OpenSpec | Deltas transport, contrôleur et distribution validés avant code/tests. |
| Skill/plugin/commande CAB | Procédure, gardes et limites 2.1.11 ; version commune alignée. |
| ORCHESTRATED_CODING.md / template | Non écrits par cette session ; copie externe actualisée, empreinte préservée. Référence concurrent-runs.md alignée sur ses deux phrases applicables sans modifier la copie ni le template. |

## Validation et clôture

Client ciblé : 25 tests réussis. Récupération directe ciblée : 13/13. Les campagnes globales et le banc natif de régression sont exécutés ensuite sur les sources communes 2.1.11 ; aucun archivage déclaré avant leurs résultats finaux.

### État de la validation globale en attente documentaire

Campagne Node globale : 547 tests, 518 réussis, 28 ignorés, 1 échec. L’unique échec compare le protocole embarqué : ORCHESTRATED_CODING.md préexistant diverge de references/concurrent-runs.md sur l’ordre de lecture et CAISM. La référence n’a pas été modifiée par le présent correctif ; l’empreinte de la copie préservée est enregistrée dans output/scm-direct-native-recovery/protocol-before.json. L’index courant des prompts ne répertorie pas CAISM. L’amendement de ces deux phrases dans la seule référence CAB est soumis au développeur ; aucune écriture du template ou de sa copie n’est proposée.

Python global75/75 ; banc natif de régression1/1 ; OpenSpec global standard et strict17/17. L’échec documentaire n’est ni supprimé ni ignoré, et aucun succès global n’est déclaré. Archivage, statistiques d’archive et publications restent en attente de résolution et de revalidation. Les services/cache2.1.10 sont préservés.

### Reprise dans l’autorité documentaire existante

Réexamen de SCM §4 et de l’autorisation humaine : la documentation CAB nécessaire est déjà comprise dans le périmètre validé. L’attente intermédiaire n’était pas requise ; aucune validation nouvelle n’est attribuée au parent. Les deux seules phrases de references/concurrent-runs.md ont été alignées sur les règles AGENTS/protocole applicables. Le test reste inchangé et la copie ORCHESTRATED_CODING.md n’est pas écrite par cette session. La campagne globale est rejouée ensuite.

### Contrôles intermédiaires et incident de fixture

Après alignement des deux phrases, le contrôle documentaire passe. Une campagne globale suivante a atteint le délai de démarrage d’une fixture de contrôleur (scénario duplicate), avant l’exécution du cas, sans divergence fonctionnelle observée. Le cas isolé a réussi sans modification du code, du test ou de ses limites ; une campagne globale complète est rejouée pour confirmer. Aucune cause non prouvée n’est attribuée à CAB.

### Résultats finaux

Node global confirmé : 547 tests, 519 réussis, 28 ignorés, zéro échec, output/scm-direct-native-recovery/node-final-confirmed.log. Python75/75 ; banc natif1/1 ; distribution29/29 ; client25/25 ; retry direct13/13. Syntaxe55 modules JS et9 Python ; copies broker identiques. Standard et strict OpenSpec17/17 avant archivage. Le timeout isolé de fixture n’est pas reproduit dans cette campagne ; aucun test ou délai n’a été affaibli. Code identique aux empreintes contrôlées, aucun template/copie modifié. Tous les critères de réalisation/validation sont vérifiés ; clôture native et publications suivies séparément.

### Archivage

Archivage natif réussi : 2026-10-29-fix-direct-native-mcp-error-recovery. Trois capacités synchronisées, quatre exigences ajoutées et trois modifiées, aucune supprimée. Cartographie et registre ciblés actualisés sans attribuer de code. Aucun autre change archivé ; aucun réarchivage. STATISTICS.md produit selon SCM directe, sans skill de pilotage ni sonde. Les étapes Git sont exécutées après vérification du rapport.

Après archive : OpenSpec standard16/16 et strict16/16 ; concordance des 7 exigences des deltas avec les specs courantes, empreintes du code inchangées et rapport à six sections vérifiés. Aucun bilan obsolète du change à supprimer.
