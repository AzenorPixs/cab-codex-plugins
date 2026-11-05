# Conception

## Vue et fraîcheur

`isStale` calcule la fraîcheur d'affichage à `model.generatedAt` plutôt qu'à
l'horloge courante. Les données, états, métriques, surbrillances et détails sont
ainsi une observation datée cohérente jusqu'à l'application du prochain snapshot.
Une source déjà périmée ou indisponible dans ce snapshot reste signalée comme telle.
La carte Web garde son horloge réelle et son expiration de trente minutes.

Les boutons de gestion utilisent séparément la fraîcheur à l'horloge réelle.
La disponibilité affichée passée ne constitue aucune autorisation courante.
Les gardes serveur demeurent l'autorité ; aucune permission ni commande n'est créée.

## En-tête

Déplacer `updated` et `cadence` de la zone hero à un groupe inline suivant le
breadcrumb. Garder les contrôles Actualisation/Actualiser dans le hero. Sur petit
écran, permettre un défilement local de la ligne sans débordement du document.

## Classement

Trier une copie filtrée, sans muter le snapshot. Pour chaque RUN, résoudre le
progress du change lié. Comparer le nombre absolu completed décroissant (pas le
pourcentage), puis changeId avec la collation française et enfin runId. Un
avancement indisponible reste inconnu et vient après les valeurs connues, y
compris zéro. Conserver sélection, filtres et navigation.

## Version et compatibilité

Mettre les déclarations des quatre briques, modules, copies broker, manifeste,
commande, unités et supports courants en 1.10.4. Conserver les versions historiques
qualifiées et ajouter explicitement 1.10.3 aux origines broker admises par la
maintenance ; les autres gardes restent inchangées. Ne modifier aucune archive,
configuration privée, copie ORCHESTRATED_CODING.md ou installation active.

## Vérifications

Trois unités indépendantes : en-tête, persistance manuelle, classement ; contrôle
navigateur ciblé après chacune. L'alignement de version constitue un lot indivisible
car les imports refusent les versions mixtes. Puis syntaxe, suites Node/Python,
qualification Chromium et Firefox, distribution et OpenSpec strict. Les échecs
préexistants sont documentés séparément, sans correction hors périmètre.

## Reprise autorisée pour lever les blocages d'archivage

Le développeur autorise ensuite la correction de tous les blocages identifiés.
Le référentiel template reçoit le bootstrap, le catalogue d'étapes et le bloc
resource-scoped-v1 courant en préservant les clauses génériques et la clôture
ciblée. Sa copie CAB est synchronisée à l'identique. La politique PLLM déjà
présente dans template (fraîcheur au démarrage seulement, conservation du choix,
absence de réessai automatique sans modèle admissible) remplace les consignes
contradictoires de commande et skill CAB. Le test vérifie ses invariants, l'absence
de l'ancienne boucle automatique et l'identité de la section dans les trois
supports ; il ne désactive aucun contrôle pour obtenir un résultat vert.

Les preuves Python, navigateur et deux UID restent valables si leurs sources
et scénarios n'ont pas changé. Le contrôle documentaire ciblé est exécuté avant
le rejeu Node global et la vérification finale OpenSpec/documentaire.
