## MODIFIED Requirements

### Requirement: Relance technique corrélée à la session

Pour un job historique sans RUN, après le délai configurable de 60 secondes par défaut, le superviseur SHALL vérifier OpenCode, SSE, readiness CAB et gate avant un message corrélé demandant examen de l’état, du SSE et de CAB puis poursuite du premier jalon non prouvé. Ce message MUST NOT créer mandat ou permission et SHALL interdire une réponse finale tant que le gate reste ouvert.

#### Scenario: Session inactive et reprise admissible

- **WHEN** la session historique sans RUN enregistrée est inactive, que le gate est ouvert et que
  les contrôles techniques sont exploitables après la pause de reprise
- **THEN** le superviseur envoie un unique message de reprise à cette session
  et mémorise sa tentative

#### Scenario: Contrôle technique non exploitable

- **WHEN** OpenCode, le SSE ou la readiness CAB ne permet pas une reprise sûre
- **THEN** le superviseur ne relance pas la session, conserve le gate ouvert et
  publie la cause ainsi que l'action recommandée


## ADDED Requirements

### Requirement: Attente de mandat destinée à l’orchestrateur

Pour un RUN piloté sans mandat courant, le superviseur MUST publier une attente observable destinée à l’orchestrateur et MUST NOT envoyer de prompt générateur à OpenCode. Le job et le gate MUST être conservés. Un mandat courant, une récupération, une pause, un accès ou une permission non résolus MUST NOT être contournés par cette attente.

#### Scenario: RUN sans mandat après récupération
- **WHEN** la récupération est achevée et le RUN ne déclare aucun mandat courant
- **THEN** le superviseur publie l’attente de l’orchestrateur sans prompt OpenCode, commande, décision ou fermeture du job

#### Scenario: Analyse ou mandat déjà déclaré
- **WHEN** le RUN déclare un mandat courant ou conserve un effet non résolu
- **THEN** le superviseur conserve la garde correspondante et ne génère aucun travail supplémentaire

