# local-web-monitor Specification

## Purpose
Cette capacité fournit une supervision web locale indépendante du LLM pour
observer les briques CAB, les RUN, leurs changes et leur avancement documentaire.
Elle expose la configuration effective, la fraîcheur et les transitions
corrélées sans décider, relancer ou modifier le travail observé.

## Requirements

### Requirement: Serveur local indépendant
CAB Monitor MUST fonctionner sans LLM dans un processus indépendant. Il MUST servir son interface et ses API sur 127.0.0.1:8790 par défaut et accepter uniquement 127.0.0.1 ou ::1. Le port MUST être configurable et les valeurs invalides MUST refuser le démarrage avant collecte.

#### Scenario: Panne du contrôleur
- **WHEN** le contrôleur devient inaccessible
- **THEN** la page reste disponible et affiche la panne, les dernières observations et leur fraîcheur

### Requirement: Observation bornée sans effet métier
Le moniteur MUST collecter seulement les vues GET admises des composants loopback et les documents OpenSpec de son workspace. Il MUST NOT créer de décision, permission, relance, session ou mutation métier. Requêtes et mémoire MUST être bornées ; les collectes MUST NOT se chevaucher. La seule maintenance admise MUST être le relais fixe de purge statistique défini par web-statistics-retention, distinct de l’observation.

#### Scenario: Plusieurs navigateurs
- **WHEN** plusieurs navigateurs consultent le tableau de bord
- **THEN** ils partagent la collecte sans multiplier les sondes vers CAB

#### Scenario: Purge confirmée
- **WHEN** une purge historique est confirmée depuis STATS
- **THEN** le moniteur relaie uniquement l'opération statistique prévue sans accès au runtime privé ni mutation métier

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

### Requirement: Catalogue stable des étapes du RUN
Le cycle MUST définir onze noms et identifiants uniques avec une position stable. Le catalogue MUST être partagé entre contrôleur et moniteur. Une étape courante MUST NOT signifier que toutes les précédentes sont validées ni estimer le temps restant.

#### Scenario: Catalogue du cycle complet
- **WHEN** le cycle est consulté
- **THEN** il présente exactement le catalogue suivant

| Position | Identifiant | Nom |
| --- | --- | --- |
| 1/11 | INITIALIZATION | Initialisation |
| 2/11 | PREFLIGHT | Prévol |
| 3/11 | ANALYSIS | Analyse |
| 4/11 | SCOPING | Cadrage |
| 5/11 | SPECIFICATION | Spécification |
| 6/11 | IMPLEMENTATION | Implémentation |
| 7/11 | VERIFICATION | Vérifications |
| 8/11 | REVIEW | Revue |
| 9/11 | ARCHIVING | Archivage |
| 10/11 | STATISTICS | Statistiques |
| 11/11 | CLOSURE | Clôture |

### Requirement: Étape distincte de la phase et des tâches
La page MUST présenter ETAT et ÉTAPE avec nom, position et total onze. Elle MUST conserver la phase technique dans le détail du RUN et le compteur de tâches indépendant. Elle MUST montrer le cycle et les passages en détail. Une étape absente MUST rester non renseignée sans déduction depuis phase, mandat ou texte libre.

#### Scenario: Rapport en cours
- **WHEN** un RUN déclare STATISTICS et possède la phase REPORT
- **THEN** la page montre ÉTAPE Statistiques 10/11 et conserve la phase REPORT dans le détail du RUN

### Requirement: Cycle avec retours explicites
Le RUN MUST accepter les retours explicites vers une étape antérieure pendant un job non terminal et conserver leur historique. Attentes, pauses et blocages MUST rester distincts. Les étapes déjà couvertes ou non applicables MUST être signalées sans changer leur position.

#### Scenario: Correction après revue
- **WHEN** Revue 8/11 détecte une correction et le RUN déclare IMPLEMENTATION
- **THEN** la page affiche Implémentation 6/11 et conserve le passage par Revue dans l'historique

### Requirement: Versions réellement observées
La page MUST afficher les versions observées du contrôleur, superviseur, broker et OpenCode, ainsi que celle du moniteur. Chaque version MUST provenir de sa propre source. Une source inconnue MUST NOT être remplacée par la version du moniteur. Les dernières versions connues MUST conserver leur fraîcheur explicite.

#### Scenario: Composants de versions différentes
- **WHEN** contrôleur et broker annoncent 1.5.0 et le superviseur 1.4.0
- **THEN** les cartes présentent ces valeurs distinctes sans les uniformiser

#### Scenario: Version native absente
- **WHEN** la santé HTTP OpenCode ne contient pas de version
- **THEN** sa carte indique une version indisponible sans utiliser la version d'une autre brique

### Requirement: Etat opérationnel distinct du cycle
La colonne ETAT MUST regrouper l'ancien état observé et remplacer PHASE dans le tableau. Elle MUST présenter RUNNING, WAITING, PAUSED, STOPPED, BLOCKED, DEGRADED, DONE, RELEASED, IDLE ou UNKNOWN selon les observations. Une source périmée MUST donner UNKNOWN ; une attente sans blocage supérieur MUST donner WAITING sans modifier l'étape.

#### Scenario: Attente pendant implémentation
- **WHEN** un RUN déclare IMPLEMENTATION et attend une décision corrélée
- **THEN** le tableau affiche ETAT WAITING et ÉTAPE Implémentation 6/11, avec phase technique conservée dans son détail

### Requirement: Surbrillance du job selon son état
La ligne du job dans Espace de travail MUST présenter un fond jaune pour WAITING et rouge pour BLOCKED. Le texte ETAT MUST rester lisible et la sélection distincte. La couleur MUST NOT modifier l'étape ou remplacer le code d'état. Une source périmée donnant UNKNOWN MUST retirer cette surbrillance courante.

#### Scenario: Attente devenue blocage
- **WHEN** l'état actuel d'un job passe de WAITING à BLOCKED
- **THEN** sa ligne passe du jaune au rouge par mise à jour SSE, sans modifier son étape

#### Scenario: Blocage prioritaire sur une attente
- **WHEN** un job possède une demande en attente et une cause actuelle d'effets inconnus ou HUMAN_REQUIRED
- **THEN** ETAT est BLOCKED et sa ligne rouge, sans masquer le blocage sous WAITING

### Requirement: Identité publique du workspace observé
GET /api/snapshot MUST exposer identity.workspace avec le workspace absolu configuré, canonique au lancement CLI. Cette identité MUST rester disponible sans contrôleur ni superviseur. Elle MUST NOT exposer de variable secrète et sa lecture MUST rester sans effet métier.

#### Scenario: Vérification avant réutilisation
- **WHEN** /cab start interroge une instance déjà active
- **THEN** il peut comparer son workspace et sa version attendus sans lire de fichier runtime privé
