## ADDED Requirements

### Requirement: Intégrité des tâches d’une archive de RUN
CAB MUST vérifier les tâches du change archivé avant de présenter une clôture de codage valide, y compris quand le RUN a été importé. Il MUST conserver le reçu historique et les protections de l’import lorsque l’archive est incomplète.

#### Scenario: Clôture importée et archive incomplète
- **WHEN** un RUN importé a un état terminal mais une tâche de son archive reste ouverte
- **THEN** CAB signale la clôture à régulariser et conserve la preuve et les protections historiques

#### Scenario: Preuves manquantes et requalification
- **WHEN** un contrôle historique ne peut pas être confirmé
- **THEN** CAB distingue les résultats de la nouvelle qualification de ceux de la version historique
