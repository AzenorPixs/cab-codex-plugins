# persistent-job-supervision Specification

## Purpose
Cette capacité maintient un contrat de job durable et observable afin qu'une
interruption conversationnelle ne soit jamais confondue avec une fin de job.

## Requirements

### Requirement: Compactage coordonné des deux sessions

L'orchestrateur SHALL déclencher un cycle commun de compactage de sa session
et de la session de codage toutes les 1 h 30 (5 400 secondes). À l'échéance,
il SHALL suspendre les nouveaux mandats le temps d'achever le mandat
autorisé en cours, traiter son rapport et sauvegarder le checkpoint, puis
vérifier les API natives exposées pour les sessions réellement pilotées.
Lorsque les deux API sont disponibles, il SHALL lancer les deux compactages
en parallèle ; sinon, il SHALL compacter les seules sessions accessibles et
tracer les opérations non exécutées. Le cycle SHALL conserver un identifiant
commun, les identifiants de session disponibles et ceux explicitement non exposés,
les horodatages, résultats natifs et éventuels retards dans le checkpoint non
secret. La prochaine échéance SHALL être calculée depuis le déclenchement du
cycle commun, sans remplacer un échec par une réussite rétroactive.

Un accusé de lancement, un résumé manuel ou le compactage d'une session
auxiliaire SHALL NOT constituer la preuve de compactage de l'orchestrateur
réel. Les deux fins natives corrélées SHALL être requises pour déclarer une
réussite conjointe, pas pour reprendre un RUN dont l'état reste exploitable.
Une API de compactage absente SHALL NOT être assimilée à une perte de contexte
lorsque la conversation active, le checkpoint et les preuves disponibles
permettent de vérifier la continuité ; les identifiants non exposés SHALL être
signalés sans être inventés.
Avant reprise des mandats, l'orchestrateur SHALL réconcilier les deux contextes,
la santé OpenCode, MCP et la readiness CAB, et vérifier l'absence d'approbation
parasite. Si une API requise est indisponible ou si un compactage échoue,
il SHALL conserver le
cycle incomplet et signaler sa cause sans annoncer une synchronisation
réussie. Ce seul écart SHALL NOT classer le RUN `BLOQUÉ`, arrêter CAB, demander
une dérogation humaine ni différer les statistiques ; après réconciliation
sûre, l'orchestrateur SHALL poursuivre les mandats déjà autorisés. Un compactage
encore en cours ou une réconciliation impossible SHALL suspendre les opérations
concernées selon le protocole CAB. L'orchestrateur SHALL NOT répéter aveuglément
une opération d'effet inconnu ni attendre une API absente ; il SHALL réexaminer
sa disponibilité à la prochaine échéance du cycle. Ce cycle SHALL NOT créer
une approbation, rejouer une opération,
changer le modèle ni fermer ou redémarrer les processus des agents.

#### Scenario: Échéance entre deux mandats

- **WHEN** l'échéance de 5 400 secondes est atteinte, aucun mandat n'est en cours et les deux API natives sont disponibles
- **THEN** l'orchestrateur déclenche les deux compactages en parallèle dans un même cycle et ne reprend qu'après leurs preuves natives et la réconciliation

#### Scenario: Échéance pendant une exécution

- **WHEN** l'échéance est atteinte pendant l'unique opération déjà autorisée
- **THEN** l'orchestrateur laisse cette opération s'achever, traite son rapport, rend le retard observable, compacte les sessions accessibles puis reprend après réconciliation sûre

#### Scenario: Compactage de l'orchestrateur non prouvé

- **WHEN** seule la session de codage ou une session auxiliaire est compactée, ou que l'API de l'orchestrateur réel est indisponible
- **THEN** le cycle reste incomplet avec sa cause, aucune réussite conjointe n'est déclarée et le RUN poursuit ses mandats autorisés après réconciliation sûre sans dérogation ni report des statistiques

#### Scenario: Aucun compactage disponible

- **WHEN** aucune des deux API natives n'est exposée et les contextes, CAB et les permissions restent exploitables
- **THEN** l'orchestrateur consigne les opérations non exécutées, poursuit le RUN sans attendre une API absente et réexamine la disponibilité à l'échéance suivante

#### Scenario: Échec de compactage avec contexte préservé

- **WHEN** un compactage échoue mais la réconciliation confirme la continuité du périmètre, des preuves et des permissions sans opération encore en cours
- **THEN** l'échec reste observable et le RUN poursuit les mandats autorisés sans classement `BLOQUÉ` fondé sur ce seul échec

