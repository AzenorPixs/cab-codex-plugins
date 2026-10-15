## ADDED Requirements

### Requirement: File équitable d'intégration
Une demande explicite d'intégration MUST pouvoir rejoindre une file FIFO
persistante et idempotente par contexte. Seule la tête MUST pouvoir acquérir
la barrière, après les gardes de stabilité et quiescence. Les nouvelles
réservations MUST attendre ; les RUN déjà stables MUST suspendre leurs
nouveaux mandats. La réconciliation MUST conserver l'ordre de la file.
Une annulation MUST être explicite et MUST NOT libérer un effet inconnu.
Les acquisitions historiques sans file MUST rester disponibles.

#### Scenario: Deux demandes et publication
- **WHEN** A puis B demandent l'intégration et les pairs atteignent leur jalon stable
- **THEN** seul A acquiert, puis B réconcilie la nouvelle référence avant acquisition

### Requirement: Réduction contrôlée des ressources
Un RUN MUST pouvoir réduire ses ressources à une frontière quiescente avec
preuves et génération courante. La nouvelle portée MUST être incluse dans
l'ancienne et MUST NOT convertir read en write. La génération MUST changer.
L'obligation de publication des écritures MUST survivre à la réduction.

#### Scenario: Retrait d'une lecture globale
- **WHEN** un RUN termine ses contrôles globaux et réduit project:* à ses fichiers nécessaires
- **THEN** les ressources retirées ne bloquent plus les pairs et les anciennes générations sont refusées

### Requirement: Phase documentaire après publication
Après publication prouvée et libération de l'exclusion, un RUN MUST pouvoir
entrer dans une phase irréversible limitée au STATISTIQUES.md de sa propre
archive. Les autres ressources MUST être relâchées. Le rapport vérifié et
le gate TERMINÉ MUST rester requis avant livraison.

#### Scenario: Rapport préparé pendant la reprise du pair
- **WHEN** A a publié et entre en closing pendant que B réconcilie puis reprend
- **THEN** A prépare son rapport sans barrière globale et ne peut plus modifier son code

### Requirement: Isolation de la phase documentaire
Les mandats documentaires MUST respecter les permissions explicites et toute
exclusion active. Ils MUST NOT permettre une extension métier. Une nouvelle
référence MUST NOT invalider la publication métier figée pour cette seule phase.

#### Scenario: Publication d'un pair pendant closing
- **WHEN** B publie pendant que A finalise son rapport
- **THEN** A conserve sa publication, attend la levée de l'exclusion et ne reçoit qu'une permission documentaire corrélée

## MODIFIED Requirements

### Requirement: Barrière stable du répertoire partagé
Avant intégration, les RUN métier réservés MUST déclarer un jalon stable avec
preuves locales, sans mandat ni effet en attente. Le propriétaire MUST suspendre
les opérations des pairs et vérifier la quiescence native de tous les RUN,
y compris documentaires. Après libération, les RUN métier MUST réconcilier la
référence avant mandat et réexaminer les validations affectées sans rejouer les
effets prouvés. La phase documentaire MUST rester limitée à son rapport.

#### Scenario: Validation globale et publication
- **WHEN** A intègre pendant que B possède une réservation indépendante
- **THEN** B attend à un jalon stable puis réconcilie la référence publiée avant reprise

#### Scenario: Rapport natif en cours
- **WHEN** A demande l'intégration pendant que B écrit son rapport documentaire
- **THEN** A attend la quiescence native et aucune nouvelle écriture de B n'est admise sous sa barrière
