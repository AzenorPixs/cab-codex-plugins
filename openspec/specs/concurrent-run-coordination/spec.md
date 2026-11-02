# concurrent-run-coordination Specification

## Purpose
Coordonner plusieurs RUN pilotés dans un contexte OpenCode commun : attribuer exclusivement les changes, contrôler les ressources et dépendances, isoler permissions et reprises, puis sérialiser une publication réconciliée sans décision implicite.

## Requirements

### Requirement: Réservation atomique exclusive
CAB MUST attribuer un change et sa clé de sélection à un seul RUN avant
préparation ou implémentation. L'attribution MUST être durable avant réponse
et corrélée au projet, à l'orchestrateur et à la session native. Deux
sélections simultanées MUST produire au plus une réservation admise.

#### Scenario: Sélection concurrente
- **WHEN** deux RUN demandent le même change ou la même clé de sélection
- **THEN** une demande est admise et l'autre reçoit un conflit sans effet

### Requirement: Ressources et dépendances compatibles
CAB MUST distinguer périmètre déclaré et accès actif. Des périmètres recouvrants MUST pouvoir être admis avec verrous temporaires compatibles. Les dépendances actives ou inconnues MUST différer l'admission. Codex MUST examiner les dépendances sémantiques sans déduire l'indépendance des seuls chemins.

#### Scenario: Contrat partagé
- **WHEN** A modifie un contrat et B veut lire ce contrat
- **THEN** B attend sur ce contrat jusqu'à la frontière cohérente sans suspendre un RUN indépendant

#### Scenario: Périmètres communs sans effet simultané
- **WHEN** A et B déclarent un même fichier sans dépendance bloquante
- **THEN** leurs changes peuvent être réservés et leurs accès sont coordonnés au moment de l'opération

### Requirement: Propriétaire durable et génération
CAB MUST conserver réservation et protections après interruption. Chaque évolution MUST contrôler la génération attendue. Un jeton libéré ou une ancienne génération MUST NOT autoriser une permission. Un délai seul MUST NOT libérer ni transférer une protection.

#### Scenario: Reprise après crash
- **WHEN** le contrôleur redémarre avec une réservation et une acquisition persistées
- **THEN** il les conserve et exige une réconciliation avant toute nouvelle permission

### Requirement: Couverture des mandats
Chaque mandat MUST rester dans le périmètre déclaré et disposer d'un accès compatible avant once. Une commande MUST déclarer lectures, écritures et ressources logiques ; CAB MUST NOT deviner ses effets shell. CAB MUST vérifier session, racine, RUN, change, génération et opération. Réservation et verrou MUST NOT constituer une approbation.

#### Scenario: Extension non admise
- **WHEN** un mandat vise un fichier hors périmètre ou une ancienne génération
- **THEN** CAB refuse la permission native sans étendre implicitement le périmètre

#### Scenario: Ressource partagée non acquise
- **WHEN** une opération approuvée ne détient pas son ensemble de verrous
- **THEN** aucune permission once n'est consommée

### Requirement: Clôture et exclusion d'intégration
La publication MUST protéger ses ressources et vérifier les révisions des preuves applicables sans exclusion globale ordinaire. La réservation du change MUST rester conservée jusqu'à livraison et rapport vérifiés ou abandon réconcilié. Une absence de candidat disponible MUST NOT prouver la fin globale.

#### Scenario: Autres RUN actifs
- **WHEN** les candidats restants dépendent d'un autre RUN actif
- **THEN** CISMP attend sans déclarer le projet terminé

#### Scenario: Publication indépendante
- **WHEN** A publie sur un périmètre indépendant de B
- **THEN** B poursuit sans jalon stable de cohorte ni réconciliation imposée par la seule séquence globale

### Requirement: Infrastructure partagée protégée
Le profil concurrent MUST conserver un seul broker MCP stdio dans le contexte OpenCode commun. Créer, reprendre ou arrêter un RUN MUST NOT purger ni interrompre les pairs. Une intervention commune MUST suivre le protocole exceptionnel global et préserver les preuves et protections des RUN.

#### Scenario: Deuxième RUN
- **WHEN** un second RUN rejoint une infrastructure saine
- **THEN** il obtient son contexte sans purge ni reconnexion du broker commun

### Requirement: Barrière stable du répertoire partagé
Les validations et publications MUST protéger leurs entrées, effets et dépendances déclarés par des accès compatibles. Seuls les accès incompatibles MUST attendre. Une modification MUST invalider les preuves affectées, sans imposer la quiescence de tous les RUN. REPORT MUST rester limité au rapport propre au change.

#### Scenario: Validation globale et publication
- **WHEN** A valide puis publie pendant que B travaille sur des ressources indépendantes
- **THEN** B continue et A vérifie les révisions couvertes par ses preuves avant publication

#### Scenario: Rapport natif en cours
- **WHEN** A publie pendant que B écrit un rapport indépendant
- **THEN** le rapport de B continue sans attendre une exclusion d'intégration générale

### Requirement: Prompts pilotés cohérents
Les prompts pilotés des projets inventoriés MUST utiliser le protocole 1.10.5 et un checkpoint par RUN lors de leur déploiement autorisé. Les sous-jobs MUST hériter du RUN parent. CISM, CAISM et les prompts directs MUST rester inchangés et hors concurrence pilotée. La préparation source MUST NOT propager ces changements.

#### Scenario: Sous-job CISMP
- **WHEN** CISMP appelle SPCMP ou ISMP avec plusieurs changes présents
- **THEN** le sous-job traite le change réservé et les accès de son RUN parent

### Requirement: File équitable d'intégration
L'attente d'une opération MUST être durable, idempotente et FIFO entre demandes incompatibles. Une demande indépendante MUST pouvoir avancer. Une annulation MUST être explicite sans libérer un effet commencé. La file historique globale MUST NOT suspendre les pairs dans le profil 1.10.5.

#### Scenario: Deux demandes et publication
- **WHEN** A puis B demandent une même ressource pour publier
- **THEN** A précède B tandis qu'une demande indépendante de C peut avancer

#### Scenario: Écrivain et lecteurs nouveaux
- **WHEN** un écrivain attend avant l'arrivée de nouvelles lectures incompatibles
- **THEN** ces lectures ne le dépassent pas

### Requirement: Réduction contrôlée des ressources
Un RUN MUST pouvoir réduire son périmètre à une frontière sûre avec preuves et génération courante. La nouvelle portée MUST être incluse dans l'ancienne sans escalade read vers write. La génération MUST changer ; les protections d'un effet non résolu et l'obligation de publication MUST survivre à la réduction.

#### Scenario: Retrait d'une lecture globale
- **WHEN** un RUN n'a plus besoin d'une lecture étendue et n'a aucun effet concerné en attente
- **THEN** il retire cette portée sans invalider les accès indépendants des pairs

### Requirement: Phase documentaire après publication
Après publication prouvée, un RUN MUST pouvoir entrer irréversiblement en REPORT, limité au STATISTICS.md de son archive. Les autres protections MUST être libérées seulement après preuve de fin. Rapport vérifié et gate TERMINÉ MUST rester requis avant livraison.

#### Scenario: Rapport préparé pendant la reprise du pair
- **WHEN** A entre en closing après publication tandis que B poursuit son travail indépendant
- **THEN** A ne peut plus modifier son code et prépare son seul rapport sans gel général

