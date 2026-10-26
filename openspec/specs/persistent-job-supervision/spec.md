# persistent-job-supervision Specification

## Purpose
Cette capacité maintient un contrat de job durable et observable afin qu'une
interruption conversationnelle ne soit jamais confondue avec une fin de job.

## Requirements

### Requirement: Compactage coordonné des deux sessions

L'orchestrateur SHALL déclencher un cycle commun de compactage de sa session et de la
session de codage toutes les 1 h 30 (5 400 secondes). À l'échéance, l'orchestrateur
SHALL suspendre les nouveaux mandats le temps d'achever le mandat autorisé en cours,
traiter son rapport et sauvegarder le checkpoint, puis vérifier les API natives exposées
pour les sessions réellement pilotées.

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

CAB SHALL enregistrer atomiquement un contrat de job local avant sa supervision. Le
contrat SHALL contenir un identifiant de job, l'identifiant de la session OpenCode, le
répertoire absolu, le change OpenSpec éventuel, les critères de fin, le dernier jalon
prouvé, le mandat courant éventuel, `terminal_gate` et les métadonnées de reprise. Le
contrat SHALL exclure tout secret, contenu de fichier du projet et décision CAB.

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

Après une pause de reprise configurable de 60 secondes par défaut, le superviseur SHALL
vérifier la disponibilité d'OpenCode, le SSE, la readiness CAB et le gate terminal avant
d'adresser un message structuré de reprise à la session enregistrée. Ce message SHALL
demander l'examen du dernier état, du flux SSE et du protocole CAB, puis la poursuite du
premier jalon non prouvé. Le message de reprise SHALL interdire toute réponse finale
tant que le gate reste ouvert.

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

Le superviseur SHALL publier localement, sans secret, l'identité du job,
l'état de supervision, le dernier jalon prouvé, l'âge de la dernière activité,
le nombre et le résultat des tentatives de reprise, le gate terminal et la
cause courante. Jalons et gate SHALL provenir du contrat observé du contrôleur.
Les transitions SHALL être journalisées dans le magasin local du superviseur.

#### Scenario: Consultation d'un job non terminal
- **WHEN** un client local consulte l'état d'un job dont le gate est ouvert
- **THEN** il reçoit l'état de supervision et la raison de non-terminalité sans contenu de projet, secret ni décision détaillée

#### Scenario: Jalon et gate observés
- **WHEN** le superviseur réconcilie un job portant un jalon prouvé et un gate OPEN
- **THEN** son statut publie ce jalon et ce gate pour l'identité du job observé

#### Scenario: Réconciliation indisponible
- **WHEN** le contrat courant ne peut plus être relu
- **THEN** le statut rend l'échec et la dernière réconciliation observables sans présenter une nouvelle preuve de jalon ou de gate

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

### Requirement: Activité corrélée à la session du job
Le superviseur SHALL attribuer l'activité SSE uniquement à la session du job
surveillé, avec vérification du répertoire lorsqu'il est fourni. Les trames
étrangères, de transport, invalides ou sans identité exploitable SHALL NOT
actualiser cette horloge. Un changement de job, session ou répertoire SHALL
invalider l'ancienne activité. Le gel de récupération SHALL rester prioritaire.

#### Scenario: Activité de la session surveillée
- **WHEN** un événement de session, message ou permission identifie la session du job et ne présente pas de répertoire divergent
- **THEN** le superviseur actualise l'activité de ce contexte

#### Scenario: Trafic étranger continu
- **WHEN** des événements d'une autre session ou d'un autre répertoire arrivent pendant l'inactivité du job
- **THEN** ils ne retardent pas son examen de reprise à l'échéance configurée

#### Scenario: Transport ou événement non exploitable
- **WHEN** une trame est un heartbeat, un événement de connexion, invalide ou sans session identifiable
- **THEN** l'horloge d'activité du job reste inchangée sans fabriquer de progression

#### Scenario: Session transférée ou contexte remplacé
- **WHEN** le contrat admet un nouveau job, répertoire ou identifiant de session
- **THEN** l'activité de l'ancien contexte ne repousse pas la reprise du nouveau

#### Scenario: Récupération gelée
- **WHEN** le contrat expose une récupération en cours
- **THEN** aucun événement SSE ne déverrouille une relance ni ne remplace la décision de transfert

### Requirement: Reprise métier après prévol corrigé dans la même session
L'orchestrateur MUST conserver le RUN, le job, les jalons, critères et preuves pendant les retries du prévol dans la candidate conservée. Il MUST reprendre seulement après complete au premier jalon non prouvé sans rejouer écriture validée ou autorisation consommée. Le superviseur MUST rester gelé pendant retry.

