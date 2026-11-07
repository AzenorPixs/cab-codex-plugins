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
