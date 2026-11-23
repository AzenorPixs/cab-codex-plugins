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
Le moniteur MUST collecter les vues admises des composants locaux et les documents OpenSpec de son workspace, avec requêtes et mémoire bornées et sans collecte concurrente. Il MUST NOT créer de décision, permission, effet ou session métier. SGS et CCAB MUST être lus par leur IPC local. Les seules mutations autorisées MUST être la gestion de briques/catalogue et la suppression explicite d’une archive CAB close par le développeur, avec gardes de chemins, origine et RUN actifs.

#### Scenario: Suppression d’une copie archivée
- **WHEN** le développeur supprime une archive close identifiée
- **THEN** le moniteur supprime cette copie CAB sans toucher au rapport source, aux statistiques SGS ou aux RUN pairs

#### Scenario: Plusieurs navigateurs
- **WHEN** plusieurs navigateurs consultent le tableau de bord
- **THEN** ils partagent la collecte sans multiplier les sondes vers CAB

#### Scenario: Rangement du moniteur
- **WHEN** une ligne admissible est archivée
- **THEN** seul le catalogue privé du moniteur change

#### Scenario: Purge confirmée
- **WHEN** une ancienne confirmation de purge statistique est envoyée au moniteur2.4
- **THEN** elle est refusée sans mutation ; la suppression développeur de copies CAB reste dans ARCHIVES

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
GET /api/snapshot MUST exposer identity.workspace avec le workspace absolu
configuré, canonique au lancement CLI. Cette identité MUST rester disponible
sans contrôleur ni superviseur. Elle MUST NOT exposer de variable secrète et
sa lecture MUST rester sans effet métier.

#### Scenario: Vérification avant réutilisation
- **WHEN** `/CAB start` interroge une instance déjà active
- **THEN** il peut comparer son workspace et sa version attendus sans lire de
  fichier runtime privé

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
En mode piloté, le moniteur MUST appliquer cab-process-lifecycle à l’instance OpenCode identifiée, sans confondre panne du contrôleur/superviseur et fermeture native. En mode direct explicite, il MUST rester indépendant d’OpenCode et MUST NOT en créer ni le sonder pour décider de sa durée de vie.

#### Scenario: Moniteur direct sans OpenCode
- **WHEN** le projet utilise CAB direct et OpenCode est absent
- **THEN** le moniteur conserve ses vues SGS, CCAB et archives sans session native fictive

#### Scenario: Contrôleur seul arrêté
- **WHEN** le contrôleur tombe mais le serveur OpenCode identifié vit encore
- **THEN** le moniteur reste disponible et expose la panne

#### Scenario: Serveur OpenCode terminé
- **WHEN** la disparition de l’instance OpenCode suivie en mode piloté est prouvée localement
- **THEN** le moniteur piloté ferme ses flux et son serveur sans modifier les RUN

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

### Requirement: Projection minimale d’identité du moniteur
`GET /api/identity` MUST retourner exactement `version` et `identity.workspace`,
avec le workspace absolu canonique. La réponse MUST NOT contenir de RUN,
change, session, événement ou source amont. L’endpoint MUST rester disponible
sans contrôleur/superviseur, sans collecte, avec les gardes loopback/origine ;
les autres méthodes MUST être refusées. `/api/snapshot` et SSE MUST conserver
leur contrat multi-RUN.

#### Scenario: Bootstrap du moniteur
- **WHEN** `/CAB start` vérifie une instance de moniteur active
- **THEN** `GET /api/identity` permet de valider version et workspace sans
  transmettre au bootstrap le snapshot multi-RUN

#### Scenario: Sources amont indisponibles
- **WHEN** le contrôleur et le superviseur sont inaccessibles
- **THEN** `/api/identity` retourne toujours la version et le workspace du
  moniteur sans sonder les sources amont

#### Scenario: Requête étrangère ou méthode invalide
- **WHEN** une requête cible une origine/host interdit ou une méthode autre que GET
- **THEN** le serveur refuse la requête sans collecte ni effet métier

