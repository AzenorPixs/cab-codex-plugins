# Conception

## Contrôle et configuration

La configuration est résolue une fois au démarrage, avant création du registre, ouverture HTTP ou lancement de Codex. Le nom principal présent prévaut sur l'alias, même si sa valeur est invalide. Seule l'absence des deux noms sélectionne 16 384. La syntaxe acceptée est une suite non vide de chiffres ASCII représentant un entier positif sûr JavaScript ; zéro, vide, espaces, signes, fraction, notation exponentielle et dépassement numérique sont refusés. Le diagnostic nomme la variable sans restituer sa valeur.

Le module de contexte expose le contrôle partagé, utilisé par le routage avant `prepareOperation`/`claimRequest` et par `approvedOperation`. Le contrôleur transmet la même limite à tous les contextes. Les routes `/validation/request`, `/validation/reminder`, leurs alias resource et leurs formes `/runs/<runId>/...` sont couvertes.

Le comptage reste `String.length` (unités UTF-16). Une longueur égale à la limite est admise. La commande n'est ni tronquée, ni réécrite, ni normalisée par ce contrôle. Le corps HTTP reste limité séparément à 256 KiB.

## Refus

Un dépassement retourne HTTP 400 avec `error=command-too-long`, `message`, `maxLength`, `actualLength` et `unit=utf16`. Le message est construit uniquement à partir des longueurs. Aucun enregistrement d'opération, appropriation de requestId, validation, décision, permission ou tour Codex ne résulte du refus. Le traitement des autres erreurs reste inchangé.

Le broker ne lit qu'un corps d'erreur borné et n'accepte que le code connu, l'unité connue et des longueurs entières cohérentes avec les bornes JavaScript. Il reconstruit son diagnostic depuis ces seuls champs ; il ne copie ni message distant ni champ supplémentaire. Corps invalide, excessif, illisible ou autre erreur : diagnostic HTTP générique conservé. Le résultat reste un échec de notification et la demande reste PENDING selon le cycle existant.

## Compatibilité et validation

Le défaut élargi est le seul changement d'admission recherché. Le seuil 2 000 est configurable pour revenir au comportement précédent. Les commandes strictes restent exactes et une décision ne couvre qu'une permission once. Les formes d'instrumentation déjà admises hors mode strict ne sont pas étendues.

Les tests utilisent exclusivement des transports simulés et des workspaces temporaires. Ils couvrent L−1/L/L+1, défaut/alias/priorité/configurations invalides, Unicode BMP/hors BMP, demandes/rappels historiques et par RUN, absence d'enregistrement au refus, diagnostic filtré broker et commande longue avec permission exacte consommée une fois. Les suites de configuration, concurrence, récupération et corrélation existantes servent de régression.

## Cohérence documentaire

`TECHNICAL.md` section 15 et `README.md` rubrique contrôleur documentent la variable, l'unité, les bornes et le refus. `CHANGELOG.md` reçoit une entrée Unreleased. `AGENTS.md` (règles), `PROJECT.md` (architecture), `BUILD.md` (distribution) et `DEVOPS.md` (environnement) ne nécessitent aucune modification : ni règle, architecture, ressource distribuée, dépendance ou environnement supplémentaire.

## Alignement 1.4.0 et protocole embarqué

La livraison incrémente toutes les versions de base de 0.1.0 : 1.3.0 devient 1.4.0. Le manifeste reçoit un nouveau cachebuster, les unités et supports sans version propre sont rattachés à la release. Les schémas de données et resource-scoped-v1 restent inchangés. Les exigences de version courante sont mises à jour par deltas ; les archives et entrées historiques du changelog sont conservées. PROJECT et BUILD sont actualisés pour leur version de référence. Le bloc de concurrence de ORCHESTRATED_CODING est remplacé uniquement entre son titre et son marqueur de fin par la référence distribuée avec titres décalés de deux niveaux.

## Opération déjà consommée

transmitApprovedOperation vérifie operationConsumed et operationInvalidated avant operationAllowed. L’admission historique peut persister une trace ; elle ne doit pas être appelée pour une opération qui ne peut plus être exécutée. Le test maintient le contrôleur actif et observe au moins trois sondages après réconciliation/libération, puis vérifie trace active vide, réservation suivante et une seule permission. Aucun délai de production ni règle de reprise n’est modifié.
