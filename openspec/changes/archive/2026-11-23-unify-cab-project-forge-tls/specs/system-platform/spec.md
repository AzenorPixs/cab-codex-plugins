## MODIFIED Requirements

### Requirement: Cartes et suppression des métadonnées
Les cartes Forgejo, GitHub et GitLab MUST afficher les variables publiques
présentes de leur famille REMOTE respective. Un fichier absent, ambigu ou
inaccessible MUST être signalé sans contenu brut. Les variables retirées
MUST disparaître de l'instantané.

#### Scenario: Accès au dépôt distant
- **WHEN** l’URL, l’utilisateur et le dépôt d’une forge sont configurés
- **THEN** le nom de la forge ouvre le dépôt à l’adresse construite à partir de ces trois valeurs.

#### Scenario: Token dans la configuration de forge
- **WHEN** une carte Forgejo, GitHub ou GitLab est affichée
- **THEN** aucune ligne Token n’est affichée dans la carte et le token reste disponible dans la configuration de la forge.

#### Scenario: Bloc de configuration du projet
- **WHEN** la fiche d’un projet est affichée
- **THEN** le bloc « Configuration » de l’accueil affiche ID, nom, langages, publication et version depuis PostgreSQL, puis Electric.
- **AND** les langages reconnus sont représentés dans l’ordre de `PROJECT_TYPE` par des logos liés à leur site officiel ; les valeurs non reconnues restent lisibles.
- **AND** les logos Debian et Docker sont affichés lorsque leur variable vaut « Yes » et renvoient vers leurs sites officiels.

#### Scenario: Chemin d’un projet initialisé
- **WHEN** un administrateur modifie le chemin d’un projet initialisé
- **THEN** CAB le conserve uniquement dans PostgreSQL, sans écrire de variable de chemin dans `project.env`, après vérification que le nouveau dossier contient un `project.env` de contenu identique.
- **AND** la clé interne et les relations sont conservées ; le bloc est actualisé par Electric et le changement est refusé si une opération est active.

#### Scenario: Édition de la configuration du projet
- **WHEN** un administrateur ouvre le stylo du bloc « Configuration »
- **THEN** il peut modifier les six variables publiques du bloc dans `project.env` ; CAB vérifie la révision et l’unicité de l’identifiant avant d’enregistrer et synchronise PostgreSQL puis Electric.
- **AND** un changement d’identifiant actualise l’adresse canonique sans modifier la clé interne du projet.

#### Scenario: Métadonnées et cartes
- **WHEN** le fichier contient une seule forge puis la retire
- **THEN** seule sa carte est affichée puis elle disparaît

### Requirement: Rafraîchissement manuel des forges

Chaque bloc de forge MUST proposer un bouton de rafraîchissement manuel. Son icône MUST être animée pendant la vérification de cette forge, y compris lors de l’ouverture de la page et des vérifications automatiques. L’état de vérification MUST être diffusé aux pages ouvertes via PostgreSQL et Electric.

#### Scenario: Rafraîchissement demandé

- **WHEN** un utilisateur sélectionne le rafraîchissement d’une forge configurée
- **THEN** CAB vérifie son dépôt et son authentification en arrière-plan, actualise les données et arrête l’animation à la fin.

#### Scenario: Rafraîchissement GitLab et politique TLS

- **WHEN** CAB consulte le dépôt GitLab
- **THEN** CAB applique la politique TLS commune des connexions aux forges configurées.

#### Scenario: Échec d’un rafraîchissement manuel

- **WHEN** une tentative manuelle sur GitLab, GitHub ou Forgejo échoue
- **THEN** l’Overview ouvre une fenêtre avec les étapes et erreurs expurgées de cette tentative, sans nouvelle requête de rafraîchissement.
- **AND** les dernières données valides restent affichées et le diagnostic exclut les jetons, en-têtes, réponses et exceptions brutes.

#### Scenario: Rafraîchissement réussi ou automatique

- **WHEN** une tentative manuelle réussit ou que la vérification est automatique
- **THEN** l’Overview ne déclenche pas de fenêtre de diagnostic.