### Requirement: Isolation de la phase documentaire
Les mandats documentaires MUST respecter permissions explicites et accès compatibles. Ils MUST NOT permettre une extension métier. Une publication indépendante MUST NOT invalider la publication figée du change en REPORT. Un gel exceptionnel applicable MUST suspendre les nouvelles opérations documentaires.

#### Scenario: Publication d'un pair pendant closing
- **WHEN** B publie pendant que A finalise un rapport indépendant
- **THEN** A conserve sa publication et peut écrire son rapport sous permission corrélée

#### Scenario: Pause globale pendant closing
- **WHEN** une pause globale explicite est en drainage
- **THEN** aucune nouvelle opération documentaire n'est admise

### Requirement: Fenêtre critique minimale
Les protections temporaires MUST couvrir la seule opération ou le groupe cohérent annoncé et ses effets prouvés. Préparation et attente humaine MUST éviter de conserver inutilement une écriture exclusive. Un effet inconnu MUST conserver ses protections sans libération automatique ni extension globale implicite.

#### Scenario: Rapport après publication
- **WHEN** la publication et ses effets sont prouvés
- **THEN** les protections métier sont libérées avant le rapport sans supprimer rapport ni gate

### Requirement: Publication et phase documentaire atomiques
CAB MUST proposer une transition publiée atomique vers REPORT avec génération, révisions attendues, preuves et cible vérifiées. Séquence de publication, reçu, portée documentaire et libération sûre MUST être persistés ensemble. Les anciennes routes incompatibles MUST être refusées sans effet dans le profil 1.10.5.

#### Scenario: Publication concurrente suivante
- **WHEN** A termine la publication atomique et B publie indépendamment
- **THEN** A est déjà limité à son rapport et les anciens jetons de A sont invalides

### Requirement: Reçu de publication idempotent
Une transaction identifiée MUST restituer son reçu durable sans nouvel effet
pour un contenu identique, y compris après reprise. Un contenu divergent MUST
être refusé. Le reçu MUST rester distinct d'une décision et du gate terminal.

#### Scenario: Réponse perdue puis reprise
- **WHEN** une publication réussie est répétée avec la même transaction après redémarrage
- **THEN** son reçu est restitué sans nouvelle référence ni nouvelle permission

### Requirement: Drainage observable au prochain jalon stable
Une demande ordinaire MUST faire attendre les seules opérations incompatibles. Un drainage exceptionnel MUST fermer les nouvelles admissions de sa portée et laisser finir les opérations déjà autorisées jusqu'à une frontière sûre. CAB MUST exposer cause, portée et obstacles sans contenu ni autorisation implicite.

#### Scenario: Change pair inachevé mais stable
- **WHEN** un pair n'a pas terminé son change et travaille hors du périmètre d'une publication
- **THEN** il n'est pas tenu de déclarer ready ni d'arrêter ses opérations indépendantes

#### Scenario: Drainage global demandé
- **WHEN** une maintenance commune explicitement autorisée demande le gel
- **THEN** tous les RUN concernés atteignent leur frontière sans nouvel effet autorisé

### Requirement: Observation native regroupée et recontrôlée
CAB MUST vérifier états, permissions et identités natives dans la portée de la transition puis recontrôler effets, générations et événements pertinents. Une observation invalide ou modifiée MUST refuser la transition. Un contrôle ordinaire MUST NOT exiger la quiescence des sessions indépendantes ni mettre en cache une permission.

#### Scenario: État modifié pendant les lectures
- **WHEN** un événement pertinent rend l'observation incertaine
- **THEN** la transition concernée attend un nouveau contrôle sans publication ni permission

#### Scenario: Activité indépendante
- **WHEN** une autre session exécute un effet hors de la portée contrôlée
- **THEN** son activité seule ne refuse pas la transition

### Requirement: Acquisition atomique des accès partagés

CAB MUST attribuer l'ensemble demandé de ressources partagées en une
transaction durable, ou n'en attribuer aucune. Les lectures MUST être
compatibles entre elles et toute écriture MUST exclure les accès recouvrants.
Chaque acquisition MUST porter une identité d'opération et un jeton de
génération non réutilisable. Des acquisitions distinctes du même RUN MAY
coexister uniquement si leurs ensembles complets sont compatibles ; une
extension d’un accès détenu reste refusée.

#### Scenario: Deux fichiers dont un occupé

- **WHEN** A demande deux fichiers et un seul est détenu par B
- **THEN** A attend sans verrou partiel et un RUN indépendant continue

#### Scenario: Lectures compatibles

- **WHEN** A et B lisent une même ressource sans écrivain antérieur incompatible
- **THEN** leurs accès peuvent coexister

#### Scenario: Opération indépendante dans le même RUN

- **WHEN** un accès d’un RUN est `UNKNOWN` sur une ressource et le même RUN
  demande un ensemble complet distinct sans recouvrement
- **THEN** l’accès indépendant peut être accordé
- **AND** une demande d’écriture recouvrante reste `WAITING`

#### Scenario: Extension pendant détention

- **WHEN** un détenteur demande une extension à son accès déjà actif
- **THEN** CAB refuse l’extension et exige une nouvelle acquisition complète

### Requirement: Exclusivité prouvée et promotion sûre
CAB MUST pouvoir dispenser d'acquisition temporaire un fichier dont l'usage exclusif est prouvé et contrôlé avant effet. Tout recouvrement nouveau MUST fermer l'admission exclusive concernée puis attendre ses effets avant passage au mode partagé. Un fichier d'exclusivité inconnue MUST être traité comme partagé.

#### Scenario: Nouveau pair pendant écriture privée
- **WHEN** B déclare un fichier privé que A modifie déjà
- **THEN** B attend sa promotion et aucune nouvelle opération exclusive ne démarre sur ce fichier

#### Scenario: Lecture du parent
- **WHEN** B déclare en lecture un répertoire contenant un fichier privé de A
- **THEN** la promotion tient compte du recouvrement parent et descendants

### Requirement: Identité canonique et ensemble complet
Les accès MUST utiliser des identités canoniques avec recouvrement des répertoires et descendants. Un alias physique MUST être unifié ou refusé. Les créations et déplacements MUST couvrir les parents utiles. Un détenteur MUST NOT attendre une extension ou conversion de son ensemble déjà détenu.

#### Scenario: Alias du même fichier
- **WHEN** deux chemins désignent un même fichier par lien matériel
- **THEN** CAB ne les traite pas comme deux ressources indépendantes

#### Scenario: Extension pendant détention
- **WHEN** A conserve un verrou et demande un autre ensemble bloquant
- **THEN** l'extension est refusée ; A doit terminer puis demander l'ensemble complet

#### Scenario: Correction dans le même ensemble
- **WHEN** un effet est connu et une correction explicitement approuvée reste dans les ressources déjà détenues
- **THEN** une nouvelle sous-opération peut être corrélée au groupe sans étendre les ressources ni réutiliser une permission antérieure

### Requirement: Révisions et preuves ciblées
CAB MUST suivre les révisions des ressources et dépendances utilisées par les preuves. Les écritures MUST invalider les preuves concernées, y compris celles d'un sous-arbre modifié. Une séquence globale de publication seule MUST NOT invalider une preuve indépendante.

