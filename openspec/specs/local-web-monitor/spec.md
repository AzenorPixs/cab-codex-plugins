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
Le moniteur MUST collecter seulement les vues GET admises des composants loopback et les documents OpenSpec de son workspace. Il MUST NOT créer de décision, permission, relance, session ou mutation métier de RUN. Requêtes et mémoire MUST être bornées ; les collectes MUST NOT se chevaucher. Les seules exceptions de gestion MUST être la purge statistique définie par web-statistics-retention et les commandes de briques et rangement privé définis par monitor-management.

#### Scenario: Plusieurs navigateurs
- **WHEN** plusieurs navigateurs consultent le tableau de bord
- **THEN** ils partagent la collecte sans multiplier les sondes vers CAB

#### Scenario: Rangement du moniteur
- **WHEN** une ligne admissible est archivée
- **THEN** seul le catalogue privé du moniteur change

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
Chaque source MUST publier tentative, succès et état. Hors carte Web, fraîcheur et états affichés MUST rester ceux du snapshot daté appliqué jusqu'au suivant. Une source alors inaccessible ou périmée MUST NOT paraître saine. Les commandes MUST contrôler séparément la fraîcheur courante. Transport, activité et progression MUST rester distincts. La carte Web MUST conserver son expiration de trente minutes.

#### Scenario: Vue manuelle au-delà du délai de fraîcheur
- **WHEN** une vue valide est appliquée en Manuel et le délai de fraîcheur des sources s'écoule sans nouveau snapshot appliqué
- **THEN** états observés des briques et RUN, métriques, sélection et détails restent consultables sans bascule automatique vers indisponible ou UNKNOWN ; la dernière vue reste datée et les commandes conservent leurs gardes courantes

#### Scenario: Source déjà ancienne au rafraîchissement
- **WHEN** Actualiser applique un snapshot contenant une source périmée ou inaccessible
- **THEN** la vue indique son indisponibilité ou son ancienneté sans la présenter comme saine

#### Scenario: Ancien statut nominal
- **WHEN** une source devient inaccessible après un statut READY
- **THEN** le prochain snapshot appliqué conserve l'observation comme ancienne et sa disponibilité n'est pas READY

#### Scenario: Transport perdu et récupération échouée
- **WHEN** le SSE est interrompu puis un rafraîchissement échoue ou reçoit un snapshot invalide
- **THEN** la connexion ou l'échec est signalé et les dernières observations affichées restent conservées

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
La ligne du job dans Espace de travail MUST présenter un fond jaune pour WAITING, bleu pour BLOCKED, vert pour DONE et orange pour STOPPED. Le texte ETAT MUST rester lisible et la sélection distincte. La couleur MUST NOT modifier l'étape ou remplacer le code d'état. Une source périmée donnant UNKNOWN MUST retirer cette surbrillance courante.

#### Scenario: Attente devenue blocage
- **WHEN** l'état actuel d'un job passe de WAITING à BLOCKED
- **THEN** sa ligne passe du jaune au bleu par mise à jour SSE, sans modifier son étape

#### Scenario: Blocage prioritaire sur une attente
- **WHEN** un job possède une demande en attente et une cause actuelle d'effets inconnus ou HUMAN_REQUIRED
- **THEN** ETAT est BLOCKED et sa ligne bleue, sans masquer le blocage sous WAITING

#### Scenario: Terminaison et arrêt
- **WHEN** l’état observé devient DONE ou STOPPED
- **THEN** la ligne devient respectivement verte ou orange et sa sélection reste distincte

### Requirement: Identité publique du workspace observé
GET /api/snapshot MUST exposer identity.workspace avec le workspace absolu configuré, canonique au lancement CLI. Cette identité MUST rester disponible sans contrôleur ni superviseur. Elle MUST NOT exposer de variable secrète et sa lecture MUST rester sans effet métier.

#### Scenario: Vérification avant réutilisation
- **WHEN** /cab start interroge une instance déjà active
- **THEN** il peut comparer son workspace et sa version attendus sans lire de fichier runtime privé

