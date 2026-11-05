## MODIFIED Requirements

### Requirement: Prompts pilotés cohérents
Les prompts pilotés des projets inventoriés MUST utiliser le protocole 1.4.0 et un checkpoint par RUN lors de leur déploiement autorisé. Les sous-jobs MUST hériter du RUN parent. CISM, CAISM et les prompts directs MUST rester inchangés et hors concurrence pilotée. La préparation source MUST NOT propager ces changements.

#### Scenario: Sous-job CISMP
- **WHEN** CISMP appelle SPCMP ou ISMP avec plusieurs changes présents
- **THEN** le sous-job traite le change réservé et les accès de son RUN parent

### Requirement: File équitable d'intégration
L'attente d'une opération MUST être durable, idempotente et FIFO entre demandes incompatibles. Une demande indépendante MUST pouvoir avancer. Une annulation MUST être explicite sans libérer un effet commencé. La file historique globale MUST NOT suspendre les pairs dans le profil 1.4.0.

#### Scenario: Deux demandes et publication
- **WHEN** A puis B demandent une même ressource pour publier
- **THEN** A précède B tandis qu'une demande indépendante de C peut avancer

#### Scenario: Écrivain et lecteurs nouveaux
- **WHEN** un écrivain attend avant l'arrivée de nouvelles lectures incompatibles
- **THEN** ces lectures ne le dépassent pas

### Requirement: Publication et phase documentaire atomiques
CAB MUST proposer une transition publiée atomique vers REPORT avec génération, révisions attendues, preuves et cible vérifiées. Séquence de publication, reçu, portée documentaire et libération sûre MUST être persistés ensemble. Les anciennes routes incompatibles MUST être refusées sans effet dans le profil 1.4.0.

#### Scenario: Publication concurrente suivante
- **WHEN** A termine la publication atomique et B publie indépendamment
- **THEN** A est déjà limité à son rapport et les anciens jetons de A sont invalides

## ADDED Requirements

### Requirement: Opération consommée sans nouvelle admission historique
Une opération consommée ou invalidée MUST être écartée avant tout contrôle d'admission susceptible de modifier le registre. Le polling d'une ancienne décision MUST NOT réinscrire une session historique après sa réconciliation. Le contrôle MUST NOT modifier la décision ni autoriser une nouvelle permission once.

#### Scenario: Polling après clôture historique
- **WHEN** une opération historique a consommé sa permission once et que sa session a été réconciliée sous gel global puis libérée
- **THEN** les sondages suivants conservent la trace historique active vide et permettent une réservation Multi-RUN, sans nouvelle permission
