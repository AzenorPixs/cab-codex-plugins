## REMOVED Requirements

### Requirement: Nouvelles tentatives persistantes du benchmark PLLM

**Reason** : La politique courante impose l'attente humaine sans réessai
automatique en l'absence de politique admissible.

**Migration** : Appliquer « Attente humaine sans réessai PLLM automatique »
et conserver les anciennes échéances comme preuves sans les réactiver.

## ADDED Requirements

### Requirement: Attente humaine sans réessai PLLM automatique

Sans politique PLLM admissible, l'orchestrateur MUST conserver le RUN, son choix éventuel et ses preuves, avertir le développeur avec la cause horodatée et attendre son instruction sans benchmark ni réessai automatique. Il MUST NOT poursuivre de mandat, test, maintenance ou sonde pendant cette attente. Il MUST NOT déclarer une clôture réussie ni arrêter ou redémarrer les processus partagés du seul fait de cette indisponibilité.

#### Scenario: Évaluation sans politique admissible

- **WHEN** une évaluation requise échoue ou ne fournit aucune politique admissible
- **THEN** le RUN conserve ses preuves et attend une instruction humaine sans programmer de nouvelle tentative automatique

#### Scenario: Instruction reçue pendant l'attente

- **WHEN** le développeur autorise une nouvelle évaluation ou demande l'arrêt du RUN en attente
- **THEN** l'orchestrateur traite cette instruction dans son périmètre après réconciliation, sans rejouer une permission consommée

### Requirement: Échéance PLLM historique sans effet automatique

Une ancienne échéance PLLM MUST rester une preuve historique. Sa présence, son dépassement ou sa restauration MUST NOT déclencher une évaluation, un benchmark ou un prévol automatique. Toute tentative encore en cours ou d'effet inconnu MUST être réconciliée avant une action autorisée ; une reprise MUST NOT dupliquer son effet.

#### Scenario: Ancienne échéance dépassée à la reprise

- **WHEN** le checkpoint restauré conserve une échéance PLLM déjà atteinte
- **THEN** l'orchestrateur conserve cette trace sans réactiver de tentative et applique la politique courante d'attente ou de conservation du choix

## MODIFIED Requirements

### Requirement: Checkpoint des tentatives PLLM

Le checkpoint non secret MUST conserver l'identité du RUN, le choix PLLM vérifié éventuel et sa provenance, la cause horodatée de l'attente, les résultats des tentatives et le dernier jalon prouvé. Sans politique admissible, sa prochaine action MUST être l'attente d'une instruction humaine, sans programmer de nouvelle échéance automatique. Après interruption, l'orchestrateur MUST réconcilier les preuves avant toute reprise et MUST NOT dupliquer une tentative d'effet inconnu.

#### Scenario: Interruption pendant l'attente

- **WHEN** le pilotage du même RUN reprend après une interruption en attente PLLM
- **THEN** l'orchestrateur restaure le choix et les preuves, réconcilie toute tentative en cours ou d'effet inconnu et conserve l'attente humaine sans programmer de réessai

### Requirement: Supervision pendant l'attente PLLM

Une indisponibilité PLLM seule MUST NOT être assimilée à une clôture réussie ni justifier la fermeture ou le redémarrage des processus partagés. Les états de supervision et les preuves MUST être conservés. Leur maintien MUST NOT déclencher de nouveau mandat, sonde ou benchmark automatique pendant l'attente humaine ; une instruction explicite d'arrêt MUST suivre les gates et réconciliations applicables.

#### Scenario: Benchmark indisponible et CAB sain

- **WHEN** aucune politique PLLM admissible n'est disponible sans blocage CAB distinct
- **THEN** le RUN reste en attente humaine avec ses preuves et les processus partagés préservés, sans nouvelle activité automatique de l'orchestrateur

### Requirement: Réconciliation avant reprise après benchmark

Après une évaluation autorisée réussie, l'orchestrateur MUST réconcilier les contextes, la santé OpenCode, MCP, la readiness CAB réelle et les permissions avant reprise. Tout nouveau choix MUST être qualifié par son prévol natif. La réussite MUST NOT constituer une décision CAB, rejouer un mandat consommé ou contourner un blocage distinct. Une reprise non sûre MUST appliquer la récupération CAB avec une cause observable.

#### Scenario: Benchmark rétabli

- **WHEN** une évaluation autorisée fournit une politique admissible et les contrôles de reprise sûre sont satisfaits
- **THEN** l'orchestrateur reprend le même RUN au premier jalon non prouvé après prévol du nouveau choix, en conservant les mandats CAB unitaires

#### Scenario: Réussite sans reprise sûre

- **WHEN** l'évaluation réussit mais une permission non corrélée ou un blocage CAB distinct subsiste
- **THEN** l'orchestrateur applique la récupération CAB sans autoriser le travail par le seul résultat du benchmark