### Requirement: En-tête et navigation de gestion
MONITOR MUST afficher CENTRE D’OBSERVATION en grand et gras. Dernière vue et Collecte/vue MUST suivre CAB / Supervision et WORKSPACE LOCAL sur une ligne sans élargir le document. Actualisation MUST rester disponible. ARCHIVES MUST suivre MONITOR et STATS. Navigation MUST rester accessible au clavier et responsive sans interrompre SSE ni statistiques. Tout le travail., Une vue commune. et leur paragraphe MUST être absents.

#### Scenario: Métadonnées de supervision compactes
- **WHEN** MONITOR affiche un snapshot
- **THEN** dernière vue et cadence suivent l'identité du workspace sur la même ligne et ne sont plus affichées sur deux lignes dans le hero

#### Scenario: Consultation des archives
- **WHEN** ARCHIVES est sélectionné puis MONITOR
- **THEN** la page active et son libellé changent et les observations restent disponibles selon la cadence choisie

### Requirement: Cadence de la vue réglable sur la page
La page MUST proposer une liste déroulante contenant exactement Manuel, 1s, 3s, 7s, 30s, 1m, 5m, 10m et 30m, avec 1s par défaut et conservation locale du choix lorsque disponible. Elle MUST proposer Actualiser. Manuel MUST permettre seulement le chargement initial et les rafraîchissements explicites ; les snapshots SSE MUST NOT contourner cette sélection. Les autres valeurs MUST fixer la cadence de récupération de la vue sans requêtes simultanées ni modification de la collecte partagée.

#### Scenario: Actualisation manuelle
- **WHEN** Manuel est sélectionné et une nouvelle observation SSE arrive
- **THEN** la vue conserve ses données jusqu'au clic sur Actualiser

#### Scenario: Cadence mémorisée
- **WHEN** 7s est sélectionné puis la page est rechargée
- **THEN** la sélection reste 7s et la vue suit cette cadence

#### Scenario: Passage en Manuel pendant une récupération
- **WHEN** une récupération automatique se termine après sélection de Manuel
- **THEN** sa réponse ne modifie pas la vue et ne renouvelle pas la disponibilité Web

### Requirement: Disponibilité Web pendant trente minutes
La carte Web MUST afficher Disponible après un snapshot valide appliqué avec succès et pendant les 30 minutes suivantes. Elle MUST afficher Non observé si aucun succès n'existe ou dès que ce délai est atteint. Une perte SSE seule MUST NOT effacer cette disponibilité. Les échecs HTTP et observations invalides MUST NOT renouveler le délai. L'expiration MUST être visible sans nouveau rafraîchissement et MUST préserver les règles de fraîcheur des autres composants.

#### Scenario: Manuel sans refresh depuis trente minutes
- **WHEN** le dernier rafraîchissement réussi date de 30 minutes et aucune nouvelle récupération n'a réussi
- **THEN** la carte Web passe de Disponible à Non observé

#### Scenario: Nouveau relevé valide
- **WHEN** Actualiser réussit après expiration
- **THEN** la carte Web affiche Disponible et repart pour 30 minutes

### Requirement: Classement par nombre de tâches cochées
Les tableaux RUN et Changes MUST être classés par tâches cochées décroissantes, puis changeId alphabétique (collation française), puis runId. Un RUN MUST utiliser l'avancement du change lié. L'avancement inconnu MUST rester inconnu et suivre les valeurs connues, même zéro. Le tri MUST préserver filtres, sélection et snapshot source.

#### Scenario: Nombre absolu et égalités
- **WHEN** plusieurs changes ont des nombres de tâches cochées différents ou identiques
- **THEN** le plus grand nombre apparaît d'abord, indépendamment du pourcentage, et les égalités suivent l'ordre alphabétique du change dans les deux tableaux

#### Scenario: Avancement inconnu
- **WHEN** une ligne n'a pas d'avancement disponible et une autre indique zéro tâche cochée
- **THEN** la ligne connue à zéro précède la ligne inconnue sans remplacer cette dernière par zéro

### Requirement: Codes de lot explicites dans les tableaux
Le moniteur MUST afficher une colonne « codes de lot » en deuxième position des tableaux RUN et CHANGE, depuis le code du change corrélé, actif ou archivé référencé. Les tris, filtres, actions et compteurs existants MUST être préservés. Le rendu MUST rester textuel.