#### Scenario: Tentatives successives
- **WHEN** les prévols divergent sans effet et chaque frontière est réconciliée
- **THEN** les nouvelles tentatives explicites conservent la candidate et le job, sans concurrence ni doublon, avec suivi à la cadence existante
- **AND** le checkpoint conserve numéro, identifiants, horodatages, causes et références des preuves natives

#### Scenario: Reprise sûre
- **WHEN** le prévol corrigé est prouvé et complete réussit
- **THEN** le superviseur suit la candidate devenue session du job sans rejeu du travail prouvé

#### Scenario: Interruption ou arrêt explicite
- **WHEN** une tentative reste non réconciliée ou le développeur demande l'arrêt
- **THEN** aucune tentative supplémentaire ne part avant réconciliation ou autorisation appropriée

### Requirement: Compteur persistant des tentatives de reprise

Le superviseur MUST exposer `resumeAttemptCount` par job. Un job neuf MUST
commencer à zéro. Avant chaque émission de reprise, le compteur connu MUST
être incrémenté et persisté avec la tentative ; un échec de persistance MUST
interdire l'émission. Le compteur MUST distinguer tentative et succès et
survivre au redémarrage et au transfert de session du même job.

#### Scenario: Émission réussie ou échouée
- **WHEN** une requête de reprise est émise puis réussit ou échoue
- **THEN** elle compte une tentative et son résultat reste publié séparément

#### Scenario: Préparation sans émission
- **WHEN** une relance est refusée, gelée ou abandonnée avant son émission
- **THEN** le compteur ne change pas

#### Scenario: Persistance impossible
- **WHEN** l'enregistrement du compteur et de la tentative échoue
- **THEN** aucune requête de reprise n'est émise

#### Scenario: Même job après interruption ou transfert
- **WHEN** le superviseur redémarre ou suit une nouvelle session du même job
- **THEN** il conserve le compteur connu de ce job

### Requirement: Compatibilité du statut de supervision historique

Un état ancien dépourvu de compteur MUST rester lisible et publier
`resumeAttemptCount: null` pour ce job. Le superviseur MUST NOT reconstruire
le nombre de tentatives depuis la dernière tentative. Un nouveau job MUST
réinitialiser son compteur à zéro et MUST NOT hériter du jalon ou du gate
du job précédent.

#### Scenario: Ancien état sans compteur
- **WHEN** le superviseur restaure un état historique sans compteur pour le même job
- **THEN** le compteur reste inconnu, y compris après de nouvelles tentatives de ce job

#### Scenario: Nouveau job
- **WHEN** le contrat observé désigne un autre job
- **THEN** son compteur commence à zéro et son jalon et son gate proviennent de son propre contrat

### Requirement: Sessions accessibles et traces du compactage commun

Lorsque les deux API sont disponibles, l'orchestrateur SHALL lancer les deux compactages
en parallèle ; sinon, l'orchestrateur SHALL compacter les seules sessions accessibles et
tracer les opérations non exécutées. Le cycle SHALL conserver un identifiant commun, les
identifiants de session disponibles et ceux explicitement non exposés, les horodatages,
résultats natifs et éventuels retards dans le checkpoint non secret.

#### Scenario: Sessions accessibles et traces du compactage commun
- **WHEN** une seule API native de compactage est exposée
- **THEN** l'orchestrateur compacte cette session et trace l'autre comme non exécutée sous le même identifiant de cycle

### Requirement: Échéance suivante du compactage commun

La prochaine échéance SHALL être calculée depuis le déclenchement du cycle commun, sans
remplacer un échec par une réussite rétroactive.

#### Scenario: Échéance suivante du compactage commun
- **WHEN** un cycle de compactage commence après un retard de fin de mandat
- **THEN** la prochaine échéance part du déclenchement observé sans transformer un ancien échec en réussite

### Requirement: Preuves natives du compactage conjoint

Un accusé de lancement, un résumé manuel ou le compactage d'une session auxiliaire SHALL
NOT constituer la preuve de compactage de l'orchestrateur réel. Les deux fins natives
corrélées SHALL être requises pour déclarer une réussite conjointe, pas pour reprendre
un RUN dont l'état reste exploitable.

#### Scenario: Preuves natives du compactage conjoint
- **WHEN** seul un accusé de lancement ou le compactage d'une session auxiliaire existe
- **THEN** aucune réussite conjointe des deux sessions réelles n'est déclarée

