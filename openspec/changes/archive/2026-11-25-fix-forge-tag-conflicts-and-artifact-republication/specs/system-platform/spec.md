## MODIFIED Requirements

### Requirement: Envoi manuel de branche vers les forges

CAB MUST afficher le bouton « Envoyer » après le rafraîchissement de chaque forge et utiliser ses identifiants chiffrés. L’aperçu MUST indiquer branche cible, commit et tags. CAB MUST envoyer atomiquement la branche et les tags du commit, avec protection et vérification des références distantes. CAB MUST préserver les objets des tags annotés et contrôler la valeur distante de chaque référence modifiée.

#### Scenario: Confirmation de l’envoi

- **WHEN** l’administrateur confirme un aperçu encore valide
- **THEN** CAB actualise la branche et aligne ses tags même si la branche est déjà à jour, puis vérifie les références distantes et actualise l’état de la forge.

#### Scenario: Tag distant divergent

- **WHEN** l’aperçu observe un tag homonyme sur un autre objet
- **THEN** CAB présente les deux valeurs et les aligne lors de la confirmation de l’envoi normal, sur Forgejo, GitHub et GitLab.

#### Scenario: Envoi répété avec des références identiques

- **WHEN** l’aperçu confirmé et la forge correspondent au commit et aux tags locaux
- **THEN** CAB confirme leur égalité et actualise la carte.

#### Scenario: Tag divergent ou aperçu périmé

- **WHEN** les références confirmées ont changé
- **THEN** CAB refuse l’envoi sans écraser le tag ni appliquer de changement partiel.

#### Scenario: Résultat incertain

- **WHEN** l’envoi est interrompu ou son résultat n’est pas confirmé
- **THEN** CAB signale le résultat incertain, interdit le rejeu automatique et réconcilie sur toutes les références du reçu.

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

### Requirement: Affichage du dernier artefact publié dans une carte de forge

Pour chaque format activé, CAB MUST afficher une seule ligne avec les tags de la publication dont la date attestée est la plus récente sur Forgejo, GitHub et GitLab. CAB MUST conserver l’indication de dernière observation en cas d’indisponibilité.

#### Scenario: Plusieurs versions ou paquets observés

- **WHEN** la date de publication d’une image Docker ou d’un paquet Debian est postérieure à celle d’une version numériquement supérieure
- **THEN** la carte présente uniquement les tags de cette publication plus récente, dont les alias Docker observés sur la même image.

#### Scenario: Construction disponible

- **WHEN** une construction réussie du même format et de la version publiée est disponible
- **THEN** les tags affichés ouvrent son détail de construction de la Fabrique, y compris pour l’alias Docker `latest` de la même image. Le lien reprend la présentation des liens de la colonne des valeurs.

#### Scenario: Alias Docker observé sans chronologie attestée

- **WHEN** le registre indique le tag Docker `latest` sans permettre d’ordonner les publications
- **THEN** la carte affiche cet alias et les tags dont l’identité d’image commune est confirmée, sans déduire de numéro de version.

#### Scenario: Horodatage indisponible

- **WHEN** la forge ou une confirmation CAB liée au même artefact ne permet pas d’attester l’ordre de publication
- **THEN** CAB indique que la date n’est pas vérifiée et ne choisit pas selon le numéro de version ou l’ordre des noms.

#### Scenario: Lien Debian GitLab confirmé

- **WHEN** CAB confirme le lien d’un paquet Debian publié sur GitLab
- **THEN** CAB mémorise la date de confirmation, liée à l’identité et à la destination du lien confirmé. Une modification du lien invalide cette preuve pour le nouvel artefact.
