# OBS07 — CAB Monitor : vue manuelle persistante, en-tête et classement

## Why

Le minuteur de fraîcheur fait vieillir les sources d'une vue volontairement figée,
ce qui remplace les états observés par des indisponibilités après quelques secondes.
Les métadonnées de collecte occupent deux lignes dans le titre et les tableaux ne
priorisent pas les changes ayant le plus de tâches cochées.

## What Changes

- Figer la fraîcheur affichée des composants et des RUN à la date du snapshot appliqué.
  Conserver l'horodatage explicite et les contrôles de fraîcheur courante des commandes.
- Déplacer dernière vue et cadence sur une ligne après l'identité du workspace.
- Trier RUN et Changes par nombre de tâches cochées décroissant, puis change
  alphabétique et identifiant RUN ; placer l'avancement inconnu en fin.
- Aligner toutes les briques CAB et leur distribution sur 1.10.4, avec cachebuster neuf.
- Vérifier, synchroniser et archiver ce seul change avec son rapport de statistiques.

## Capabilities

### Modified Capabilities
- `local-web-monitor` : snapshot affiché stable, métadonnées compactes et classement.
- `codex-integration-distribution`, `active-component-update`, `coding-model-policy`,
  `concurrent-run-coordination`, `native-session-statistics` : références de version
  courante alignées et origine de maintenance 1.10.3 conservée, sans changement métier.

## Impact

Reprise autorisée par le développeur : finaliser ce change et corriger tous les
problèmes empêchant son archivage. Le complément couvre le seul fichier
ORCHESTRATED_CODING.md du référentiel template et la synchronisation de sa copie
CAB, les clauses documentaires contradictoires de commande/skill/TECHNICAL et
leurs tests. Aucun autre consommateur, agent actif ou service n'est modifié.

Interface web, tests navigateur et références de version de la distribution.
Aucune dépendance, migration de données ou modification de protocole métier.
Aucune installation ni relance de services actifs. Retour possible aux sources
précédentes sans conversion des données ; conserver les preuves et les anciennes releases.
Périmètre validé par le développeur dans ce chat, y compris l'incrément de toutes les briques.
