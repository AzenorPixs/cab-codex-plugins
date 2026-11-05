## MODIFIED Requirements

### Requirement: Prompts pilotés cohérents
Les prompts pilotés des projets inventoriés MUST utiliser le protocole 1.8.0 et un checkpoint par RUN lors de leur déploiement autorisé. Les sous-jobs MUST hériter du RUN parent. CISM, CAISM et les prompts directs MUST rester inchangés et hors concurrence pilotée. La préparation source MUST NOT propager ces changements.

#### Scenario: Sous-job CISMP
- **WHEN** CISMP appelle SPCMP ou ISMP avec plusieurs changes présents
- **THEN** le sous-job traite le change réservé et les accès de son RUN parent

### Requirement: File équitable d'intégration
L'attente d'une opération MUST être durable, idempotente et FIFO entre demandes incompatibles. Une demande indépendante MUST pouvoir avancer. Une annulation MUST être explicite sans libérer un effet commencé. La file historique globale MUST NOT suspendre les pairs dans le profil 1.8.0.

#### Scenario: Deux demandes et publication
- **WHEN** A puis B demandent une même ressource pour publier
- **THEN** A précède B tandis qu'une demande indépendante de C peut avancer

#### Scenario: Écrivain et lecteurs nouveaux
- **WHEN** un écrivain attend avant l'arrivée de nouvelles lectures incompatibles
- **THEN** ces lectures ne le dépassent pas

### Requirement: Publication et phase documentaire atomiques
CAB MUST proposer une transition publiée atomique vers REPORT avec génération, révisions attendues, preuves et cible vérifiées. Séquence de publication, reçu, portée documentaire et libération sûre MUST être persistés ensemble. Les anciennes routes incompatibles MUST être refusées sans effet dans le profil 1.8.0.

#### Scenario: Publication concurrente suivante
- **WHEN** A termine la publication atomique et B publie indépendamment
- **THEN** A est déjà limité à son rapport et les anciens jetons de A sont invalides

## ADDED Requirements

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
