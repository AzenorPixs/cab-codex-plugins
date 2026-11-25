## MODIFIED Requirements

### Requirement: Republication et rétention des artefacts de forge

CAB MUST permettre de republier un artefact Docker ou Debian sous un tag de version déjà présent sur la forge et MUST conserver le tag Git existant. Cette règle s’applique aux publications manuelles et aux publications natives de livraison.

#### Scenario: Republication d’une image Docker et nettoyage

- **WHEN** CAB publie une image Docker sur Forgejo, GitHub ou GitLab
- **THEN** CAB peut remplacer le contenu de la version et de `latest`
- **AND THEN** CAB confirme les tags publiés avant d’appliquer la politique de rétention à la seule image ciblée et vérifie le résultat du nettoyage

#### Scenario: Republication d’une image Docker identique

- **WHEN** CAB confirme que le tag de version et `latest` désignent déjà l’image locale
- **THEN** CAB confirme la publication sans retransmettre l’image.

#### Scenario: Vérification du registre Docker

- **WHEN** CAB vérifie les manifestes publiés sur GitLab et que le client Docker rencontre un certificat non reconnu
- **THEN** CAB applique sa politique TLS aux lectures directes du registre configuré puis vérifie l’identité de l’image et de ses deux tags.
- **AND THEN** la politique TLS du démon Docker continue de régir le transfert d’image, et un refus expose un diagnostic sans sortie brute.

#### Scenario: Premier tag Docker absent après un échec GitLab

- **WHEN** le reçu enregistre un échec du push du tag de version avant l’envoi de `latest` et que CAB confirme l’absence du tag sur le registre accessible
- **THEN** CAB conserve le reçu initial, consigne l’échec confirmé et permet une nouvelle publication demandée par l’administrateur.

#### Scenario: Deux tags Docker absents après un push GitLab terminé

- **WHEN** le reçu de CAB indique que le push a terminé, mais que la vérification a échoué
- **THEN** CAB peut constater l’absence des deux manifestes si le registre répond pour le dépôt configuré et confirme l’absence de la version et de `latest`.
- **AND THEN** CAB conserve la tentative initiale, consigne l’échec confirmé et réautorise une nouvelle demande manuelle. Une vérification partielle ou un refus d’accès conserve la protection.
- **AND THEN** CAB autorise une série bornée de nouvelles lectures sous cette règle pour les reçus historiques qui ne l’ont jamais appliquée.

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
