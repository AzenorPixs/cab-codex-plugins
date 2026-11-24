## MODIFIED Requirements

### Requirement: Affichage du dernier artefact publié dans une carte de forge

Pour chaque format activé, CAB MUST afficher une seule ligne dans la carte de la forge, correspondant à la publication avec la date attestée la plus récente. CAB MUST conserver l'indication de dernière observation en cas d'indisponibilité.

#### Scenario: Plusieurs versions ou paquets observés

- **WHEN** la date de publication d'une image Docker ou d'un paquet Debian est postérieure à celle d'une version numériquement supérieure
- **THEN** la carte présente cette publication plus récente et sa date, sur Forgejo, GitHub et GitLab.

#### Scenario: Horodatage indisponible

- **WHEN** la forge ou une confirmation CAB liée au même artefact ne permet pas d'attester l'ordre de publication
- **THEN** CAB indique que la date n'est pas vérifiée et ne choisit pas selon le numéro de version ou l'ordre des noms.

#### Scenario: Lien Debian GitLab confirmé

- **WHEN** CAB confirme le lien d'un paquet Debian publié sur GitLab
- **THEN** CAB mémorise la date de confirmation, liée à l'identité et à la destination du lien confirmé. Une modification du lien invalide cette preuve pour le nouvel artefact.