#### Scenario: Création dans un répertoire validé
- **WHEN** un fichier est créé dans un sous-arbre après une validation
- **THEN** la preuve de lecture de ce sous-arbre devient à réexaminer

#### Scenario: Publication indépendante
- **WHEN** B publie sans toucher les entrées ou dépendances d'une preuve de A
- **THEN** la preuve de A reste exploitable

### Requirement: Réacquisition avant publication
Une publication MUST conserver ses protections de validation ou réacquérir ses ressources et vérifier les révisions des preuves avant effet. Une divergence MUST imposer le réexamen des validations affectées, sans modifier une décision antérieure ni rejouer un effet.

#### Scenario: Base changée après validation
- **WHEN** un pair modifie une entrée entre la validation et la publication de A
- **THEN** A revalide le périmètre affecté avant publication

### Requirement: Exclusion globale exceptionnelle
CAB MUST réserver le gel global à GLOBAL_RECONCILIATION, SHARED_MAINTENANCE,
GLOBAL_PAUSE ou GLOBAL_STOP, avec cause, portée et autorité persistées. Les
pauses ordinaires MUST rester locales. Le flux `/CAB update` MUST NOT lire ou
modifier les états RUN, permissions ou coordinations ; les autres opérations
conservent leurs contrats de coordination globale.

#### Scenario: Mise à jour pendant plusieurs RUN
- **WHEN** le développeur demande `/CAB update` alors que plusieurs RUN sont
  réservés
- **THEN** CAB ne lit ni ne modifie la cohorte et n'émet aucune requête de
  suspension ou de coordination globale

#### Scenario: Validation OpenSpec
- **WHEN** un RUN lance `openspec validate --all --strict`
- **THEN** il protège les entrées OpenSpec et n'acquiert aucun gel global

#### Scenario: Arrêt ciblé
- **WHEN** le développeur demande l'arrêt de A
- **THEN** B conserve ses accès et son activité

#### Scenario: Pause globale
- **WHEN** le développeur demande explicitement une pause de tous les RUN
- **THEN** CAB draine puis confirme le gel après vérification des effets et
  permissions

#### Scenario: Transaction globale déjà en cours
- **WHEN** une coordination globale autre que celle de l'update est déjà
  `DRAINING` ou `HELD`
- **THEN** l'update ne remplace ni ne libère cette coordination et ne modifie
  aucun RUN

### Requirement: Gel conservatoire d'intégrité commune
Une incertitude d'intégrité commune empêchant l'isolation des effets MUST suspendre les admissions avec cause GLOBAL_RECONCILIATION. CAB MUST conserver les preuves sans réparer, purger ou libérer automatiquement. Une incertitude dont la portée est connue MUST rester ciblée.

#### Scenario: Registre commun incertain
- **WHEN** CAB ne peut plus établir les propriétaires de protections
- **THEN** les admissions sont gelées pour réconciliation commune sans nouvelle permission

#### Scenario: Effet local inconnu
- **WHEN** la fin d'une opération sur un fichier connu manque
- **THEN** ses protections restent détenues et les ressources indépendantes restent utilisables

### Requirement: Refus des effets non cadrés
Une opération courante aux effets indéterminés MUST être refusée jusqu'à clarification de son manifeste. CAB MUST NOT convertir ce refus en réservation project:* ni en exclusion globale automatique.

#### Scenario: Commande sans manifeste exploitable
- **WHEN** une commande ne décrit pas ses écritures
- **THEN** elle est refusée sans suspendre les autres RUN

### Requirement: Opération consommée sans nouvelle admission historique
Une opération consommée ou invalidée MUST être écartée avant tout contrôle d'admission susceptible de modifier le registre. Le polling d'une ancienne décision MUST NOT réinscrire une session historique après sa réconciliation. Le contrôle MUST NOT modifier la décision ni autoriser une nouvelle permission once.

#### Scenario: Polling après clôture historique
- **WHEN** une opération historique a consommé sa permission once et que sa session a été réconciliée sous gel global puis libérée
- **THEN** les sondages suivants conservent la trace historique active vide et permettent une réservation Multi-RUN, sans nouvelle permission

### Requirement: Nouvelle réservation après clôture réconciliée

CAB MUST permettre au même propriétaire de réserver de nouveau son RUN après libération réconciliée. Une suspension historique d'une réservation DELIVERED ou ABANDONED MUST NOT bloquer cette nouvelle génération. CAB MUST conserver la réservation et sa suspension dans l'historique, attribuer une génération et un contexte neufs et MUST NOT transférer une permission ou décision consommée.

#### Scenario: Reprise après arrêt et abandon
- **WHEN** le même propriétaire réserve de nouveau un RUN dont la réservation a été arrêtée puis abandonnée après réconciliation, y compris après redémarrage du contrôleur
- **THEN** CAB crée une réservation sans suspension héritée avec génération et contexte neufs, conserve l'historique arrêté et n'émet aucune permission native par cette seule réservation

#### Scenario: Nouveau change après livraison arrêtée
- **WHEN** le même propriétaire réserve un autre change admissible après STOP et livraison réconciliée de sa réservation précédente
- **THEN** la suspension historique ne bloque pas la nouvelle réservation et le change déjà livré demeure protégé contre une nouvelle réservation

### Requirement: Contrôles préservés lors d'une nouvelle réservation

Les contrôles de propriétaire, de change déjà livré, de dépendances et de ressources MUST rester applicables lors d'une nouvelle réservation. Une suspension PAUSE ou STOP d'une réservation RESERVED ou un gel global actif MUST continuer à bloquer l'admission.

#### Scenario: Propriétaire divergent
- **WHEN** un autre propriétaire tente de réutiliser l'identifiant d'un RUN libéré et arrêté
- **THEN** CAB refuse la réservation sans modifier la génération ni l'historique

#### Scenario: Suspension encore active
- **WHEN** une nouvelle réservation vise un RUN dont la réservation RESERVED reste en PAUSE ou STOP
- **THEN** CAB refuse cette admission sans lever la suspension ni réutiliser une permission

#### Scenario: Gel global pendant la reprise
- **WHEN** un RUN libéré et arrêté tente une nouvelle réservation pendant un gel global actif
- **THEN** CAB refuse l'admission jusqu'à la levée autorisée du gel sans modifier la réservation historique

### Requirement: Frontière cumulative de maintenance gelée
L'amorçage MUST protéger tous les RUN affectés par le contrôleur partagé, vérifier anciennes sessions et candidates, permissions, jobs, propriétaires, opérations et préfixes natifs. Seul le PENDING orphelin exact désigné MAY subsister. Toute dérive MUST suspendre la transaction sans extension de portée ou permission implicite.

#### Scenario: Pair encore actif
- **WHEN** un pair ou sa candidate conserve activité, permission ou effet non résolu
- **THEN** aucun arrêt ni remplacement n'est autorisé par l'amorçage

### Requirement: Libération distincte de la récupération
La maintenance MUST conserver pauses, générations, critères et gel de récupération. Sa libération MUST suivre recontrôle des preuves et du code chargé ; elle MUST NOT constituer complete, rejet ou permission CAB. La réparation REJECTION_ONLY, son rejet et le retry MUST rester des opérations distinctes.