### Requirement: Sentinelle de cause sans blocage

Le moniteur MUST interpréter la sentinelle `NONE` comme l'absence de cause et MUST NOT la convertir en `BLOCKED`. Les causes réelles, états de readiness, pending et gates MUST garder leur effet courant.

#### Scenario: RUN sain avec cause NONE

- **WHEN** un RUN est `RESERVED`, readiness `READY`, cause `NONE`, pending nul et sans blocker
- **THEN** sa cause projetée est absente et son état opérationnel n'est pas `BLOCKED`

#### Scenario: Cause réelle conservée

- **WHEN** un RUN possède la cause réelle `resource-effects-unknown`
- **THEN** le moniteur le maintient `BLOCKED`

### Requirement: Vues fidèles des données conservées
Le WebMonitor SHALL afficher RUN directs/pilotés, Archives réelles consultables, Stats issues exclusivement de SGS et file CCAB. Les reliquats stockés SHALL être inventoriables. Le développeur MAY supprimer une archive CAB identifiée depuis l’interface sans approbation CAB supplémentaire ; les RUN en cours et chemins étrangers SHALL rester protégés.

#### Scenario: Suppression développeur
- **WHEN** le développeur supprime une archive CAB close explicitement identifiée
- **THEN** l’objet exact est supprimé et la vue reflète l’état réel sans toucher aux pairs

### Requirement: Coexistence des RUN directs et pilotés

Le moniteur MUST afficher simultanément les sessions SGS CAB directes du projet et les RUN pilotés du contrôleur. Il MUST conserver leur mode et leurs identités sans fusionner des sessions différentes, même en cas de collision d'identifiant. Une source SGS indisponible MUST être signalée et MUST NOT masquer les RUN pilotés. Le mode direct MUST rester indépendant d'OpenCode.

#### Scenario: Session directe et RUN piloté actifs
- **WHEN** SGS contient une session CAB directe du projet et que le contrôleur expose un RUN piloté
- **THEN** les deux apparaissent avec leur mode et leur identité propres

#### Scenario: SGS indisponible
- **WHEN** SGS est indisponible pendant la collecte
- **THEN** les RUN pilotés restent visibles et la source SGS est signalée indisponible

### Requirement: Observation légère des sessions directes

SGS MUST fournir une lecture locale bornée aux identités et bornes des sessions directes CAB du projet demandé, sans recalculer les événements statistiques. Le moniteur MUST utiliser cette lecture pour ses RUN directs. La vue Stats MUST continuer à provenir de SGS ; une panne de la lecture MUST rester visible sans masquer les RUN pilotés.

#### Scenario: Plusieurs sessions et projets
- **WHEN** SGS contient des sessions directes et pilotées de plusieurs projets
- **THEN** la lecture retourne uniquement les sessions directes CAB du projet demandé avec leurs bornes de fermeture

#### Scenario: Télémétrie volumineuse
- **WHEN** la télémétrie est volumineuse
- **THEN** la liste des RUN directs ne recalcule pas les événements statistiques

### Requirement: Remédiation d’une perte de connecteur MCP

CAB MUST surveiller les transitions actif vers inactif indépendamment de l’interface. CAB MUST vérifier l’identité de l’agent toujours actif avant d’agir et protéger les effets incertains. Le résultat horodaté d’une remédiation MUST figurer dans les notifications. Le succès MUST exiger un heartbeat frais, un moteur et un catalogue concordants.

#### Scenario: L’agent reste actif

- **WHEN** CAB détecte une perte persistante et confirme l’identité noyau de l’agent
- **THEN** CAB tente un contrôle natif ou une récupération bornée du moteur par son relais et publie le résultat sur preuve

#### Scenario: Une liaison saine prend déjà le relais

- **WHEN** CAB observe un seul remplaçant vivant pour le même acteur, la même instance et le même emplacement, avec un heartbeat frais, un relais, un moteur et un catalogue à la version déployée
- **THEN** CAB n’émet aucun nouveau contrôle pour l’ancienne liaison et clôt son observation comme devenue sans objet sans notification de remédiation
- **AND THEN** CAB préserve les résultats et protections des contrôles déjà engagés

