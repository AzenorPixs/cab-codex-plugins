## ADDED Requirements

### Requirement: Présentation des réglages dans l’éditeur de projet

L’éditeur de projet MUST afficher les réglages dans une grille compacte à deux
colonnes de même largeur sur écran large, et une seule colonne sur écran étroit.
Chaque nom de variable MUST rester accolé à son champ.

#### Scenario: Édition des politiques de rétention

- **WHEN** un administrateur ouvre l’éditeur d’un projet
- **THEN** les deux champs de rétention sont disponibles avec un défaut de `0`
- **AND** une politique invalide est refusée à l’enregistrement

## MODIFIED Requirements

### Requirement: Republication et rétention des artefacts de forge

CAB MUST permettre de republier un artefact Docker ou Debian sous un tag de version déjà présent sur la forge et MUST conserver le tag Git existant. Cette règle s’applique aux publications manuelles et aux publications natives de livraison.

#### Scenario: Republication d’une image Docker et nettoyage

- **WHEN** CAB publie une image Docker sur Forgejo, GitHub ou GitLab
- **THEN** CAB peut remplacer le contenu de la version et de `latest`
- **AND THEN** CAB confirme les tags publiés avant d’appliquer la politique de rétention à la seule image ciblée et vérifie le résultat du nettoyage

#### Scenario: Publication Docker incomplète

- **WHEN** un envoi ou la confirmation d’un tag échoue
- **THEN** CAB laisse les anciennes versions en place et signale l’échec dans le reçu

#### Scenario: Suppression limitée ou incertaine

- **WHEN** la forge refuse une suppression, que son résultat reste incertain ou qu’un ancien alias GitHub partage une version conservée
- **THEN** CAB protège les tags publiés, expose la limite ou l’échec dans le reçu et conserve la protection des effets indéterminés

#### Scenario: Republication d’un paquet Debian

- **WHEN** un paquet du même nom est déjà attaché à la release du tag
- **THEN** CAB assure la disponibilité du paquet publié sous ce nom et préserve les autres pièces jointes

#### Scenario: Rétention des sept publications Debian

- **WHEN** CAB confirme une publication Debian avec `PROJECT_DEBIAN_RETENTION=7`
- **THEN** CAB garde la version publiée et les six précédentes du même paquet et de la même architecture
- **AND THEN** CAB retire les pièces jointes ou liens Debian en excédent et vérifie le résultat

#### Scenario: Politique de rétention par format

- **WHEN** CAB confirme une publication manuelle ou automatique
- **THEN** CAB applique `PROJECT_DEBIAN_RETENTION` par nom de paquet et architecture et `PROJECT_DOCKER_RETENTION` par image, sur la forge de publication
- **AND** une valeur absente, vide ou égale à `0` désactive le nettoyage
- **AND** CAB conserve les releases, tags Git et artefacts d’autres séries
- **AND** la version publiée est toujours conservée et l’alias Docker `latest` ne compte pas comme une version supplémentaire

#### Scenario: Garanties de nombre et de durée cumulées

- **WHEN** la politique vaut `N`, `JD` ou `N,JD` pour des entiers non négatifs
- **THEN** CAB conserve l’union des N versions les plus récentes, publication courante comprise, et des versions âgées d’au plus J jours selon les composantes présentes
- **AND** `0,700D` applique uniquement la garantie de 700 jours
- **AND** les artefacts à date inconnue sont conservés lorsqu’une durée est appliquée