#### Scenario: Maintenance terminée
- **WHEN** le nouveau contrôleur et les identités sont vérifiés puis le gel commun est libéré
- **THEN** la candidate et le même job restent en récupération jusqu'aux décisions et preuves propres à leur prévol

### Requirement: Réservation durable des environnements de test

CAB MUST réserver atomiquement l'ensemble déclaré des environnements Docker/LXC avant leur préparation. Chaque réservation MUST appartenir à un seul RUN/change et à sa génération. Les identités non secrètes MUST être canoniques pour le même environnement. Les demandes incompatibles MUST attendre en ordre FIFO sans détention partielle ; les environnements indépendants MUST rester utilisables. Cette réservation MUST rester distincte des accès temporaires et des permissions unitaires.

#### Scenario: Deux changes sur le même Docker

- **WHEN** A détient le moteur Docker déclaré et B le demande
- **THEN** B attend sans préparation ni permission sur ce moteur, tandis qu'un test LXC indépendant peut démarrer

#### Scenario: Ensemble Docker et LXC occupé

- **WHEN** A demande Docker et LXC dont un seul est détenu par B
- **THEN** A n'obtient aucun des deux environnements avant disponibilité de l'ensemble

### Requirement: Acquisition de test et accès du même RUN

Pour `/test-resources/acquire`, CAB MUST bloquer l'acquisition sur un accès normal du même RUN uniquement si ses ressources recouvrent l'environnement demandé. Les accès HELD, EXECUTING, UNKNOWN ou WAITING disjoints MUST rester inchangés et ne MUST NOT bloquer l'acquisition. Un accès recouvrant MUST continuer à bloquer. Cette règle n'accorde aucune permission et ne remplace ni le bail de test ni l'accès requis par une commande.

#### Scenario: Accès actifs disjoints du même RUN

- **WHEN** le RUN possède un accès HELD, EXECUTING, UNKNOWN ou WAITING dont les ressources ne recouvrent pas l'environnement de test demandé
- **THEN** CAB peut réserver cet environnement indépendamment et conserve inchangés tous les accès existants

#### Scenario: Accès actif recouvrant l'environnement demandé

- **WHEN** le RUN possède un accès actif ou en attente dont les ressources recouvrent l'environnement de test demandé
- **THEN** CAB refuse ou diffère la réservation de test sans modifier l'accès existant

### Requirement: Restitution vérifiée des environnements
CAB MUST conserver la réservation jusqu’à la fin des opérations et la restitution vérifiée. La libération ordinaire MUST exiger nettoyage puis vérification distincts, corrélés et réussis après les tests, avec preuves examinées. Seule la restitution explicite sans effet MAY remplacer ce parcours sans mutation. Une fin de commande ou un booléen seul MUST NOT suffire. Une répétition identique MUST restituer le reçu ; une répétition divergente MUST être refusée.

#### Scenario: Test fini et nettoyage incomplet
- **WHEN** la dernière commande de test termine mais le nettoyage est absent ou échoué
- **THEN** la ressource reste réservée et aucun pair ne peut l'utiliser

#### Scenario: Test échoué et environnement restitué
- **WHEN** un test échoue puis le nettoyage et la vérification de disponibilité réussissent sans autre opération restante
- **THEN** la réservation peut être libérée sans transformer le résultat du test en succès

### Requirement: Reprise et clôture protégées des tests
CAB MUST conserver les réservations après crash, pause, arrêt ou délai dépassé. Un lecteur compatible MUST exiger une réconciliation de la frontière native avant nouvel usage après restauration, renouveler les jetons sans libération et refuser les anciennes générations. La publication, réduction de périmètre et clôture réussie MUST rester interdites tant qu'une réservation est non résolue. Une annulation MUST concerner uniquement une attente sans effet.

#### Scenario: Redémarrage pendant un test
- **WHEN** le contrôleur redémarre avant restitution vérifiée
- **THEN** la réservation reste protégée et aucune nouvelle permission ne peut utiliser l'ancien jeton

#### Scenario: Gate prématuré
- **WHEN** les accès de fichiers sont libérés mais l'environnement de test reste détenu
- **THEN** le gate terminal normal et la livraison sont refusés

#### Scenario: Réacquisition idempotente d'un bail restauré
- **WHEN** le propriétaire répète le POST `acquire` avec le même RUN, `transactionId`, version, ressources, evidence et payload après redémarrage
- **THEN** CAB renvoie le bail HELD existant au demandeur POST avec le même token/fencing et `reconciliationRequired=true`, sans créer de bail ni permission ; les projections GET omettent toujours le token

#### Scenario: Payload de réacquisition divergent
- **WHEN** un champ du payload POST diffère pour un `transactionId` déjà détenu
- **THEN** CAB refuse la transaction sans changer le bail, le token ou le fencing

#### Scenario: Réconciliation conserve le bail
- **WHEN** le propriétaire transmet le token/fencing retournés par la réacquisition exacte à `/test-resources/reconcile`, avec `reconciliationId` neuf et les contrôles natifs réussis
- **THEN** CAB renouvelle token/fencing, conserve la réservation HELD et retire `reconciliationRequired` ; aucune ressource n'est libérée ni commandée

### Requirement: Réservation des navigateurs externes de test
CAB MUST appliquer le cycle durable de réservation et restitution aux navigateurs externes déclarés dans DEVOPS.md, notamment Chromium et Firefox. Les clés MUST identifier le mécanisme sur son hôte. La libération MUST exiger fermeture des sessions et ressources de test, nettoyage puis vérification corrélés. Les sessions utilisateur préexistantes MUST rester préservées. Un ensemble navigateur/conteneur MUST être acquis atomiquement.

#### Scenario: Chromium occupé et Firefox indépendant
- **WHEN** A utilise Chromium sur un hôte et B demande le même navigateur tandis que C demande Firefox
- **THEN** B attend la restitution vérifiée de Chromium et C peut avancer indépendamment

#### Scenario: Arrêt avant nettoyage du navigateur
- **WHEN** le test est fini mais sa session WebDriver/BiDi ou son profil temporaire n'est pas restitué
- **THEN** le verrou reste détenu et la clôture réussie est refusée

#### Scenario: Docker et navigateur demandés ensemble
- **WHEN** un change demande Docker et Chromium dont un seul est occupé
- **THEN** aucune des deux ressources n'est attribuée partiellement

### Requirement: Protection des ressources de test contre la purge
Une réinitialisation CAB MUST refuser une réservation de test détenue, en attente ou invalide, même sans accès temporaire actif. Seuls les enregistrements libérés ou annulés MUST permettre de poursuivre les autres contrôles de purge.

#### Scenario: Réservation de test persistée sans accès de commande
- **WHEN** une purge rencontre une réservation HELD ou WAITING
- **THEN** aucun fichier runtime n'est supprimé et la réservation reste conservée

### Requirement: Conservation des identités logiques historiques
Le lecteur MUST conserver sans réécriture les clés logiques historiques des révisions, opérations et accès. La validation canonique des nouveaux environnements MUST rester appliquée à l'acquisition de test et avant permission native. Une ancienne clé historique MUST NOT donner une réservation ou permission nouvelle. Les protections des fichiers et alias physiques MUST rester conservées.

