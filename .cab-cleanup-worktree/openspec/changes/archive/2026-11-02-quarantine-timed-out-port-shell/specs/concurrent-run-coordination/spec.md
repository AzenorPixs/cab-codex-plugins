## ADDED Requirements

### Requirement: Quarantine d’un shell port timeouté sans fin native

Un shell foreground timeouté sans `shellID` ni exit MUST rester incertain avec
son port write détenu. CAB MAY quarantiner ce même accès après preuve native
exacte, transcript doublement stable, session inactive et permission absente.
La quarantine garde `once` et l'opération inchangés ; elle ne prouve pas la fin
du shell et n'autorise ni gate ni libération.

#### Scenario: Quarantine d’un timeout exact

- **WHEN** le tool part native exact du seul accès port write est completed avec timeout, sans exit ni shellID, et que deux lectures confirment session inactive, aucune permission et transcript stable
- **THEN** CAB renouvelle le fencing du même accès, conserve son verrou et l’opération `EXECUTING`, et enregistre le reçu `timeoutQuarantine`

#### Scenario: Timeout, permission ou transcript divergent

- **WHEN** une permission est encore présente, la session est active, l’input/callID diverge, le transcript change ou la preuve de timeout est absente
- **THEN** CAB ne crée pas de reçu, ne répond pas à `once`, ne change pas l’accès et conserve l’état incertain

### Requirement: Lecture du port timeouté par son propriétaire

Sous `timeoutQuarantine`, seul le même RUN MAY acquérir, avec une décision CAB
neuve, un accès `read` au même `port:*`. L’accès write initial MUST rester
détenu. Les autres ressources suivent les conflits et leases habituels.

#### Scenario: Browser-check read du même RUN

- **WHEN** le propriétaire demande une lecture du port avec ses autres ressources et leases valides
- **THEN** CAB accorde la lecture sans modifier l’accès write quarantiné ni son opération d’origine

#### Scenario: Écriture concurrente ou autre RUN

- **WHEN** une demande d’accès `write` recouvre le port quarantiné ou un autre RUN demande un accès recouvrant
- **THEN** CAB maintient la demande en attente ou la refuse selon la FIFO, sans accorder de ressource
