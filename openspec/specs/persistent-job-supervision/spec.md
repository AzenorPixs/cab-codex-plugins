# persistent-job-supervision Specification

## Purpose
Cette capacité maintient un contrat de job durable et observable afin qu'une
interruption conversationnelle ne soit jamais confondue avec une fin de job.

## Requirements

### Requirement: Compactage coordonné des deux sessions

L'orchestrateur SHALL déclencher un cycle commun de compactage de sa session
et de la session de codage toutes les 1 h 30 (5 400 secondes). À l'échéance,
il SHALL suspendre les nouveaux mandats, attendre l'achèvement du mandat
autorisé en cours et traiter son rapport, puis lancer les deux compactages
en parallèle sans attendre la fin de l'un avant de déclencher l'autre. Le
cycle SHALL conserver un identifiant commun, les deux identifiants de session,
les horodatages, résultats natifs et éventuels retards dans le checkpoint non
secret. La prochaine échéance SHALL être calculée depuis le déclenchement du
cycle commun, sans remplacer un échec par une réussite rétroactive.

Un accusé de lancement, un résumé manuel ou le compactage d'une session
auxiliaire SHALL NOT constituer la preuve de compactage de l'orchestrateur
réel. Avant reprise des mandats, l'orchestrateur SHALL observer les deux fins
natives corrélées, réconcilier les deux contextes, la santé OpenCode, MCP et
la readiness CAB, et vérifier l'absence d'approbation parasite. Si une API
requise est indisponible ou si un compactage échoue, il SHALL conserver le
cycle incomplet et signaler sa cause sans annoncer une synchronisation
réussie. Ce cycle SHALL NOT créer une approbation, rejouer une opération,
changer le modèle ni fermer ou redémarrer les processus des agents.

#### Scenario: Échéance entre deux mandats

- **WHEN** l'échéance de 5 400 secondes est atteinte et aucun mandat n'est en cours
- **THEN** l'orchestrateur déclenche les deux compactages en parallèle dans un même cycle et ne reprend qu'après leurs preuves natives et la réconciliation

#### Scenario: Échéance pendant une exécution

- **WHEN** l'échéance est atteinte pendant l'unique opération déjà autorisée
- **THEN** l'orchestrateur laisse cette opération s'achever, traite son rapport, rend le retard observable et compacte les deux sessions avant tout nouveau mandat

#### Scenario: Compactage de l'orchestrateur non prouvé

- **WHEN** seule la session de codage ou une session auxiliaire est compactée, ou que l'API de l'orchestrateur réel est indisponible
- **THEN** le cycle reste incomplet avec sa cause et aucune réussite conjointe n'est déclarée

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