#### Scenario: Ancienne clé de navigateur terminée
- **WHEN** le registre contient browser:c14-headless-test-profiles dans des opérations COMPLETED et accès RELEASED
- **THEN** la restauration conserve les identifiants et preuves exacts, sans créer de réservation ni modifier l'historique

#### Scenario: Nouvelle acquisition non canonique
- **WHEN** un RUN tente de réserver cette ancienne clé comme environnement de test
- **THEN** l'acquisition reste refusée et aucune permission native n'est admise sans une réservation canonique détenue

### Requirement: Perte d'autorité récupérable sans faux service sain
Le contrôleur MUST refuser les mutations après perte d'autorité. Il MUST sortir en échec pour permettre la restauration systemd plutôt que rester indéfiniment vivant avec registry-unavailable. Les fichiers durables MUST rester conservés et aucun verrou concurrent MUST être contourné.

#### Scenario: Helper de verrou interrompu
- **WHEN** le helper d'autorité se termine hors arrêt volontaire
- **THEN** le contrôleur devient indisponible puis redémarre en restaurant le registre, sans rejouer les décisions consommées

### Requirement: Conservation des protections à la fermeture OpenCode
La fermeture technique de CAB après disparition prouvée d’OpenCode MUST conserver les RUN, jobs, réservations, décisions, gates et gels existants. Elle MUST NOT purger, libérer de protection, synthétiser de décision ou de clôture métier, ni rejouer une permission consommée. La reprise MUST rester explicite et soumise à réconciliation ; les effets inconnus MUST rester protégés.

#### Scenario: Plusieurs RUN dont une récupération gelée
- **WHEN** le serveur commun disparaît avec des RUN réservés et un gel de récupération
- **THEN** les composants se ferment et leurs états métier et protections restent conservés

### Requirement: Restitution explicite de réservation sans effet
CAB MUST proposer une restitution HELD distincte du nettoyage ordinaire seulement sur autorisation développeur spécifique et attestation explicite de l’orchestrateur couvrant tous les mandats et opérations du cycle sans mutation de l’environnement. Il MUST vérifier propriétaire, contexte, génération, jeton, fencing, frontière exacte et liste exhaustive des opérations.

#### Scenario: Diagnostics sans mutation puis SSH inaccessible
- **WHEN** toutes les opérations terminales sont corrélées nativement et explicitement examinées sans effet, avec autorisation spécifique et frontière inchangée
- **THEN** CAB restitue la réservation avec un reçu unused-no-effect sans annoncer nettoyage, disponibilité distante ou réussite des diagnostics

#### Scenario: Frontière inconnue ou mutation
- **WHEN** une opération manque, reste active, a muté l’environnement ou que l’attestation ou l’autorisation manque
- **THEN** la réservation reste protégée et le parcours ordinaire reste nécessaire

#### Scenario: Reçu durable et répétition
- **WHEN** une restitution sans effet est rejouée exactement ou le registre est restauré
- **THEN** le reçu et ses empreintes restent conservés, le rejeu identique est idempotent et une requête divergente est refusée sans rejouer once

### Requirement: Gardes de la restitution sans effet
Une opération active, inconnue, non attestée ou une mutation déclarée MUST refuser cette voie. Une classification MUST NOT être déduite du texte des commandes, du résultat SSH, d’un exit ou d’un timeout. Les accès temporaires MUST être libérés et les protections de restauration, pause et gel MUST rester applicables.

#### Scenario: Interdiction de restitution implicite
- **WHEN** un délai expire ou une commande semble inoffensive sans examen explicite
- **THEN** CAB conserve la réservation sans fabriquer d’attestation

### Requirement: Observation explicite de l’admission concurrente
CAB MUST exposer un instantané BUSY/STABLE du RUN et une lecture ciblée d’admission d’une demande distinguant propriétaire, validation et décision locale enregistrés. Une demande inconnue MUST rester404 et une cible étrangère MUST être refusée. STABLE MUST NOT constituer autorisation, réservation ou garantie de succès ; chaque décision MUST réexaminer les gardes existantes.

#### Scenario: Demande visible pendant transition
- **WHEN** une transition est encore active après visibilité du propriétaire et de la validation
- **THEN** le GET exposeBUSY et le POST reste refusé sans décision ni once

#### Scenario: Fin de transition et même identité
- **WHEN** la transition se termine et aucune décision n’est enregistrée
- **THEN** le GET exposeSTABLE mais le même POST reste soumis aux identités/révisions/permissions courantes et à l’unicité

### Requirement: Refus de transition non décisionnel explicite
Le409 précoce et le400 tardif run-transition-in-flight MUST conserver leurs gardes/statuts et indiquer admissionBUSY sans enregistrer une nouvelle décision. Le refus précoce MUST exposer decision_recorded local, ounull pour demande inconnue. Une décision déjà enregistrée MUST NOT être rejouée ou reconstruite depuis cet instantané.

#### Scenario: Course après observation stable
- **WHEN** une transition commence avant la décision effective
- **THEN** le POST refuse encore, sans attente serveur ni bypass de garde

### Requirement: Payload Bash scellé sans recopie modèle
CAB MUST permettre le staging d’un payload Bash UTF-8 revu et son SHA256, immuable et lié aux identités RUN/job/SID/version/requête/opération. Le staging MUST NOT créer validation, décision, accès ou exécution. Le modèle MUST pouvoir transmettre seulement l’invocation courte scellée ; décision exacte, accès HELD et once natifs MUST rester requis.

#### Scenario: Préparation revue et idempotence
- **WHEN** l’orchestrateur dépose le corps et hash vérifiés à une frontière sûre
- **THEN** CAB retourne le même transport pour le même stage exact et refuse une substitution ou un contexte étranger

### Requirement: Revue du corps derrière le transport
La décision MUST porter sur l’invocation et le corps scellé exact. Le mode de décision automatique MUST recevoir le corps et son hash depuis le stage privé correspondant, jamais depuis un texte libre du modèle. La réponse de staging MUST rester non autorisante ; le codeur MUST NOT être chargé de recopier le long corps après revue.

#### Scenario: Décision automatique sur le transport
- **WHEN** la demande correspond aux identités et à l’invocation d’un stage
- **THEN** le validateur reçoit le payload scellé pour examen, distinct du transport court confié au codeur

### Requirement: Vérification et livraison native du corps exact
La livraison MUST être liée à l’opération approuvée et au contexte natif en exécution, sans accès restauré/inconnu. Le lanceur MUST vérifier longueur, SHA256, UTF-8 et CWD avant Bash, sans fichier mutable ni retry. Une altération ou réponse invalide MUST terminer avant payload. Les plafonds existants MUST rester inchangés ; aucun mandat historique MUST être réinterprété.

#### Scenario: Corps long et modèle absent du transport
- **WHEN** l’invocation courte approuvée reçoit once
- **THEN** le corps scellé exact est exécuté par le shell natif sans que le modèle ait recopié ses octets

#### Scenario: Transport ou corps divergent
- **WHEN** le corps, le hash ou le contexte ne correspond plus
- **THEN** le payload ne s’exécute pas et la réconciliation conserve les preuves sans once rejouée