#### Scenario: Change portant un code
- **WHEN** le premier titre de proposal.md est « PA01 — Composition PA »
- **THEN** la deuxième cellule du change affiche PA01

#### Scenario: RUN corrélé à un change
- **WHEN** un RUN référence un change actif ou une archive référencée dont le titre porte C08
- **THEN** sa deuxième cellule affiche C08 depuis le même change

#### Scenario: Code absent ou document indisponible
- **WHEN** le titre ne porte pas de code reconnu ou proposal.md est absent ou dangereux
- **THEN** la deuxième cellule reste vide, sans tiret ni valeur inventée

#### Scenario: Mention incidente ou code dans un bloc
- **WHEN** PA01 apparaît seulement dans un bloc de code, dans le corps ou après un premier titre sans code
- **THEN** la deuxième cellule reste vide

### Requirement: Source explicite du code de lot
Le code MUST provenir du début du premier titre Markdown de niveau 1 hors blocs de code de proposal.md : 1 à 10 lettres majuscules puis 2 à 4 chiffres, ou exactement L1 ou L2, seuls ou suivis de « — », « – », « - » ou « : » et d'un intitulé. Toute source absente, dangereuse, sans titre ou sans code reconnu MUST donner une valeur vide. Le moniteur MUST NOT inférer le code depuis le dossier ou tasks.md. Les bornes et protections de lecture MUST être conservées.

#### Scenario: Formats reconnus
- **WHEN** le titre commence par PA01, PA02, C08, O26 ou B02 avec un séparateur explicite et un intitulé
- **THEN** seul ce code est extrait

#### Scenario: Absence de source admissible
- **WHEN** le document est absent, dangereux, sans titre ou sans code reconnu en tête du premier titre
- **THEN** aucun code n'est exposé

#### Scenario: Codes historiques conservés
- **WHEN** le premier titre admissible commence par exactement L1 ou L2, seul ou suivi d’un séparateur reconnu et d’un intitulé
- **THEN** le code historique est extrait à l’identique, sans renumérotation ni ajout de zéro

#### Scenario: Exception historique strictement limitée
- **WHEN** le titre porte L0, L3, PA1, un suffixe accolé à L1 ou L2, ou un code historique seulement dans le corps ou un bloc de code
- **THEN** aucun code n’est exposé depuis cette mention et les règles du premier titre admissible restent applicables

### Requirement: Fin du serveur OpenCode suivi
Le moniteur MUST appliquer cab-process-lifecycle à son serveur OpenCode local identifié. Il MUST rester indépendant d’une panne isolée du contrôleur ou du superviseur ; leur indisponibilité MUST NOT constituer une preuve de fermeture d’OpenCode.

#### Scenario: Contrôleur seul arrêté
- **WHEN** le contrôleur tombe mais le serveur OpenCode identifié vit encore
- **THEN** le moniteur reste disponible et expose la panne

#### Scenario: Serveur OpenCode terminé
- **WHEN** la disparition de l’instance OpenCode suivie est prouvée localement
- **THEN** le moniteur ferme ses flux et son serveur sans modifier les RUN

### Requirement: Projection bornée du registre pour le moniteur
CAB MUST exposer GET /monitor/runs avec au plus 200 identités de réservation, actives d’abord, total et indicateur de troncature. Cette lecture MUST NOT sérialiser historique, demandes, ressources ou corps de commandes. Le moniteur MUST utiliser cette projection sans repli vers le registre complet et conserver son plafond de 2 Mio.

#### Scenario: Registre historique volumineux
- **WHEN** le registre complet dépasse 2 Mio
- **THEN** la projection fournit les champs de navigation nécessaires sans mutation ni perte de fraîcheur due à l’historique

### Requirement: Causes bornées des pannes de source
Le moniteur MUST distinguer dépassement de taille, format invalide, erreur HTTP et timeout par des codes publics fixes. Il MUST conserver les dernières observations comme périmées, sans exposer corps ou erreur libre et sans présenter une panne comme saine.

#### Scenario: Projection trop volumineuse ou invalide
- **WHEN** la source dépasse le plafond ou retourne un format invalide
- **THEN** le snapshot indique la cause précise et conserve les anciennes observations datées
