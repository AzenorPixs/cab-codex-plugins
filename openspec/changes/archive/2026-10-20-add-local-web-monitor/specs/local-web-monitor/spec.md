## ADDED Requirements

### Requirement: Serveur local indépendant
CAB Monitor MUST fonctionner sans LLM dans un processus indépendant. Il MUST servir son interface et ses API sur 127.0.0.1:8790 par défaut et accepter uniquement 127.0.0.1 ou ::1. Le port MUST être configurable et les valeurs invalides MUST refuser le démarrage avant collecte.

#### Scenario: Panne du contrôleur
- **WHEN** le contrôleur devient inaccessible
- **THEN** la page reste disponible et affiche la panne, les dernières observations et leur fraîcheur

### Requirement: Observation bornée sans effet métier
Le moniteur MUST collecter uniquement les vues GET autorisées des composants loopback configurés et les documents OpenSpec de son workspace. Il MUST NOT créer de décision, permission, relance, session ou mutation métier. Ses requêtes et sa mémoire MUST être bornées et ses collectes MUST NOT se chevaucher.

#### Scenario: Plusieurs navigateurs
- **WHEN** plusieurs navigateurs consultent le tableau de bord
- **THEN** ils partagent la collecte sans multiplier les sondes vers CAB

### Requirement: Configuration du moniteur explicite
Le moniteur MUST utiliser OC_Codex_WORKSPACE absolu et accepter OC_Codex_MONITOR_HOST, OC_Codex_MONITOR_PORT, OC_Codex_MONITOR_POLL_INTERVAL_MS, OC_Codex_MONITOR_STALE_MS et OC_Codex_MONITOR_TIMEOUT_MS. Les défauts MUST être 127.0.0.1, 8790, 1000 ms, 10000 ms et 2000 ms. Les ports MUST être compris entre 1024 et 65535.

#### Scenario: Configuration invalide
- **WHEN** une valeur de port, cadence, délai ou adresse est invalide
- **THEN** le moniteur refuse le démarrage sans collecte ni modification des sources

### Requirement: Sources locales configurables
Le moniteur MUST accepter OC_Codex_CONTROLLER_URL, OC_Codex_SUPERVISOR_URL et OC_Codex_OPENCODE_URL, avec des bases HTTP loopback sur les ports 8788, 8789 et 4096 par défaut. Il MUST refuser identifiants intégrés, redirections et chemins arbitraires. Chaque variable de configuration MUST accepter son alias OC_CGPT_ uniquement en l'absence du nom principal.

#### Scenario: Source distante refusée
- **WHEN** une URL de source désigne une adresse non loopback
- **THEN** le moniteur refuse le démarrage sans contacter cette adresse

### Requirement: Disponibilité et fraîcheur explicites
Chaque source MUST publier la dernière tentative, le dernier succès et son état courant. Une observation périmée ou une source inaccessible MUST NOT être présentée comme preuve de santé actuelle. Les états de transport, d'activité et de progression MUST rester distincts.

#### Scenario: Ancien statut nominal
- **WHEN** une source devient inaccessible après un statut READY
- **THEN** son observation reste consultable comme ancienne et sa disponibilité actuelle n'est pas READY

### Requirement: RUN et changes corrélés
La page MUST présenter les RUN et leurs changes, session, phase observée, mandat, jalon, attentes et gate selon les données disponibles. Les identités MUST rester corrélées au RUN et au change. Les causes inconnues MUST rester inconnues.

#### Scenario: Deux RUN indépendants
- **WHEN** A attend une ressource et B progresse
- **THEN** la page distingue les deux états et expose le blocage de A sans l'attribuer à B

### Requirement: Avancement documentaire vérifiable
Le moniteur MUST calculer X/Y à partir des cases de tâches Markdown de tasks.md du change, en ignorant les blocs de code. Il MUST montrer les tâches et distinguer ce compteur de la phase et du gate du RUN. Le total MUST être dynamique ; une source absente MUST rester indisponible. Il MUST NOT déduire un temps restant ou une validation métier des seules cases cochées.

#### Scenario: Trois tâches cochées sur quatorze
- **WHEN** tasks.md contient quatorze tâches dont trois cochées
- **THEN** la page indique 3/14 tâches cochées sans déclarer le RUN terminé

#### Scenario: Document dangereux ou absent
- **WHEN** le change est absent ou sa lecture exigerait un lien symbolique ou une sortie du dossier autorisé
- **THEN** le moniteur indique l'indisponibilité sans suivre ce chemin

### Requirement: Actualisation temps réel et interface moderne
Le serveur MUST fournir un snapshot initial et un flux SSE multiplexé. La page MUST se réconcilier après reconnexion, afficher son état de connexion et proposer filtres, détail de RUN et chronologie horodatée. Elle MUST être responsive, utiliser des ressources locales et rendre les données comme texte sans exécution HTML.

#### Scenario: Reconnexion du navigateur
- **WHEN** le flux SSE est interrompu puis rétabli
- **THEN** la page reçoit un snapshot actuel, signale la connexion et ne rejoue aucune opération métier

### Requirement: Couverture de chronologie explicite
La chronologie MUST conserver uniquement des événements filtrés bornés avec type, date et identifiants. Sa couverture, ses redémarrages et ses troncatures MUST être observables. Elle MUST NOT afficher de corps de message, commande, sortie brute ou secret.

#### Scenario: Redémarrage de source
- **WHEN** le contrôleur redémarre et son journal en mémoire change d'identité
- **THEN** le moniteur rend la rupture de couverture visible sans inventer les événements absents

### Requirement: Configuration effective visible
La page MUST afficher la longueur maximale effective des commandes du contrôleur en unités UTF-16, avec 16 384 comme défaut documenté. Une valeur absente MUST être affichée comme indisponible et MUST NOT être remplacée par le défaut supposé.

#### Scenario: Limite personnalisée
- **WHEN** le contrôleur annonce une limite effective de 2000
- **THEN** la page affiche 2000 unités UTF-16 et conserve 16 384 comme simple référence de défaut