### Requirement: Réconciliation native avant rattachement d'une opération
Avant rattachement, le contrôleur MUST vérifier l'accès puis prouver les fins natives non résolues comme pour sa libération. Les contrôles de décision, génération, couverture et révision MUST rester applicables. Une fin non prouvée MUST refuser le rattachement en conservant les protections. Le rattachement MUST NOT conférer de permission ni libérer de ressource.

#### Scenario: Fin native prouvée et diagnostic rattaché
- **WHEN** une commande native corrélée est terminée et qu'un diagnostic approuvé satisfait tous les contrôles de l'accès détenu
- **THEN** le contrôleur constate cette fin et rattache le diagnostic sans consommer de permission ni changer le jeton et le fencing

#### Scenario: Preuve absente ou divergente
- **WHEN** la fin de la commande native ne peut être prouvée ou qu'une identité native diverge
- **THEN** le rattachement est refusé et les protections restent détenues

#### Scenario: Libération concurrente
- **WHEN** une libération concurrente survient pendant la vérification native du rattachement
- **THEN** les transitions sont sérialisées et une ancienne identité ne peut autoriser un rattachement après libération

#### Scenario: Annulation existante du diagnostic rattaché
- **WHEN** le propriétaire libère l'accès avec le résultat RECONCILED après rattachement d'un diagnostic préparé et non exécuté
- **THEN** ce diagnostic est annulé et sa validation non consommée est invalidée sans permission native supplémentaire

### Requirement: Décision restaurée limitée à une annulation
Après redémarrage, un rattachement MAY demander explicitement la preuve native de la décision approuvée perdue pour annuler une opération préparée. CAB MUST vérifier les identités persistantes, l'accès restauré, la réponse MCP native et la stabilité de la session. Cette preuve MUST NOT restaurer une permission exécutable.

#### Scenario: Décision et identité corrélées
- **WHEN** la réponse MCP native approuvée correspond exactement à l'opération préparée et à l'accès restauré
- **THEN** le rattachement en vue de l'annulation peut être admis sans rétablir la décision exécutable

#### Scenario: Preuve ambiguë ou session active
- **WHEN** la réponse, les identités, les révisions ou l'historique divergent, ou qu'une permission native reste en attente
- **THEN** le rattachement est refusé et les protections restent détenues

### Requirement: Suppression du jeton d'un accès libéré
Après libération ou publication, CAB MUST retirer le jeton brut de l'accès
persisté et de toute réponse. Le rejeu exact MUST rester idempotent grâce à
l'empreinte persistée de la requête. Les accès actifs MUST conserver leur
jeton ; une requête divergente MUST être refusée.

#### Scenario: Libération et rejeu exact
- **WHEN** un accès HELD est libéré puis la même requête est rejouée
- **THEN** le reçu est rendu sans jeton brut et sans nouvelle mutation

#### Scenario: Rejeu divergent
- **WHEN** une requête de libération diffère du reçu persistant
- **THEN** CAB refuse le rejeu sans exposer ni réactiver l'ancien jeton

#### Scenario: Publication d'un accès
- **WHEN** un accès est consommé par une publication réussie
- **THEN** son état RELEASED et son reçu subsistent sans jeton brut

### Requirement: Jetons de réservation absents des projections GET
Les projections GET `/runs`, `/runs/<run_id>/status` et
`/runs/<run_id>/test-resources` MUST omettre le jeton bearer des réservations
de test dans tous leurs états. La projection MUST laisser intacts l'état
persistant et les gardes de mutation. Les réponses POST d'acquisition et de
réconciliation peuvent retourner le jeton au demandeur autorisé.

#### Scenario: Lecture d'une réservation détenue ou en attente
- **WHEN** un client lit le statut d'une réservation HELD, WAITING ou restaurée
- **THEN** aucune projection GET ne contient son champ `token`

#### Scenario: Acquisition conserve son retour unitaire
- **WHEN** le demandeur autorisé acquiert ou réconcilie une réservation
- **THEN** la réponse POST peut fournir le jeton nécessaire aux mutations ultérieures

#### Scenario: Projection après restitution
- **WHEN** une réservation est `RELEASED` et relue par l'un des GET protégés
- **THEN** le snapshot conserve les champs non secrets mais omet toujours `token`

### Requirement: Restitution sans effet d'un bail restauré lorsque le jeton est perdu
CAB MAY restituer un bail HELD restauré sans jeton par preview/POST sur le même
RUN et change armé. L’absence d’effet MUST être prouvée par transcript natif
complet ou, après compaction, par registre durable complet attestant que chaque
opération postérieure est rejetée/annulée sans démarrage natif et qu’aucun
accès/permission n’est actif. Toute opération inconnue ou démarrée conserve
HELD ; aucun jeton n’est révélé.

#### Scenario: Bail restauré inutilisé dans un change déjà armé
- **WHEN** le bail est HELD/restauré, le RUN et son job armé portent le même
  change, le transcript complet prouve zéro mutation et aucune opération active
- **THEN** le propriétaire peut restituer le bail sans ancien token ni nouvelle
  permission ; CAB marque uniquement ce bail RELEASED avec un reçu sans token

#### Scenario: Bail restauré avec activité ou preuve incertaine
- **WHEN** une permission, un mandat, un effet, une opération en cours/inconnue,
  une mutation ou une divergence d’historique est observée
- **THEN** preview ou POST refuse et le bail reste HELD sans suppression de token

#### Scenario: Compaction avec registre complet sans démarrage natif
- **WHEN** une compaction survient après l’acquisition, chaque opération
  postérieure est durablement rejetée/annulée sans `nativeStart`, la session est
  idle, aucune permission ou accès n’est actif et la frontière ne change pas
- **THEN** CAB enregistre une preuve `operation-ledger-after-compaction` et peut
  restituer uniquement le bail inutilisé

#### Scenario: Compaction avec opération native inconnue ou démarrée
- **WHEN** après compaction une opération est absente du registre, non terminale,
  munie d’un `nativeStart`, ou une permission/accès reste actif
- **THEN** preview ou POST refuse et le bail reste HELD

#### Scenario: Scope ou frontière divergente
- **WHEN** le `changeId`, propriétaire, session, contexte, répertoire, version,
  fencing ou digest de preview diverge du RUN courant
- **THEN** le POST est refusé sans mutation ni restitution

### Requirement: Rejet natif sans effet pour un bail de test restauré
La restitution tokenless MUST accepter une opération `PREPARED` sans permission
native uniquement si la décision native de rejet est corrélée à la même
opération ou si un reçu durable `REJECTION_ONLY` correspond exactement. Une
opération approuvée, inconnue ou avec accès associé MUST conserver le bail
`HELD`.

#### Scenario: Validation rejetée sans permission native
- **WHEN** un bail restauré est associé à une opération `PREPARED` portant un
  reçu `REJECTION_ONLY` concordant, sans accès ni permission native
- **THEN** la preview décrit l’opération sans jeton et la restitution peut
  l’attester comme sans effet sur l’environnement

#### Scenario: Permission ou effet actif
- **WHEN** une permission, commande, écriture, accès actif ou effet incertain
  est observé
- **THEN** la restitution est refusée et aucune protection n’est libérée

