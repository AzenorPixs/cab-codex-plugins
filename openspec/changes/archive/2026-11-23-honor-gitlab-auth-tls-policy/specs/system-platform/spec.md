## MODIFIED Requirements

### Requirement: Diagnostic de transport de l’authentification des forges

CAB MUST afficher les étapes observées et les causes identifiables des erreurs de transport dans les vérifications de profil et de dépôt de GitLab, GitHub et Forgejo. Les messages MUST exclure les jetons, en-têtes, corps HTTP et détails bruts des exceptions. CAB MUST vérifier le certificat TLS par défaut et conserver un résultat indéterminé sans preuve d’authentification ou de refus.

#### Scenario: Connexion interrompue avant TLS

- **WHEN** la résolution DNS échoue ou que la connexion TCP expire
- **THEN** la console distingue les deux causes et conserve un résultat indéterminé.

#### Scenario: Erreur après ouverture de la connexion

- **WHEN** la vérification du certificat échoue ou que la forge tarde à répondre après TLS
- **THEN** la console indique l’étape TLS ou HTTP et la cause observable sans exposer de secret.

#### Scenario: Réponse de la forge

- **WHEN** la forge répond à la consultation du profil ou du dépôt
- **THEN** la console indique le statut HTTP et CAB applique les règles d’authentification existantes.

#### Scenario: Vérification TLS GitLab explicitement désactivée

- **WHEN** `REMOTE_GITLAB_SSL_VERIFY` vaut `0`, `false` ou `no`
- **THEN** CAB accepte tout certificat sur les requêtes HTTPS d’authentification GitLab, y compris la vérification du dépôt, et la console signale que le certificat du serveur n’est pas vérifié.

#### Scenario: Changement de la politique TLS GitLab

- **WHEN** le réglage GitLab passe d’une vérification active à désactivée ou de désactivée à active
- **THEN** CAB invalide l’état mémorisé et écarte les résultats encore en cours qui relèvent de l’ancienne politique.