#### Scenario: Effet protégé ou catalogue manquant

- **WHEN** la récupération est incertaine ou que le catalogue n’est pas observé
- **THEN** CAB conserve les protections et aucun succès n’est publié

### Requirement: Registre des binaires observés par CAB

CAB MUST stocker le PID, le compte, le chemin et l’état des binaires suivis. Un arrêt MUST conserver la ligne jusqu’au prochain démarrage normal. CAB MUST conserver les lignes pendant un démarrage corrélé à une mise à jour du paquet en cours.

#### Scenario: Démarrage normal et mise à jour

- **WHEN** CAB démarre sans reçu de mise à jour applicable à sa version
- **THEN** il vide le registre avant la première observation
- **AND THEN** il préserve les lignes si le démarrage correspond à une transaction de mise à jour vérifiée

### Requirement: Catalogue confirmé avant la projection active
La projection MCP MUST publier Actif avec un heartbeat frais, un moteur vivant et un catalogue correspondant à ce moteur. Une attente de lecture de catalogue sur un moteur vivant MUST NOT déclencher une deuxième relance.

#### Scenario: Moteur relancé et catalogue manquant

- **WHEN** le moteur répond mais que le client n’a pas encore lu le catalogue
- **THEN** la projection conserve le connecteur inactif jusqu’à une preuve concordante

### Requirement: Surveillance du cluster PostgreSQL CAB

CAB MUST inscrire le processus principal du cluster local configuré dans son registre. Si CAB tourne et que ce cluster est confirmé arrêté, il MUST essayer de démarrer uniquement cette unité, une seule fois par panne. Un arrêt manuel du cluster déclenche la même surveillance. Le succès MUST être confirmé par une requête SQL.

#### Scenario: Arrêt puis disponibilité

- **WHEN** le cluster CAB précédemment prêt est confirmé arrêté
- **THEN** CAB consigne son intention et essaie une fois de démarrer son unité
- **AND THEN** CAB enregistre un résultat horodaté et le publie dans les notifications dès que la base est disponible

### Requirement: Reprise des veilles inotify internes

CAB MUST essayer une seule reconstruction d’une veille inotify Git ou statistiques dont le descripteur est devenu indisponible. Le résultat MUST être horodaté et notifié. Un échec MUST NOT déclencher une boucle.

#### Scenario: Veille noyau perdue

- **WHEN** une lecture ou une inscription des veilles révèle un échec inotify
- **THEN** CAB reconstruit une fois les descripteurs et vérifie leur lecture avant d’annoncer le succès

### Requirement: Compteurs de binaires dans Administration
La page d’accueil Administration MUST afficher un bloc Binaires à deux colonnes. Le total des binaires actifs MUST se trouver à gauche et celui des binaires inactifs à droite, avec des couleurs distinctes. Les deux totaux MUST être mis à jour via Electric à partir du registre. La projection MUST être limitée aux totaux et accessible aux administrateurs.

#### Scenario: Un binaire devient inactif
- **WHEN** le registre passe un binaire d’actif à inactif
- **THEN** les deux compteurs sont actualisés dans la page ouverte

### Requirement: Consultation des binaires actifs et inactifs
Chaque compteur MUST ouvrir l’onglet correspondant sur /administration/binaries. Le titre MUST ouvrir la page Binaires. Les tableaux MUST se mettre à jour via Electric et rester accessibles aux seuls administrateurs.

#### Scenario: Consultation des processus arrêtés
- **WHEN** un administrateur sélectionne le compteur Inactifs
- **THEN** le tableau de l’onglet Inactifs affiche les processus arrêtés du registre

### Requirement: Pagination et tri des binaires
Les onglets Actifs et Inactifs MUST afficher au plus dix binaires par page et proposer une navigation. Chaque en-tête MUST permettre un tri réversible. Les dates MUST être triées chronologiquement et les PID numériquement.