### Requirement: Observations Code Mode bornées pour la récupération d’un bail
Un wrapper Code Mode MUST être attesté sans effet sur l’environnement uniquement
si son historique natif est complet, non tronqué et ne contient que des appels
CAB terminaux appartenant à une liste fermée sans effet. Un wrapper inconnu, une
méthode mutatrice ou une preuve absente MUST bloquer la restitution.

#### Scenario: Wrapper Code Mode d’observations autorisées
- **WHEN** l’historique natif complet montre un wrapper Code Mode non tronqué
  contenant uniquement des appels CAB explicitement autorisés, tous terminaux
- **THEN** ces observations ne bloquent pas la preuve d’absence d’effet

#### Scenario: Wrapper incomplet ou inconnu
- **WHEN** un wrapper est tronqué, incomplet ou appelle une méthode absente de
  la liste autorisée
- **THEN** la restitution est refusée et le bail reste `HELD`

### Requirement: Preview filtrée des blocages de récupération
La preview GET MUST rester en lecture seule, ne jamais révéler le jeton et
retourner un code de blocage ainsi que des états d’opérations filtrés lorsque
la preuve ne permet pas une restitution sûre.

#### Scenario: Preuve insuffisante dans la preview
- **WHEN** l’historique comporte une permission, un effet inconnu ou une
  méthode native non autorisée
- **THEN** la preview renvoie un blocage filtré sans argument ni sortie native

### Requirement: Filesystem fallback lié au RUN armé

Le contrôleur MUST exposer les routes `/runs/<run_id>/source/read`, `/source/list` et `/source/find`. Il MUST dériver la session et le répertoire du RUN réservé et du job armé ; les identités fournies par l'appelant MUST NOT élargir cette portée.

#### Scenario: Routes propres au RUN armé

- **WHEN** un RUN réservé possède un job armé
- **THEN** les routes filesystem sont liées à sa session et à son répertoire natifs exacts

### Requirement: Fallback filesystem interdit pendant une activité

Le contrôleur MUST refuser la lecture si un mandat, effet, validation indécise, permission native, activité OpenCode, transition ou récupération est en cours. Il MUST revérifier la frontière après l'appel et invalider le résultat si elle a changé.

#### Scenario: RUN non quiescent ou identité divergente

- **WHEN** une activité, permission, transition ou divergence de session/location apparaît avant ou pendant l'appel
- **THEN** le contrôleur refuse le résultat et ne change ni le RUN, ni ses accès, ni ses permissions

### Requirement: Fallback filesystem sans effet métier

Les routes et helpers MUST rester read-only. Ils MUST NOT créer, modifier ou libérer accès, réservation, mandat, décision, permission ou état métier.

#### Scenario: Le modèle ne dispose pas d'outil natif de lecture

- **WHEN** l'orchestrateur doit lire une source mais le modèle de codage n'expose pas `read`, `search` ou `glob`
- **THEN** il peut utiliser le helper CAB read-only lié au RUN et MUST NOT remplacer cette lecture par `shell`, `execute`, `edit` ou `write`

### Requirement: Issue native distincte de la fin technique

Le ledger MUST conserver pour chaque opération terminale l'issue native `completed` ou `error`, corrélée à une preuve unique du transcript. Une issue absente, dupliquée, divergente ou non relue pour une opération historique MUST conserver l'accès HELD.

#### Scenario: Fin native en erreur

- **WHEN** le transcript natif prouve un outil terminé en erreur pour l'opération corrélée
- **THEN** le ledger garde l'état terminal technique et persiste séparément l'issue `error`

#### Scenario: Opération historique sans issue

- **WHEN** une opération terminale existante n'a pas d'issue native persistée
- **THEN** CAB relit une partie native unique correspondant à l'empreinte existante avant toute libération

#### Scenario: Transcript absent ou divergent

- **WHEN** la preuve native est absente, dupliquée ou différente du digest enregistré
- **THEN** CAB refuse la classification et conserve l'accès HELD

### Requirement: NO_EFFECT après erreur native sans mutation

`NO_EFFECT` MUST respecter les révisions attendues et MUST NOT créer un
`pendingWrite` ni avancer une révision. Une écriture réussie ou incertaine reste
refusée, sauf contrat distinct prouvant un tour assistant terminal sans effet ;
un timeout, une permission absente ou un journal vide ne suffisent jamais.

#### Scenario: Édition native en erreur et révision inchangée

- **WHEN** un edit natif est terminé en erreur, sa preuve correspond à l'opération et la révision de la ressource n'a pas changé
- **THEN** Codex peut décider `NO_EFFECT`, CAB libère l'accès et la révision reste inchangée

#### Scenario: Tour assistant terminal sans appel d’effet

- **WHEN** le contrat de preuve distinct `NO_EFFECT` d’approval-persistence est satisfait
- **THEN** CAB invalide l’accord local et libère l’accès sans avancer les révisions ni créer un `pendingWrite`

#### Scenario: Écriture réussie présentée comme sans effet

- **WHEN** une écriture native est réussie ou sa preuve indique un effet
- **THEN** `NO_EFFECT` est refusé et les gardes de libération existantes restent appliquées

#### Scenario: Révision modifiée ou effet inconnu

- **WHEN** une révision diverge ou qu'une opération reste ISSUING, EXECUTING ou UNKNOWN sans la preuve spécifique d’un tour terminal sans effet
- **THEN** `NO_EFFECT` est refusé et l'accès demeure HELD

#### Scenario: Rejeu exact de la libération

- **WHEN** le même reçu `NO_EFFECT` est rejoué après libération
- **THEN** CAB rend le reçu idempotent sans nouvelle mutation ni jeton brut

### Requirement: Incertitude native limitée aux ressources concernées

Une opération à frontière native inconnue MUST conserver un accès protégé
uniquement pour les ressources de son manifeste. Elle MUST NOT déclencher un
gel global ni empêcher l’acquisition d’un ensemble complet de ressources
indépendant et compatible. Les écritures recouvrantes MUST attendre jusqu’à
une frontière native prouvée. Une permission inconnue MUST NOT être assimilée
à un accès libre.

#### Scenario: RUN indépendant sans recouvrement

- **WHEN** un RUN conserve une opération native `UNKNOWN` et qu’un autre RUN
  demande un ensemble complet sans recouvrement
- **THEN** l’accès indépendant peut être accordé selon les règles normales

#### Scenario: Écriture recouvrante

- **WHEN** un RUN demande une écriture sur une ressource protégée par une
  opération native `UNKNOWN`
- **THEN** il reste en attente et aucune permission ou effet n’est accordé

#### Scenario: Fin native ciblée

- **WHEN** une fin native exacte est prouvée pour l’opération inconnue
- **THEN** CAB clôt cette opération et ne libère que son accès ; les autres
  accès restent inchangés

### Requirement: Persistance atomique d’un rejet natif sans effet

Le registre MUST accepter la clôture rejetée uniquement pour l’opération exacte au statut `PREPARED`, sans entrée native ni accès. Il MUST persister en une écriture le statut terminal `CANCELLED`, la décision `rejected` et l’empreinte de la preuve native. La même preuve et la même décision sont idempotentes ; toute divergence MUST être refusée. Cette transition MUST préserver toutes les autres opérations, RUN et ressources.

#### Scenario: Clôture du mandat rejeté sans accès