#### Scenario: Réconciliation non sûre

- **WHEN** un compactage reste en cours, le contexte est perdu, un mandat est ambigu ou une permission parasite subsiste
- **THEN** l'orchestrateur suspend les opérations concernées et applique la récupération CAB sans inventer de preuve ni rejouer un mandat

### Requirement: Contrat de job durable et non secret

CAB SHALL enregistrer atomiquement un contrat de job local avant sa
supervision. Le contrat SHALL contenir un identifiant de job, l'identifiant de
la session OpenCode, le répertoire absolu, le change OpenSpec éventuel, les
critères de fin, le dernier jalon prouvé, le mandat courant éventuel,
`terminal_gate` et les métadonnées de reprise. Il SHALL exclure tout secret,
contenu de fichier du projet et décision CAB. Une instance redémarrée SHALL
restaurer le contrat sans déduire de jalon ni d'état terminal.

#### Scenario: Reprise après redémarrage du superviseur

- **WHEN** le superviseur redémarre alors qu'un contrat possède
  `terminal_gate: OPEN`
- **THEN** il restaure ce contrat, le rend observable et reprend son contrôle
  sans le déclarer terminal

### Requirement: Reprise limitée par le gate terminal

Le superviseur SHALL considérer un job terminal uniquement lorsque le
contrôleur a validé son `terminal_gate` pour l'état déclaré `TERMINÉ` ou
`BLOQUÉ`. Tant que le gate est ouvert, une session close, un tour terminé, un
silence SSE, un délai ou un mandat terminé SHALL rester des états non
terminaux. Le superviseur SHALL conserver le job armé et publier la cause
observée.

#### Scenario: Tour OpenCode terminé sans gate valide

- **WHEN** le superviseur observe un tour terminé et que le gate terminal du
  contrat est ouvert
- **THEN** il conserve le job dans un état non terminal et planifie son examen
  de reprise

### Requirement: Relance technique corrélée à la session

Après une pause de reprise configurable de 60 secondes par défaut, le
superviseur SHALL vérifier la disponibilité d'OpenCode, le SSE, la readiness
CAB et le gate terminal avant d'adresser un message structuré de reprise à la
session enregistrée. Ce message SHALL demander l'examen du dernier état, du
flux SSE et du protocole CAB, puis la poursuite du premier jalon non prouvé.
Il SHALL interdire toute réponse finale tant que le gate reste ouvert. Le
superviseur SHALL limiter une relance à une tentative en cours et conserver le
résultat observé. Il SHALL ne créer ni décision, ni approbation, ni mandat.

#### Scenario: Session inactive et reprise admissible

- **WHEN** la session enregistrée est inactive, que le gate est ouvert et que
  les contrôles techniques sont exploitables après la pause de reprise
- **THEN** le superviseur envoie un unique message de reprise à cette session
  et mémorise sa tentative

#### Scenario: Contrôle technique non exploitable

- **WHEN** OpenCode, le SSE ou la readiness CAB ne permet pas une reprise sûre
- **THEN** le superviseur ne relance pas la session, conserve le gate ouvert et
  publie la cause ainsi que l'action recommandée

### Requirement: Observabilité sans secret

Le superviseur SHALL fournir localement un état public sans secret comprenant
l'identifiant de job, l'état de supervision, le dernier jalon prouvé, l'âge de
la dernière activité, le nombre et le résultat de la dernière tentative de
reprise, le gate terminal et la cause courante. Les transitions de supervision
SHALL être journalisées dans le magasin local du superviseur.

#### Scenario: Consultation d'un job non terminal

- **WHEN** un client local consulte l'état d'un job dont le gate est ouvert
- **THEN** il reçoit l'état de supervision et la raison de non-terminalité sans
  contenu de projet, secret ni décision détaillée

### Requirement: Gel des relances pendant une récupération
Le superviseur MUST suspendre les messages de reprise lorsque le contrat expose une récupération en cours. Il MUST NOT relancer l'ancienne session ou la candidate pendant le prévol. Après transfert confirmé, il MUST suivre exclusivement la nouvelle session du même job et conserver le gate OPEN. Il MUST NOT créer la session candidate ni décider le transfert.

#### Scenario: Récupération préparée
- **WHEN** le contrat expose une récupération préparée non terminée
- **THEN** le superviseur attend avec une cause observable sans envoyer de message

#### Scenario: Récupération terminée
- **WHEN** le contrôleur a confirmé le transfert
- **THEN** le superviseur reprend ses contrôles sur la nouvelle session sans relancer l'ancienne

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
