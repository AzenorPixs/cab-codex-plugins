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
Les prompts pilotés des projets inventoriés MUST utiliser le protocole 1.6.1 et un checkpoint par RUN lors de leur déploiement autorisé. Les sous-jobs MUST hériter du RUN parent. CISM, CAISM et les prompts directs MUST rester inchangés et hors concurrence pilotée. La préparation source MUST NOT propager ces changements.

#### Scenario: Sous-job CISMP
- **WHEN** CISMP appelle SPCMP ou ISMP avec plusieurs changes présents
- **THEN** le sous-job traite le change réservé et les accès de son RUN parent

### Requirement: File équitable d'intégration
L'attente d'une opération MUST être durable, idempotente et FIFO entre demandes incompatibles. Une demande indépendante MUST pouvoir avancer. Une annulation MUST être explicite sans libérer un effet commencé. La file historique globale MUST NOT suspendre les pairs dans le profil 1.6.1.

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
Après publication prouvée, un RUN MUST pouvoir entrer irréversiblement en REPORT, limité au STATISTIQUES.md de son archive. Les autres protections MUST être libérées seulement après preuve de fin. Rapport vérifié et gate TERMINÉ MUST rester requis avant livraison.

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
CAB MUST proposer une transition publiée atomique vers REPORT avec génération, révisions attendues, preuves et cible vérifiées. Séquence de publication, reçu, portée documentaire et libération sûre MUST être persistés ensemble. Les anciennes routes incompatibles MUST être refusées sans effet dans le profil 1.6.1.

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
CAB MUST attribuer l'ensemble demandé de ressources partagées en une transaction durable, ou n'en attribuer aucune. Les lectures MUST être compatibles entre elles et toute écriture MUST exclure les accès recouvrants. Chaque acquisition MUST porter une identité d'opération et un jeton de génération non réutilisable.

#### Scenario: Deux fichiers dont un occupé
- **WHEN** A demande deux fichiers et un seul est détenu par B
- **THEN** A attend sans verrou partiel et un RUN indépendant continue

#### Scenario: Lectures compatibles
- **WHEN** A et B lisent une même ressource sans écrivain antérieur incompatible
- **THEN** leurs accès peuvent coexister

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
CAB MUST limiter le gel global à GLOBAL_RECONCILIATION, SHARED_MAINTENANCE, GLOBAL_PAUSE ou GLOBAL_STOP, avec cause, portée et autorité persistées. Une réconciliation courante ou un conflit ordinaire MUST NOT acquérir ce gel. Une pause ou un arrêt de RUN MUST rester local sauf cible globale explicite.

#### Scenario: Validation OpenSpec
- **WHEN** un RUN lance openspec validate --all --strict
- **THEN** il protège les entrées OpenSpec et n'acquiert aucun gel global

#### Scenario: Arrêt ciblé
- **WHEN** le développeur demande l'arrêt de A
- **THEN** B conserve ses accès et son activité

#### Scenario: Pause globale
- **WHEN** le développeur demande explicitement une pause de tous les RUN
- **THEN** CAB draine puis confirme le gel après vérification des effets et permissions

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