### Requirement: Liste publique fermée
Seuls PROJECT_ID, PROJECT_NAME, PROJECT_VERSION, PROJECT_TYPE, PROJECT_DOCKERED, PROJECT_DEBIAN_PACKAGE et les REMOTE_(FORGEJO|GITHUB|GITLAB) aux suffixes BASE_URL, OWNER, REPOSITORY, NAME, BRANCH MAY être publiés après validation. Les URL avec identifiants, requête ou fragment et les valeurs incertaines MUST être exclues. Electric et la projection publique MUST NOT contenir de secrets en clair. Seul un administrateur MAY consulter les tokens sans cache.

#### Scenario: Secrets
- **WHEN** le fichier contient un jeton ou une URL authentifiée
- **THEN** ces données ne sont ni mémorisées ni projetées

### Requirement: Diagnostic de transport de l’authentification des forges

CAB MUST afficher les étapes et les causes identifiables des erreurs de transport lors de l’authentification GitLab, GitHub et Forgejo. Les messages MUST exclure les jetons, en-têtes, corps HTTP et détails bruts des exceptions. CAB MUST conserver un résultat indéterminé sans preuve d’authentification ou de refus.

#### Scenario: Connexion interrompue avant TLS

- **WHEN** la résolution DNS échoue ou que la connexion TCP expire
- **THEN** la console distingue les deux causes et conserve un résultat indéterminé.

#### Scenario: Erreur après ouverture de la connexion

- **WHEN** la négociation TLS échoue ou que la forge tarde à répondre après TLS
- **THEN** la console indique l’étape TLS ou HTTP et la cause observable sans exposer de secret.

#### Scenario: Réponse de la forge

- **WHEN** la forge répond à la consultation du profil ou du dépôt
- **THEN** la console indique le statut HTTP et CAB applique les règles d’authentification existantes.

#### Scenario: Vérification TLS GitLab explicitement désactivée

- **WHEN** un projet GitLab contient un ancien réglage TLS à `0`, `false` ou `no`
- **THEN** CAB accepte tout certificat sur les requêtes HTTPS d’authentification GitLab, y compris la vérification du dépôt, et la console signale que le certificat du serveur n’est pas vérifié.

#### Scenario: Changement de la politique TLS GitLab

- **WHEN** CAB compare les paramètres à un résultat GitLab antérieur à la politique TLS commune
- **THEN** CAB invalide les résultats issus de l’ancienne politique avec vérification du certificat.

#### Scenario: Certificat TLS de la forge Forgejo

- **WHEN** CAB authentifie le profil ou vérifie le dépôt Forgejo par HTTPS
- **THEN** CAB accepte tout certificat, quelle que soit la valeur de `REMOTE_FORGEJO_SSL_VERIFY`, et la console signale que le certificat du serveur n’est pas vérifié.

#### Scenario: Résultat Forgejo associé à la politique TLS

- **WHEN** CAB compare les paramètres à un résultat d’authentification Forgejo mémorisé
- **THEN** CAB invalide les résultats issus de l’ancienne politique avec vérification du certificat et conserve l’état si seule la valeur de l’ancien réglage a changé.

## ADDED Requirements

### Requirement: Politique TLS des connexions CAB aux forges configurées

CAB MUST accepter tout certificat TLS lors de ses connexions HTTPS directes à GitLab, GitHub et Forgejo. CAB MUST ignorer les anciennes affectations `REMOTE_<FORGE>_SSL_VERIFY`, les exclure de la projection et les retirer du formulaire. Les connexions du démon Docker, le stockage externe et le téléchargement système CABU restent soumis à leurs politiques TLS propres.

#### Scenario: Opérations sur une forge configurée

- **WHEN** CAB vérifie l’authentification, lit le dépôt ou ses commits, prépare ou réalise un envoi Git, une synchronisation ou une publication de projet
- **THEN** CAB applique la même politique TLS aux requêtes API et Git. Les contrôles de destination, d’autorisation, d’intégrité et de références distantes restent actifs.

#### Scenario: Ancienne variable dans un projet

- **WHEN** un projet contient un ancien réglage de vérification TLS
- **THEN** sa valeur ne change ni le transport, ni le résultat mémorisé, et CAB conserve la ligne existante du fichier.

#### Scenario: Diagnostic de transport

- **WHEN** la console décrit le transport de la forge configurée
- **THEN** elle indique que le certificat du serveur n’est pas vérifié.