#### Scenario: Tri d’une liste paginée
- **WHEN** l’administrateur clique deux fois sur un même en-tête
- **THEN** le tri global de l’onglet inverse son ordre et le tableau affiche la première page des résultats

### Requirement: Reprise bornée des composants CAB

CAB MUST superviser la sortie de son API et d’Electric. Un mécanisme indépendant MUST surveiller l’échec du démon CAB. La reprise MUST être limitée à une tentative par panne, donner lieu à une notification horodatée et exiger une preuve de disponibilité avant succès.

#### Scenario: Sortie d’un enfant

- **WHEN** l’API CAB ou Electric s’arrête hors maintenance
- **THEN** CAB démarre une seule fois le remplaçant et vérifie sa réponse avant de le déclarer disponible

#### Scenario: Démon CAB en échec

- **WHEN** systemd constate un échec du démon
- **THEN** une unité indépendante peut le démarrer une fois et vérifier la réponse de son API
- **AND THEN** un arrêt volontaire ne déclenche pas cette reprise

### Requirement: Convergence continue des connecteurs MCP
CAB MUST compter les liaisons actives par type d’agent, tous comptes confondus, avec un maximum de une. CAB MUST vérifier que le relais, le moteur et le catalogue correspondent à la version déployée. La remédiation MUST reprendre les mécanismes admissibles avec un délai et préserver les opérations protégées et les effets incertains.

#### Scenario: Détection et résolution d’un écart
- **WHEN** un agent présente au moins deux liaisons actives ou une version non attestée
- **THEN** CAB notifie le début de la remédiation et maintient la surveillance
- **AND THEN** CAB notifie le retour après observation d’une seule liaison active et de la concordance des trois versions

#### Scenario: Reprise d’un bureau au profil de partage compatible
- **WHEN** CAB observe l’identité de l’instance graphique, un profil compatible et une installation locale vérifiée
- **THEN** CAB peut reprendre cette instance sur frontière sûre au moyen du parcours CABU, sans réinstallation
- **AND THEN** le reçu n’atteste la reprise des anciennes liaisons qu’après observation de leur arrêt et de la liaison de remplacement unique à la version cible

### Requirement: Rattachement des RUN sur le canal MCP partagé
CAB MUST associer chaque appel lié à un RUN à la session native vérifiée transportée par le client sur la liaison partagée. Les rattachements MUST rester distincts pour chaque session native. CAB MUST refuser tout contexte absent, inconnu ou divergent dans le transport partagé.

#### Scenario: Deux RUN partagent un même canal
- **WHEN** deux sessions Codex utilisent une liaison commune
- **THEN** chaque appel lié à un RUN utilise le rattachement vérifié de sa session native
- **AND THEN** un appel sans contexte vérifié ne sélectionne aucun autre RUN

### Requirement: Disponibilité de l’API avant rechargement de sa journalisation
Le démon CAB MUST attendre une réponse de son processus API avant de lui transmettre un signal de rechargement. L’API MUST charger sa configuration de journalisation pendant son démarrage.

#### Scenario: Démarrage avec processus API encore en initialisation
- **WHEN** le démon démarre et que l’API n’a pas encore répondu
- **THEN** le démon laisse l’API finir son initialisation sans lui transmettre de signal de rechargement

#### Scenario: Demande explicite après disponibilité
- **WHEN** le démon reçoit une demande de rechargement et que son processus API a confirmé sa disponibilité
- **THEN** le démon recharge sa propre journalisation et transmet la demande à l’API

### Requirement: Découverte locale de l’écoute IPv4 d’OpenCode

CAB MUST prendre en compte les sockets serveur IPv4 appartenant à l’instance OpenCode vérifiée qui acceptent une connexion sur 127.0.0.1. La sonde MUST utiliser l’adresse locale et confirmer l’identité du processus répondant avant une action de remédiation.

#### Scenario: OpenCode écoute sur toutes les interfaces IPv4