### Requirement: Continuité et réconciliation après compactage

Une API de compactage absente SHALL NOT être assimilée à une perte de contexte lorsque
la conversation active, le checkpoint et les preuves disponibles permettent de vérifier
la continuité ; les identifiants non exposés SHALL être signalés sans être inventés.
Avant reprise des mandats, l'orchestrateur SHALL réconcilier les deux contextes, la
santé OpenCode, MCP et la readiness CAB, et vérifier l'absence d'approbation parasite.

#### Scenario: Continuité et réconciliation après compactage
- **WHEN** une API est absente mais la conversation active et le checkpoint restent exploitables
- **THEN** la continuité est vérifiée sans inventer d'identifiant, puis contextes, santé, MCP, readiness et approbations sont réconciliés

### Requirement: Compactage incomplet avec reprise sûre

Si une API requise est indisponible ou si un compactage échoue, l'orchestrateur SHALL
conserver le cycle incomplet et signaler sa cause sans annoncer une synchronisation
réussie. Ce seul écart SHALL NOT classer le RUN `BLOQUÉ`, arrêter CAB, demander une
dérogation humaine ni différer les statistiques ; après réconciliation sûre,
l'orchestrateur SHALL poursuivre les mandats déjà autorisés.

#### Scenario: Compactage incomplet avec reprise sûre
- **WHEN** le compactage échoue mais la réconciliation confirme une reprise sûre
- **THEN** le cycle reste incomplet avec sa cause et les mandats autorisés continuent sans blocage fondé sur ce seul échec ni report des statistiques

### Requirement: Suspension et neutralité du compactage

Un compactage encore en cours ou une réconciliation impossible SHALL suspendre les
opérations concernées selon le protocole CAB. L'orchestrateur SHALL NOT répéter
aveuglément une opération d'effet inconnu ni attendre une API absente ; l'orchestrateur
SHALL réexaminer sa disponibilité à la prochaine échéance du cycle. Ce cycle SHALL NOT
créer une approbation, rejouer une opération, changer le modèle ni fermer ou redémarrer
les processus des agents.

#### Scenario: Suspension et neutralité du compactage
- **WHEN** un compactage reste en cours ou son effet est inconnu
- **THEN** les opérations concernées sont suspendues sans répétition aveugle, nouvelle approbation, rejeu ou redémarrage d'agent

### Requirement: Restauration sans jalon inventé

Une instance redémarrée SHALL restaurer le contrat sans déduire de jalon ni d'état
terminal.

#### Scenario: Restauration sans jalon inventé
- **WHEN** une instance redémarre avec un contrat persistant valide
- **THEN** elle restaure ce contrat sans déduire un jalon ou un état terminal

### Requirement: Tentative unique et neutralité de la relance

Le superviseur SHALL limiter une relance à une tentative en cours et conserver le
résultat observé. Le message de reprise SHALL ne créer ni décision, ni approbation, ni
mandat.

#### Scenario: Tentative unique et neutralité de la relance
- **WHEN** une tentative de reprise est encore en cours
- **THEN** le superviseur n'en lance pas une seconde et ne crée ni décision, ni approbation, ni mandat

### Requirement: Supervision de plusieurs RUN
Le superviseur MUST isoler activité SSE, session, gate, reprise, récupération et attentes de ressources par RUN. Les relances MUST rester techniques et corrélées. Pause, arrêt ou conflit d'un RUN MUST NOT interrompre les pairs indépendants. Une attente de verrou MUST NOT devenir un état terminal ou déclencher une relance métier.

#### Scenario: Isolation concurrente
- **WHEN** un événement de A arrive
- **THEN** l'horloge de B reste inchangée

#### Scenario: Attente de ressource
- **WHEN** A attend une ressource détenue par B et C travaille indépendamment
- **THEN** A reste non terminal sans relance métier, B et C continuent selon leurs propres contrats

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

### Requirement: Restauration compatible du cycle
Les anciens jobs sans lifecycle MUST rester lisibles avec étape inconnue. Un lifecycle présent mais invalide MUST refuser la restauration sans réparation. Un réarmement du même job et une récupération dans le même RUN MUST conserver son historique ; un nouveau job MUST démarrer sans déclaration d'étape.

#### Scenario: Redémarrage après retour en implémentation
- **WHEN** le contrôleur redémarre après un passage REVIEW puis IMPLEMENTATION persisté
- **THEN** il restaure Implémentation 6/11 et les deux passages dans leur ordre
