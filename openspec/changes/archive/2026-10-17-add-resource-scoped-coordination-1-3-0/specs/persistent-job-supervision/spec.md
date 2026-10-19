# Supervision persistante ciblée — delta 1.3.0

## MODIFIED Requirements

### Requirement: Supervision de plusieurs RUN
Le superviseur MUST isoler activité SSE, session, gate, reprise, récupération et attentes de ressources par RUN. Les relances MUST rester techniques et corrélées. Pause, arrêt ou conflit d'un RUN MUST NOT interrompre les pairs indépendants. Une attente de verrou MUST NOT devenir un état terminal ou déclencher une relance métier.

#### Scenario: Isolation concurrente
- **WHEN** un événement de A arrive
- **THEN** l'horloge de B reste inchangée

#### Scenario: Attente de ressource
- **WHEN** A attend une ressource détenue par B et C travaille indépendamment
- **THEN** A reste non terminal sans relance métier, B et C continuent selon leurs propres contrats

## ADDED Requirements

### Requirement: Suspension conforme à la cible
Une pause ou un arrêt MUST fermer les nouvelles admissions dans sa cible explicite. Les effets en cours MUST atteindre une frontière sûre ou conserver leurs protections. Le superviseur MUST NOT relancer le travail suspendu ni déduire une cible globale d'un arrêt de RUN.

#### Scenario: Pause ciblée
- **WHEN** le développeur suspend A seulement
- **THEN** A ne reçoit aucun nouveau mandat et B continue

#### Scenario: Arrêt avec effet incertain
- **WHEN** l'arrêt ciblé de A survient pendant un effet d'issue inconnue
- **THEN** A conserve checkpoint et protections sans être déclaré livré

### Requirement: Reprise après attente ciblée
La disponibilité d'une ressource MUST seulement permettre un nouveau contrôle corrélé de l'opération. La reprise MUST vérifier génération, protections et révisions des preuves sans réutiliser une permission consommée. Les pauses explicites MUST rester prioritaires sur cette disponibilité.

#### Scenario: Verrou disponible pendant pause
- **WHEN** une ressource devient libre alors que le RUN reste suspendu explicitement
- **THEN** aucun mandat ni relance métier n'est créé

