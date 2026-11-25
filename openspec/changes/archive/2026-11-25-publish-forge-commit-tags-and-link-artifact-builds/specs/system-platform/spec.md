## MODIFIED Requirements

### Requirement: Envoi manuel de branche vers les forges

CAB MUST afficher le bouton « Envoyer » après le rafraîchissement de chaque forge et utiliser ses identifiants chiffrés. L’aperçu MUST indiquer branche cible, commit et tags. CAB MUST envoyer atomiquement la branche et les tags manquants du commit, avec protection et vérification des références distantes. CAB MUST préserver les objets des tags annotés et refuser un tag homonyme divergent.

#### Scenario: Confirmation de l’envoi

- **WHEN** l’administrateur confirme un aperçu encore valide
- **THEN** CAB actualise la branche et publie ses tags manquants même si la branche est déjà à jour, puis vérifie les références distantes et actualise l’état de la forge.

#### Scenario: Tag divergent ou aperçu périmé

- **WHEN** un tag homonyme est divergent ou les références confirmées ont changé
- **THEN** CAB refuse l’envoi sans écraser le tag ni appliquer de changement partiel.

#### Scenario: Résultat incertain

- **WHEN** l’envoi est interrompu ou son résultat n’est pas confirmé
- **THEN** CAB signale le résultat incertain, interdit le rejeu automatique et réconcilie sur toutes les références du reçu.

### Requirement: Affichage du dernier artefact publié dans une carte de forge

Pour chaque format activé, CAB MUST afficher une seule ligne avec les tags de la publication dont la date attestée est la plus récente sur Forgejo, GitHub et GitLab. CAB MUST conserver l’indication de dernière observation en cas d’indisponibilité.

#### Scenario: Plusieurs versions ou paquets observés

- **WHEN** la date de publication d’une image Docker ou d’un paquet Debian est postérieure à celle d’une version numériquement supérieure
- **THEN** la carte présente uniquement les tags de cette publication plus récente, dont les alias Docker observés sur la même image.

#### Scenario: Construction disponible

- **WHEN** une construction réussie du même format et de la version publiée est disponible
- **THEN** les tags affichés ouvrent son détail de construction de la Fabrique, y compris pour l’alias Docker `latest` de la même image.

#### Scenario: Alias Docker observé sans chronologie attestée

- **WHEN** le registre indique le tag Docker `latest` sans permettre d’ordonner les publications
- **THEN** la carte affiche cet alias et les tags dont l’identité d’image commune est confirmée, sans déduire de numéro de version.

#### Scenario: Horodatage indisponible

- **WHEN** la forge ou une confirmation CAB liée au même artefact ne permet pas d’attester l’ordre de publication
- **THEN** CAB indique que la date n’est pas vérifiée et ne choisit pas selon le numéro de version ou l’ordre des noms.

#### Scenario: Lien Debian GitLab confirmé

- **WHEN** CAB confirme le lien d’un paquet Debian publié sur GitLab
- **THEN** CAB mémorise la date de confirmation, liée à l’identité et à la destination du lien confirmé. Une modification du lien invalide cette preuve pour le nouvel artefact.
