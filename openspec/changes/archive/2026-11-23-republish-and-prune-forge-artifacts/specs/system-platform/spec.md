## ADDED Requirements

### Requirement: Republication et rétention des artefacts de forge

CAB MUST permettre de republier un artefact Docker ou Debian sous un tag de version déjà présent sur la forge et MUST conserver le tag Git existant. Cette règle s’applique aux publications manuelles et aux publications natives de livraison.

#### Scenario: Republication d’une image Docker et nettoyage

- **WHEN** CAB publie une image Docker sur Forgejo, GitHub ou GitLab
- **THEN** CAB peut remplacer le contenu de la version et de `latest`
- **AND THEN** CAB confirme les tags publiés avant de retirer les anciennes versions de la seule image ciblée et vérifie le résultat du nettoyage

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

- **WHEN** CAB confirme une publication Debian sur une forge prise en charge
- **THEN** CAB garde la version publiée et les six précédentes pour le même paquet et la même architecture
- **AND THEN** CAB retire les pièces jointes ou liens Debian en excédent, vérifie le résultat et conserve les autres artefacts, les releases et les tags Git
