## ADDED Requirements

### Requirement: Diagnostic de transport de l’authentification des forges

CAB MUST afficher les étapes observées et les causes identifiables des erreurs de transport dans les vérifications de profil et de dépôt de GitLab, GitHub et Forgejo. Les messages MUST exclure les jetons, en-têtes, corps HTTP et détails bruts des exceptions. CAB MUST conserver la vérification TLS et un résultat indéterminé sans preuve d’authentification ou de refus.

#### Scenario: Connexion interrompue avant TLS

- **WHEN** la résolution DNS échoue ou que la connexion TCP expire
- **THEN** la console distingue les deux causes et conserve un résultat indéterminé.

#### Scenario: Erreur après ouverture de la connexion

- **WHEN** la vérification du certificat échoue ou que la forge tarde à répondre après TLS
- **THEN** la console indique l’étape TLS ou HTTP et la cause observable sans exposer de secret.

#### Scenario: Réponse de la forge

- **WHEN** la forge répond à la consultation du profil ou du dépôt
- **THEN** la console indique le statut HTTP et CAB applique les règles d’authentification existantes.
