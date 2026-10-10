## ADDED Requirements

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
