## Context

La validation standard réussit mais le mode strict refuse les longueurs.
Ces avertissements ne prouvent pas une panne fonctionnelle. Le but est de
rendre les contrats plus lisibles et vérifiables sans changer leur sens.
PROJECT.md section 11 énumère six capacités, alors que sept références existent.

## Périmètre des treize exigences

| Capacité | Exigences longues à répartir |
|---|---|
| approval-persistence | Recherches indexées pendant la récupération initiale ; Recherches indexées pendant la liste des approbations |
| approval-workflow | Demande corrélée et décision explicite |
| archive-session-statistics | Collecte auditable par spécification ; Rapport obligatoire après chaque archivage réussi |
| codex-integration-distribution | Commande de pilotage sûre |
| controller-transport | Contrat HTTP de validation ; Corrélation sûre des commandes Bash instrumentées ; Réveil corrélé de l'orchestrateur ; Contrat de supervision de job local |
| persistent-job-supervision | Compactage coordonné des deux sessions ; Contrat de job durable et non secret ; Relance technique corrélée à la session |

## Méthode validée et appliquée

- Conserver les titres existants et tous les scénarios associés ; ajouter des
  exigences nommées pour les obligations déplacées.
- Fournir dans les deltas le texte complet des exigences modifiées.
- Comparer chaque obligation d'origine avec sa destination : acteur, force
  normative, précondition, valeur, exception et preuve attendue.
- Ne pas remplacer une obligation par une simple description. Les scénarios
  déplacés restent contrôlables et leurs résultats attendus sont conservés.
- La décomposition ne change ni la commande true du test normal, ni
  /usr/bin/true du prévol de récupération, ni les cadences ou modes manuels.
- Ajouter seulement persistent-job-supervision à l'inventaire PROJECT.md,
  avec son rôle de contrat durable, gate et reprise corrélée.

## Dépendances

Le rapprochement des deltas historiques précède cette application. Ensuite,
actualiser les références et les deltas actifs concernés dans un périmètre
cohérent. Les trois correctifs documentaires et fonctionnels voisins peuvent
modifier les mêmes fichiers : relire la référence avant synchronisation et
conserver les exigences indépendantes déjà intégrées.

## Critères d'acceptation

1. Une matrice de correspondance démontre qu'aucune obligation ni exception
   ancienne n'est perdue ou renforcée implicitement.
2. Les titres restent uniques, tous les scénarios existants sont conservés et
   les mots normatifs respectent la RFC 2119.
3. Aucun texte d'exigence concerné ne dépasse la limite du validateur strict.
4. Les références et deltas actifs concernés passent OpenSpec strict sans
   nouvelle collision d'archivage.
5. L'inventaire PROJECT.md présente les sept capacités, sans modifier le
   cadrage fonctionnel ou technique.
6. Aucun code ni archive close n'est modifié ; UTF-8/LF sont préservés.

## Risques et réversibilité

Le risque principal est une perte de contexte lors du découpage. La revue
sémantique précède donc l'application, même avec validation stricte réussie.
Les modifications restent documentaires et réversibles. La synchronisation
et la clôture demandent chacune leur décision ; les archives ne sont pas
réécrites pour moderniser leur forme.

## Matrice des textes proposés

Les clauses d'origine sont conservées dans leur ordre ; seuls les espaces et
les pronoms isolés sont explicités avec leur acteur existant. Tous les scénarios
anciens restent sous leur titre initial. Les scénarios ajoutés rendent les
obligations déplacées vérifiables ; ils n'autorisent aucun nouveau comportement.
La comparaison textuelle et la revue des acteurs et scénarios ont été effectuées avant application.

| Exigence source | Destinations proposées |
|---|---|
| approval-persistence / Recherches indexées pendant la récupération initiale | Recherches indexées pendant la récupération initiale ; Recherches sans index après récupération |
| approval-persistence / Recherches indexées pendant la liste des approbations | Recherches indexées pendant la liste des approbations ; Garanties conservées par la liste indexée |
| approval-workflow / Demande corrélée et décision explicite | Demande corrélée et décision explicite ; Attente manuelle de décision corrélée |
| archive-session-statistics / Collecte auditable par spécification | Collecte auditable par spécification ; Données statistiques absentes ou tardives |
| archive-session-statistics / Rapport obligatoire après chaque archivage réussi | Rapport obligatoire après chaque archivage réussi ; Rapport individuel pour chaque archive |
| codex-integration-distribution / Commande de pilotage sûre | Commande de pilotage sûre ; Connexion MCP et création du RUN CAB ; Messagerie et reprise du même RUN CAB ; Prévol de l'identité du modèle OpenCode ; Refus d'un prévol modèle non conforme ; Source Git et migration réversible de la marketplace CAB ; Actualisation conditionnelle du plugin CAB ; Source et remplacement atomique de la commande de profil CAB ; Préservation des ressources pendant la mise à jour CAB ; Déploiement du superviseur sans démarrage ; Résumé des versions réellement observées |
| controller-transport / Contrat HTTP de validation | Contrat HTTP de validation ; Mode manuel et décision HTTP explicite |
| controller-transport / Corrélation sûre des commandes Bash instrumentées | Corrélation sûre des commandes Bash instrumentées ; Commandes strictes dans le contexte du job |
| controller-transport / Réveil corrélé de l'orchestrateur | Réveil corrélé de l'orchestrateur ; Neutralité et réveil automatique corrélé |
| controller-transport / Contrat de supervision de job local | Contrat de supervision de job local ; Statut du job et option de commandes strictes |
| persistent-job-supervision / Compactage coordonné des deux sessions | Compactage coordonné des deux sessions ; Sessions accessibles et traces du compactage commun ; Échéance suivante du compactage commun ; Preuves natives du compactage conjoint ; Continuité et réconciliation après compactage ; Compactage incomplet avec reprise sûre ; Suspension et neutralité du compactage |
| persistent-job-supervision / Contrat de job durable et non secret | Contrat de job durable et non secret ; Restauration sans jalon inventé |
| persistent-job-supervision / Relance technique corrélée à la session | Relance technique corrélée à la session ; Tentative unique et neutralité de la relance |