- **WHEN** l’instance OpenCode vérifiée détient une écoute sur 0.0.0.0
- **THEN** la surveillance inclut ce port pour sa sonde sur 127.0.0.1 et vérifie le PID de la réponse native
- **AND THEN** l’état MCP connecté dans CAB reste fondé sur un heartbeat CAB authentifié

### Requirement: Fabrique des artefacts de projet
Le détail d’un projet MUST exposer le lien Fabrique et sa page `/projects/<ID>/factory`. Elle MUST reprendre le menu, le titre avec séparateur et les cartes responsives des Forges. Chaque carte MUST être activée par l’indicateur Debian ou Docker du projet.

#### Scenario: Artefacts déjà générés
- **WHEN** le projet active la construction Debian ou Docker
- **THEN** CAB affiche les derniers paquets par nom et architecture ou la dernière image locale observée
- **AND THEN** les métadonnées de tous les projets sont conservées dans `project_artifacts` en PostgreSQL et réobservées en arrière-plan

#### Scenario: Génération manuelle
- **WHEN** un administrateur demande une construction pour un format activé
- **THEN** CAB met en file la fonction native correspondant au bouton et affiche son état
- **AND THEN** Debian utilise la recette déclarative et Docker le contexte et les arguments publics compatibles avec DIU
- **AND THEN** une construction manuelle ne remplace pas un artefact existant de même version dont le contenu ou la configuration diffère

#### Scenario: Construction Docker indépendante des forges
- **WHEN** une configuration locale Docker valide est lue à la mise en file, au lancement ou à l’observation
- **THEN** un réglage de forge absent, invalide ou modifié ne bloque pas ces opérations
- **AND THEN** une construction réussie pose `latest` et la version du projet sans préfixe `v` sur la même image locale
- **AND THEN** la publication versionnée reprend l’identifiant de cette image locale, sans relancer le build, et contrôle le registre de la destination choisie

#### Scenario: Nouvelle observation après succès
- **WHEN** une construction locale réussit
- **THEN** CAB observe le résultat et le rend disponible dans la Fabrique sans relancer la construction

#### Scenario: Diagnostic d’une demande ou d’une construction en échec
- **WHEN** la demande manuelle de construction est refusée ou que la tentative lancée par l’utilisateur échoue
- **THEN** la Fabrique ouvre automatiquement l’Overview du format concerné et le détail reste réouvrable depuis sa carte
- **AND THEN** l’Overview indique l’état, l’étape atteinte, les contrôles et causes disponibles et, si observé, le code de sortie
- **AND THEN** les motifs concernant la configuration publique peuvent identifier la clé et sa ligne sans publier sa valeur, une sortie brute ou des données privées

### Requirement: Artefacts attestés dans les blocs des forges distantes
CAB MUST afficher les artefacts Debian et Docker observés dans les blocs Forgejo, GitHub et GitLab seulement pour les types activés. CAB MUST conserver ces observations dans `project_forge_artifacts`, distincte de l’inventaire local, et permettre leur lecture initiale puis leur synchronisation par Electric.

#### Scenario: Rafraîchissement d’une forge
- **WHEN** CAB rafraîchit une forge
- **THEN** il lit les fichiers Debian attachés aux releases et les tags Docker attestés par le registre
- **AND THEN** la projection conserve la dernière observation si une lecture échoue et indique son indisponibilité
- **AND THEN** une modification de la projection est transmise aux clients autorisés

#### Scenario: Publication native d’artefacts locaux
- **WHEN** l’administrateur actionne le bouton d’une forge qui dispose d’artefacts locaux activés
- **THEN** CAB utilise la fonction native correspondant à la forge et le tag de version déjà confirmé à distance
- **AND THEN** CAB relit l’état distant et préserve les résultats indéterminés sans rejeu automatique

#### Scenario: Tags locaux Docker
- **WHEN** CAB fabrique une image Docker pour un projet avec une version déclarée
- **THEN** CAB pose sur cette même image le tag du projet `:latest` et le tag du projet suivi de sa version
