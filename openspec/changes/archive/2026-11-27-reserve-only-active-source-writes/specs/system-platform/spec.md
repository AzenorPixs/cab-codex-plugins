## MODIFIED Requirements

### Requirement: Index Git isolé par session
CAB MUST lier chaque connexion MCP à son RUN natif vérifié et refuser toute opération Git demandée pour un autre RUN. Les sessions MUST réserver les fichiers auprès de CAB avant modification ; CAB MUST refuser les réservations concurrentes sur un même chemin. CAB MUST gérer un index isolé par session et refuser l'indexation d'un fichier dont l'attribution ou l'état est incertain.

#### Scenario: Restitution d’une écriture avant qualification
- **WHEN** le codeur termine l’écriture d’un fichier de source réservé
- **THEN** CAB conserve son empreinte et restitue le bail aussitôt
- **AND** l’indexation ultérieure exige une qualification de la révision et des octets identiques à la preuve d’écriture

#### Scenario: Tests et lectures des sources
- **WHEN** un agent lit des fichiers du projet, y compris lors d’un test local
- **THEN** il ne réserve aucun fichier du projet et lit l’arbre projet en lecture seule dans le sandbox
- **AND** les nouveaux fichiers de test restent sous `/tmp`, ou dans le banc Debian 13 Docker ou LXC retenu si la vérification locale ne suffit pas
- **AND** les fichiers de test sont exclus des réservations et de l’indexation effectuées par CAB

#### Scenario: Échéance du verrou d’écriture
- **WHEN** un verrou d’écriture reste actif
- **THEN** CAB avertit le propriétaire une minute avant l’échéance de cinq minutes
- **AND** CAB notifie la restitution, immédiate à la fin de l’écriture ou automatique à l’échéance, sous réserve d’un effet actif ou indéterminé à réconcilier

#### Scenario: Deux sessions et fichier partagé
- **WHEN** deux sessions préparent des fichiers distincts ou revendiquent un même fichier
- **THEN** leurs index restent distincts et CAB refuse une attribution concurrente ambiguë.
- **AND** cette protection coopérative ne bloque pas un éditeur extérieur au protocole.

#### Scenario: Archivage du change
- **WHEN** le change est archivé avant la fin de sa livraison
- **THEN** CAB conserve les index encore nécessaires et leurs preuves jusqu'au résultat confirmé.

#### Scenario: Préservation des objets de session
- **WHEN** une étape validée est indexée
- **THEN** CAB protège l'arbre Git et son commit de base par des références internes non publiées, jusqu'à confirmation de la livraison et retrait contrôlé de l'index.
