## MODIFIED Requirements

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
