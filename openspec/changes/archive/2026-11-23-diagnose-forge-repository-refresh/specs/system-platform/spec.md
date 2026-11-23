## MODIFIED Requirements

### Requirement: Rafraîchissement manuel des forges

Chaque bloc de forge MUST proposer un bouton de rafraîchissement manuel. Son icône MUST être animée pendant la vérification de cette forge, y compris lors de l’ouverture de la page et des vérifications automatiques. L’état de vérification MUST être diffusé aux pages ouvertes via PostgreSQL et Electric.

#### Scenario: Rafraîchissement demandé

- **WHEN** un utilisateur sélectionne le rafraîchissement d’une forge configurée
- **THEN** CAB vérifie son dépôt et son authentification en arrière-plan, actualise les données et arrête l’animation à la fin.

#### Scenario: Rafraîchissement GitLab et politique TLS

- **WHEN** CAB consulte le dépôt GitLab
- **THEN** CAB applique la politique définie par `REMOTE_GITLAB_SSL_VERIFY` pour l’authentification GitLab.

#### Scenario: Échec d’un rafraîchissement manuel

- **WHEN** une tentative manuelle sur GitLab, GitHub ou Forgejo échoue
- **THEN** l’Overview ouvre une fenêtre avec les étapes et erreurs expurgées de cette tentative, sans nouvelle requête de rafraîchissement.
- **AND** les dernières données valides restent affichées et le diagnostic exclut les jetons, en-têtes, réponses et exceptions brutes.

#### Scenario: Rafraîchissement réussi ou automatique

- **WHEN** une tentative manuelle réussit ou que la vérification est automatique
- **THEN** l’Overview ne déclenche pas de fenêtre de diagnostic.
