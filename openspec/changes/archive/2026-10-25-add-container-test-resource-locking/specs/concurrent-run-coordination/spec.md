## ADDED Requirements

### Requirement: Réservation durable des environnements de test
CAB MUST réserver atomiquement l'ensemble déclaré des environnements Docker/LXC avant leur préparation. Chaque réservation MUST appartenir à un seul RUN/change et à sa génération. Les identités non secrètes MUST être canoniques pour le même environnement. Les demandes incompatibles MUST attendre en ordre FIFO sans détention partielle ; les environnements indépendants MUST rester utilisables. Cette réservation MUST rester distincte des accès temporaires et des permissions unitaires.

#### Scenario: Deux changes sur le même Docker
- **WHEN** A détient le moteur Docker déclaré et B le demande
- **THEN** B attend sans préparation ni permission sur ce moteur, tandis qu'un test LXC indépendant peut démarrer

#### Scenario: Ensemble Docker et LXC occupé
- **WHEN** A demande Docker et LXC dont un seul est détenu par B
- **THEN** A n'obtient aucun des deux environnements avant disponibilité de l'ensemble

### Requirement: Restitution vérifiée des environnements
CAB MUST conserver la réservation entre commandes jusqu'à la fin de toutes les opérations et la restitution de chaque environnement. La libération MUST exiger un nettoyage puis une vérification distincts, corrélés et réussis après les autres tests, avec preuves examinées. Une fin de commande ou un booléen seul MUST NOT suffire. Une répétition identique MUST restituer le reçu ; une répétition divergente MUST être refusée.

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

## MODIFIED Requirements

### Requirement: Prompts pilotés cohérents
Les prompts pilotés des projets inventoriés MUST utiliser le protocole 1.10.0 et un checkpoint par RUN lors de leur déploiement autorisé. Les sous-jobs MUST hériter du RUN parent. CISM, CAISM et les prompts directs MUST rester inchangés et hors concurrence pilotée. La préparation source MUST NOT propager ces changements.

#### Scenario: Sous-job CISMP
- **WHEN** CISMP appelle SPCMP ou ISMP avec plusieurs changes présents
- **THEN** le sous-job traite le change réservé et les accès de son RUN parent

### Requirement: File équitable d'intégration
L'attente d'une opération MUST être durable, idempotente et FIFO entre demandes incompatibles. Une demande indépendante MUST pouvoir avancer. Une annulation MUST être explicite sans libérer un effet commencé. La file historique globale MUST NOT suspendre les pairs dans le profil 1.10.0.

#### Scenario: Deux demandes et publication
- **WHEN** A puis B demandent une même ressource pour publier
- **THEN** A précède B tandis qu'une demande indépendante de C peut avancer

#### Scenario: Écrivain et lecteurs nouveaux
- **WHEN** un écrivain attend avant l'arrivée de nouvelles lectures incompatibles
- **THEN** ces lectures ne le dépassent pas

### Requirement: Publication et phase documentaire atomiques
CAB MUST proposer une transition publiée atomique vers REPORT avec génération, révisions attendues, preuves et cible vérifiées. Séquence de publication, reçu, portée documentaire et libération sûre MUST être persistés ensemble. Les anciennes routes incompatibles MUST être refusées sans effet dans le profil 1.10.0.

#### Scenario: Publication concurrente suivante
- **WHEN** A termine la publication atomique et B publie indépendamment
- **THEN** A est déjà limité à son rapport et les anciens jetons de A sont invalides
