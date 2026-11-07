# corrective-incident-queue Specification

## Purpose
Déclarer, réserver, coordonner et résoudre durablement les incidents CAB depuis
les sessions directes ou pilotées, par FIFO ou lots de causes communes justifiés.

## Requirements

### Requirement: CCAB coordonné et persistant
CCAB SHALL fournir service, plugin, skill et commande aux sessions directes/pilotées. Un orchestrateur désigné SHALL connaître le contrat et prendre la plus ancienne entrée par défaut. Il MAY regrouper des entrées communes en lot justifié avec résolution individuelle. Une réservation SHALL éviter le traitement concurrent.

#### Scenario: Lot commun
- **WHEN** le correcteur identifie plusieurs entrées de même cause
- **THEN** il traite un lot tracé et vérifie séparément la résolution auprès de chaque déclarant

#### Scenario: Interruption du correcteur
- **WHEN** une prise est interrompue
- **THEN** son reçu persistant permet reprise contrôlée sans double traitement

### Requirement: Qualification et livraison des incidents
Le correcteur SHALL coordonner les déclarants et qualifier défaut code/documentation ou faux positif sur preuves. Toute modification SHALL suivre SCM, version, CI/CD et CABU approprié ; un faux positif SHALL fournir une méthode de reprise vérifiée.

#### Scenario: Correction documentaire
- **WHEN** la documentation suffit à résoudre l’incident
- **THEN** le correcteur peut la livrer sous version avec retour aux déclarants

### Requirement: Nettoyage après réponse et clôture
CCAB SHALL permettre le nettoyage ciblé d'une entrée après résolution et réponse vérifiée au déclarant. Une entrée non résolue SHALL NOT être supprimée. Les reçus nécessaires aux autres entrées SHALL être conservés. Le nettoyage SHALL NOT modifier les RUN, permissions ou accès. La file SHALL NOT servir d'archive.

#### Scenario: Entrée traitée avec une autre encore ouverte
- **WHEN** une entrée est résolue après réponse au déclarant alors qu'une autre reste ouverte
- **THEN** le nettoyage de l'entrée résolue est permis et l'entrée ouverte reste intacte

#### Scenario: Entrée non résolue
- **WHEN** un nettoyage individuel cible une entrée non résolue
- **THEN** il est refusé sans suppression

### Requirement: Traitement et nettoyage par lot
Le correcteur MAY traiter ensemble des entrées dont les causes ou dépendances le justifient, puis les nettoyer séparément ou ensemble. Un lot de nettoyage SHALL être atomique et refuser toute suppression si une entrée ciblée n'est pas résolue.

#### Scenario: Nettoyage par lot
- **WHEN** plusieurs entrées traitées ensemble sont résolues et leurs réponses vérifiées
- **THEN** elles peuvent être nettoyées ensemble sans attendre les entrées extérieures au lot

### Requirement: Clôture après traitement sans correctif
CCAB SHALL permettre de solder une entrée examinée sans correctif au moyen de la classification `no-fix`, distincte de `false-positive`. La résolution SHALL expliquer la méthode, les raisons de l'absence de correctif et les limites résiduelles ; le déclarant SHALL être identifié dans les retours vérifiés. La publication SHALL être absente pour cette classification. Cette clôture SHALL NOT prouver la réparation des données, autoriser un effet ni lever une protection.

#### Scenario: Traitement sans correctif
- **WHEN** une entrée a été examinée et ne conduit pas à un correctif
- **THEN** le correcteur peut la solder avec `no-fix`, sa justification et ses limites, sans renseignement de livraison fictif

#### Scenario: Preuve de livraison fictive
- **WHEN** une résolution `no-fix` inclut une livraison
- **THEN** CCAB refuse la résolution

### Requirement: Purge globale conditionnelle des entrées traitées
Sur demande explicite du développeur, CCAB SHALL vérifier et purger atomiquement l'ensemble des entrées et reçus de file uniquement lorsque toutes les entrées sont `RESOLVED`. Une entrée non traitée SHALL empêcher toute suppression. Cette opération SHALL NOT modifier les RUN, leurs accès, permissions ou autres données CAB.

#### Scenario: Une entrée non traitée
- **WHEN** la purge est demandée alors qu'une entrée est ouverte ou réservée
- **THEN** aucune entrée ni aucun reçu de file n'est supprimé

#### Scenario: Toutes les entrées traitées
- **WHEN** la purge est demandée et toutes les entrées sont résolues
- **THEN** les entrées et reçus CCAB sont supprimés dans la même transaction sans modifier les RUN

### Requirement: Coordination CCAB entre projets
Le déclarant et le correcteur CCAB désigné par le développeur MAY échanger les seules identités et preuves nécessaires au traitement d'un incident déclaré, même lorsque leurs chats sont rattachés à des projets différents. Le développeur a explicitement autorisé cette coordination. Les participants SHALL vérifier l'identité et le rôle du destinataire et les permissions techniques applicables ; ils SHALL NOT transmettre de secret ni étendre un mandat métier par ce seul échange.

#### Scenario: Correcteur CAB et déclarant d'un autre projet
- **WHEN** une session a déclaré un incident CCAB et que le correcteur désigné demande les preuves nécessaires
- **THEN** elle peut communiquer ces preuves sans redemander au développeur une approbation pour chaque échange
- **AND** les permissions de la plateforme et les frontières du change restent applicables
