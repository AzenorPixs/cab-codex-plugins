## ADDED Requirements

### Requirement: Dimensions stables du centre de notifications

Le centre de notifications MUST conserver la même taille pour une même
fenêtre de navigateur. Le contenu MUST défiler à l’intérieur lorsque sa
hauteur dépasse l’espace disponible.

#### Scenario: Navigation entre des contenus de longueur différente

- **WHEN** l’administrateur ouvre le centre ou passe à une autre notification
- **THEN** les dimensions de la popup restent identiques à fenêtre constante
- **AND** les commandes restent visibles lorsque le contenu défile
- **AND** cette taille s’applique aussi au chargement et à l’état vide

### Requirement: Purge globale des messages de notification

Le centre MUST afficher **Effacer les messages** immédiatement après la
flèche suivante. Son action MUST être autorisée aux seuls administrateurs et
supprimer les messages de `cab_notifications` pour tous les projets et pour
CAB. Les questions et les reçus existants MUST être conservés.

#### Scenario: Purge depuis le centre

- **WHEN** un administrateur active **Effacer les messages**
- **THEN** tous les messages présents à la sélection de purge sont supprimés
- **AND** l’aperçu retire les messages purgés et ceux déjà lus
- **AND** les questions restent disponibles
- **AND** les autres consommateurs reçoivent les suppressions par Electric

#### Scenario: Republication d’un message purgé

- **WHEN** un producteur republie un message purgé sous la même identité
- **THEN** CAB retourne le reçu `CLEARED` et conserve l’état de la table
