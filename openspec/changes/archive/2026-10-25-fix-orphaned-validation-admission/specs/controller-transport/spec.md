## ADDED Requirements

### Requirement: Admission native avant appropriation durable
Le contrôleur MUST vérifier identité, admission locale et ask avant de persister propriétaire et opération ensemble. Après tout contrôle asynchrone, il MUST recontrôler le contexte. Aucun traitement de décision MUST commencer avant succès durable. Une panne de persistance MUST fermer l'admission sans permission.

#### Scenario: Refus ask sans enregistrement partiel
- **WHEN** une notification vise une session devenue allow
- **THEN** aucun propriétaire, opération ou validation n'est créé et aucune permission n'est transmise

### Requirement: Réconciliation explicite du prévol orphelin
POST /runs/<runId>/validation/reconcile MUST exiger transactionId, developerAuthorization, jobId, recoveryId et approval exact. Seul le prévol courant gelé, armé, gate OPEN, sans décision, permission ni effet MUST être admis. Les identités, ask, propriétaire, opération PREPARED et preuves natives PENDING MUST être vérifiés sans reconstruction d'intention.

#### Scenario: Demande orpheline sans effet
- **WHEN** les preuves corrélées et l'autorisation spécifique sont vérifiées
- **THEN** le contrôleur conserve la candidate et crée uniquement une validation apte au rejet explicite, sans décision automatique

#### Scenario: Capacité effectivement chargée
- **WHEN** les statuts du contrôleur et du RUN sont consultés
- **THEN** notificationReconciliation vaut rejection-only-v1 pour identifier cette API indépendamment de la version source de base

#### Scenario: Preuve divergente ou effet incertain
- **WHEN** un champ, préfixe natif, propriétaire ou opération diverge, ou qu'un effet ou accès existe
- **THEN** la réconciliation est refusée sans modifier le job, les pairs ou une décision

### Requirement: Retry préservé après réconciliation de notification
La réconciliation MUST NOT assouplir retry ou complete. Un rejet local explicite et un résultat MCP REJECTED du même approval_id MUST précéder retry. Une perte de contexte local MUST NOT autoriser une restauration automatique depuis le seul reçu.

#### Scenario: Polling et nouvel essai
- **WHEN** le même prévol réconcilié est rejeté et son polling confirme REJECTED
- **THEN** retry existant peut réserver une nouvelle identité dans la même candidate en conservant ses autres gardes