- **WHEN** le registre reçoit le rejet natif exact et son empreinte pour l’opération `PREPARED`
- **THEN** il stocke décision, empreinte et `CANCELLED` atomiquement, sans créer de lease ou d’accès

#### Scenario: Rejeu ou divergence

- **WHEN** la même opération reçoit un autre statut ou une empreinte différente
- **THEN** le registre refuse sans altérer le reçu terminal

### Requirement: Compatibilité du reçu terminal de rejet pendant un rollback

Un rejet natif terminal MUST être stocké dans un schéma de décision et de registre déjà lisible par la brique immédiatement antérieure. Le digest du transcript MUST rester durable et corrélé à la demande. À la restauration, une extension connue plus récente MAY être normalisée sans modifier l’identité, le statut `rejected`, les ressources ou les autres RUN. Une extension inconnue ou une preuve divergente MUST échouer fermement.

#### Scenario: Normalisation d’une empreinte 2.1.70

- **GIVEN** un rejet `CANCELLED` avec empreintes connues `nativeProofDigest` et `nativeRejectionProofDigest`
- **WHEN** un contrôleur plus récent restaure le registre
- **THEN** il conserve un digest identique dans le champ compatible existant et retire seulement les extensions redondantes

#### Scenario: Rejet divergents ou état actif

- **GIVEN** des digests malformés ou divergents, un statut non rejeté ou une opération native active
- **WHEN** la normalisation est examinée
- **THEN** le registre conserve ses protections et refuse d’inférer un rejet

### Requirement: Préserver les accès actifs conflictuels après restauration

Le registre MUST conserver les accès actifs présents au redémarrage, même lorsque deux accès concernent le même RUN ou se recouvrent. Chaque accès restauré MUST rester protégé contre l’émission d’une nouvelle permission `once`. Les nouveaux accès recouvrants MUST rester en `WAITING` jusqu’à réconciliation ; les accès disjoints MAY avancer. Un accès mal formé ou un jeton invalide MUST rester refusé.

#### Scenario: Registre avec deux accès actifs recouvrants

- **GIVEN** deux leases actifs conservés dans le registre après un arrêt
- **WHEN** le contrôleur restaure le RUN
- **THEN** il charge les deux accès comme restaurés sans rejeter tout le registre
- **AND** aucun des deux accès ne peut être réutilisé pour une permission native
- **AND** un nouvel accès recouvrant attend tandis qu’un accès disjoint peut être accordé

#### Scenario: Lease restaurée mal formée

- **GIVEN** un accès dont l’identité, les ressources ou le jeton sont invalides
- **WHEN** le registre est restauré
- **THEN** la restauration échoue sans supprimer ni réparer l’accès

### Requirement: Réconcilier un bail de test restauré sans l’ancien token

Après redémarrage, CAB MAY renouveler le token et le fencing d’un bail de test
`HELD` restauré sans recevoir son ancien token, uniquement depuis un prévol
scellé et une frontière native stable. Le bail et ses ressources MUST rester
`HELD` ; aucune commande ni permission `once` MUST être émise.

#### Scenario: Propriétaire réconcilie le même bail utilisé

- **WHEN** le RUN propriétaire présente le digest du prévol exact, le transactionId, la version, le fencing et un reconciliationId neuf ; toutes les opérations liées sont terminales et prouvées, la session est idle et aucune permission n’est pendante
- **THEN** CAB renouvelle token/fencing, conserve la même réservation `HELD`, inscrit un reçu idempotent et ne divulgue pas de token dans le prévol, les logs ou le checkpoint

#### Scenario: Réservation inutilisée mais restauration non prouvée

- **WHEN** le bail reste restauré mais son token initial est absent
- **THEN** CAB ne le libère pas comme inutilisé et exige les gardes de réconciliation du bail utilisé

#### Scenario: Effet, permission ou activité incertaine

- **WHEN** une opération liée reste `ISSUING`, `EXECUTING` ou `UNKNOWN`, la session est active, une permission existe, ou le digest/version/fencing divergent
- **THEN** CAB refuse la mutation, conserve le bail `HELD` et ne renvoie aucun token

#### Scenario: Rejeu du même reçu

- **WHEN** le même reconciliationId et le même digest sont rejoués pour le même RUN et le même bail
- **THEN** CAB rend le même reçu sans nouveau fencing ni nouvelle mutation

#### Scenario: Réconciliation d’un bail différent

- **WHEN** un autre RUN, contexte, transaction ou ensemble de ressources est présenté
- **THEN** CAB refuse le reçu et conserve le bail d’origine

### Requirement: Réacquérir le token d’un bail restauré utilisé

Le propriétaire MAY renouveler un token de test `HELD` restauré sans fournir
son ancien token si un prévol non secret exact et une preuve native stable
confirment le même RUN, session et lease. Le bail MUST rester `HELD`.

#### Scenario: Réconciliation owner-scoped du bail utilisé

- **WHEN** un `boundaryDigest` read-only correspond au bail `HELD` restauré, le `transactionId`, version, fencing et `reconciliationId` sont exacts, toutes les opérations liées sont terminales, la session est idle et aucune permission n’est pendante
- **THEN** CAB renouvelle le token/fencing du même bail, retourne le bail uniquement au propriétaire et retire `reconciliationRequired` sans lancer ni libérer de ressource

#### Scenario: Effet natif ou frontière instable

- **WHEN** une opération liée est `ISSUING`, `EXECUTING` ou `UNKNOWN`, une permission ou activité apparaît, ou le boundaryDigest change
- **THEN** CAB ne renouvelle pas le token et garde le bail `HELD` avec `reconciliationRequired=true`

#### Scenario: Token absent du prévol

- **WHEN** un prévol est demandé ou relu en GET
- **THEN** CAB retourne les identités, ressources, états et boundaryDigest sans token, contenu de commande ou sortie native

#### Scenario: Rejeu du reçu exact

- **WHEN** le même reconciliationId et le même payload de propriétaire sont rejoués après succès
- **THEN** CAB retourne le bail renouvelé au même RUN sans incrémenter une seconde fois le fencing

### Requirement: Recovery locale terminale indépendante de l’admission métier

La revalidation d’un candidat `NO_EFFECT` déjà approuvé MAY poursuivre
l’admission uniquement pour relire l’identité existante. Elle MUST NOT créer
une opération ni un accès et reste soumise au contrat de preuve terminale.

#### Scenario: Bail de test disjoint encore restauré

- **WHEN** une opération `UNKNOWN` existante est approuvée, son accès unique concerne un fichier, la preuve terminale `NO_EFFECT` est complète et un bail de test disjoint attend sa réconciliation
- **THEN** CAB peut clôturer uniquement l’accès fichier sans permission, sans `once` et sans modifier le bail de test

#### Scenario: Candidate différent ou effet natif présent

- **WHEN** la récupération ne vise pas l’opération UNKNOWN approuvée exacte, ou que permission, callID, résultat natif, once ou ressource non fichier est présent
- **THEN** CAB conserve les gardes d’admission et refuse la voie locale

#### Scenario: Événement d’un tour ultérieur read-only

- **WHEN** une lecture read-only possède son propre message après le tour assistant terminal prouvé
- **THEN** CAB garde la preuve `NO_EFFECT` limitée au tour d’origine et n’assimile pas l’événement ultérieur à un effet dans ce tour
