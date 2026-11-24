## ADDED Requirements

### Requirement: Conservation des manifestes OCI dans la rétention Forgejo

CAB MUST exclure les entrées de paquet Forgejo adressées par empreinte de la rétention des tags Docker. Il MUST conserver la validation des tags, l’isolement par image et la confirmation avant suppression.

#### Scenario: Inventaire Forgejo comportant des manifestes OCI

- **WHEN** l’inventaire mélange les tags Docker et des versions nommées sha256 suivies de leur empreinte
- **THEN** CAB peut retirer les seuls anciens tags et ne supprime aucune entrée adressée par empreinte.

#### Scenario: Reçu historique rejeté par l’inventaire Forgejo

- **WHEN** une publication exclusivement Docker Forgejo a émis un effet et reste UNKNOWN pour réponse de forge invalide sans détail, et l'administration vérifie les tags et l'image attendue selon le contrat de réconciliation
- **THEN** CAB consigne la confirmation observée sur le même reçu, conserve l'état initial et libère la protection sans push ni nettoyage.
