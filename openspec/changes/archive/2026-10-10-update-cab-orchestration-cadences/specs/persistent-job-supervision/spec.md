## ADDED Requirements

### Requirement: Nouvelles tentatives persistantes du benchmark PLLM

Après échec du benchmark PLLM, l'orchestrateur MUST maintenir le même RUN en
attente non terminale et retenter toutes les 30 minutes (1 800 secondes), sans
limite de tentatives, jusqu'à reprise sûre du RUN ou arrêt explicite du
développeur. La prochaine échéance MUST partir de l'échec observé de la
dernière tentative. L'orchestrateur MUST NOT lancer de tentatives simultanées.

#### Scenario: Échecs successifs

- **WHEN** plusieurs tentatives du benchmark PLLM échouent dans le même RUN
- **THEN** chaque échec programme une nouvelle tentative trente minutes plus tard sans plafond, conserve ses preuves et laisse le RUN en attente non terminale

#### Scenario: Arrêt explicite pendant l'attente

- **WHEN** le développeur arrête explicitement le RUN en attente PLLM
- **THEN** l'orchestrateur cesse les nouvelles tentatives de ce RUN et conserve les preuves et le checkpoint

### Requirement: Checkpoint des tentatives PLLM

Le checkpoint non secret MUST conserver l'identité du RUN, l'horodatage, la
cause et le résultat des tentatives PLLM ainsi que la prochaine échéance.
Après interruption, l'orchestrateur MUST conserver cette échéance et
réconcilier toute tentative encore en cours ou d'effet inconnu avant de
retenter. Il MUST NOT dupliquer une tentative dont l'effet reste inconnu.

#### Scenario: Interruption pendant l'attente

- **WHEN** le pilotage du même RUN reprend après une interruption
- **THEN** l'orchestrateur restaure l'échéance conservée et réconcilie toute tentative en cours ou d'effet inconnu sans dupliquer un essai

### Requirement: Supervision pendant l'attente PLLM

Un échec de benchmark PLLM seul MUST NOT justifier une clôture terminale,
l'abandon de la boucle ou la fermeture ou le redémarrage des processus.
La supervision MUST rester active sans attente bloquante de trente minutes.

#### Scenario: Benchmark indisponible et CAB sain

- **WHEN** le benchmark échoue sans blocage CAB distinct
- **THEN** la supervision reste active, le RUN reste non terminal et aucun processus n'est fermé ou redémarré pour cet échec

### Requirement: Réconciliation avant reprise après benchmark

Après une réussite observée du benchmark PLLM, l'orchestrateur MUST réconcilier
les contextes, la santé OpenCode, MCP, la readiness CAB réelle et les
permissions avant reprise. La réussite MUST NOT constituer une décision CAB,
rejouer un mandat consommé ou contourner un blocage distinct. Une reprise non
sûre MUST appliquer la récupération CAB avec une cause observable.

#### Scenario: Benchmark rétabli

- **WHEN** une tentative réussit et les contrôles de reprise sûre sont satisfaits
- **THEN** l'orchestrateur reprend le même RUN au premier jalon non prouvé en conservant les mandats CAB unitaires

#### Scenario: Réussite sans reprise sûre

- **WHEN** le benchmark réussit mais une permission non corrélée ou un blocage CAB distinct subsiste
- **THEN** l'orchestrateur applique la récupération CAB sans autoriser le travail par le seul résultat du benchmark

### Requirement: SSE temps réel et contrôle CAB toutes les trois secondes

L'orchestrateur MUST consommer les événements SSE OpenCode en temps réel et
contrôler les demandes et les rapports toutes les 3 secondes dans sa boucle
de pilotage. Cette cadence MUST rester distincte des délais techniques du
superviseur, des heartbeats et des rappels du broker.

#### Scenario: Demande ou rapport reçu

- **WHEN** un événement SSE arrive pendant le pilotage
- **THEN** il est consommé en temps réel et la boucle contrôle demandes et rapports toutes les trois secondes

### Requirement: Vérifications de progression espacées de sept secondes

Pendant l'analyse ou la rédaction de l'agent de codage, l'orchestrateur MUST
utiliser des pauses fixes de 7 secondes entre deux vérifications de
progression. Ces pauses MUST NOT ralentir la réception SSE ou le contrôle CAB
toutes les trois secondes.

#### Scenario: Demande pendant une analyse

- **WHEN** une demande CAB arrive alors que l'agent de codage analyse ou rédige
- **THEN** le SSE reste traité en temps réel et le contrôle des demandes et rapports continue toutes les trois secondes, indépendamment des vérifications de progression espacées de sept secondes fixes
