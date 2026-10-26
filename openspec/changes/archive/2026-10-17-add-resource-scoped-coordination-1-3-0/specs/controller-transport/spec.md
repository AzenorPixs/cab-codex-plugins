# Contrôleur et accès ciblés — delta 1.3.0

## ADDED Requirements

### Requirement: Interfaces de coordination ciblées
Le contrôleur MUST exposer acquisition, consultation, annulation d'attente et libération d'accès par RUN, ainsi que publication ciblée et gel exceptionnel. Les mutations MUST contrôler propriétaire, contexte, génération, contenu et idempotence. Une mutation sans cible non ambiguë MUST être refusée.

#### Scenario: Acquisition dans un autre RUN
- **WHEN** une demande ne correspond pas au propriétaire ou au contexte ciblé
- **THEN** elle est refusée sans attribution de protection ni permission

### Requirement: Recontrôle des protections avant once
Après chaque contrôle asynchrone et avant once, le contrôleur MUST recontrôler admission, génération, révisions, identité d'opération et accès compatible. Les gardes natives ask et la consommation unique MUST être conservées. Une décision approved historique MUST rester intacte si l'opération n'est plus exécutable.

#### Scenario: Jeton devenu périmé
- **WHEN** le jeton est libéré pendant une vérification native
- **THEN** aucune permission once n'est transmise

#### Scenario: Règle native devenue allow
- **WHEN** les protections sont valides mais la règle native n'est plus ask
- **THEN** la permission reste refusée conformément aux gardes existantes

### Requirement: Fin native corrélée avant libération
Le contrôleur MUST corréler la fin native aux opérations protégées et conserver tout effet incertain. Un état idle ou une absence de permission seule MUST NOT prouver la fin des effets. La libération MUST exiger les preuves techniques et l'examen de l'orchestrateur prévus pour cette frontière.

#### Scenario: Fin SSE perdue
- **WHEN** une session devient idle sans fin d'outil corrélée exploitable
- **THEN** ses protections restent détenues jusqu'à réconciliation

### Requirement: Gate sans protection non résolue
Un gate terminal normal MUST être refusé tant que le RUN conserve un effet non résolu, un groupe actif ou une acquisition non clôturée. Une attente de ressource MUST rester non terminale. Le gate MUST conserver ses gardes antérieures sans dépendre des attentes métier indépendantes des pairs.

#### Scenario: Rapport terminé mais effet incertain
- **WHEN** le rapport existe mais une ancienne acquisition du RUN reste d'issue inconnue
- **THEN** le gate normal reste refusé et le change n'est pas livré

### Requirement: Publication sans cohorte générale
La publication ciblée MUST contrôler les seules protections, révisions et preuves nécessaires. Une activité native indépendante MUST NOT exiger ready, quiescence ou réconciliation générale. Le reçu MUST être durable et distinct du gate et d'une approbation.

#### Scenario: Pair occupé indépendant
- **WHEN** B exécute une opération indépendante pendant la publication de A
- **THEN** la seule activité de B ne refuse pas la publication de A


### Requirement: Compatibilité historique sans concurrence implicite
L'usage historique unique sans RUN MUST conserver ses décisions et once, sans coexister avec les RUN coordonnés. Son usage mutable MUST laisser une trace durable de sessions/racines. Le passage au profil Multi-RUN MUST exiger une clôture explicite sous réconciliation globale, avec quiescence native et preuves des effets ; idle seul MUST NOT effacer cette trace.

#### Scenario: Passage depuis un usage historique
- **WHEN** une permission historique a été consommée puis un RUN concurrent est demandé
- **THEN** l'admission attend une clôture réconciliée des sessions/racines historiques sans rejouer la permission
