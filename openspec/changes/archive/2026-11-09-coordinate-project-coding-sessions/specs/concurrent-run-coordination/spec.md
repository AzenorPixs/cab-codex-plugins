## ADDED Requirements

### Requirement: Avis de dépendance et autorité du projet
Les avis de coordination entre sessions directes ou pilotées MUST rester distincts des réservations et de leur autorité. Une notification MUST NOT modifier une réservation, une pause, un accès ou un autre RUN. Les contrôles du référentiel projet et les preuves propres au destinataire MUST rester nécessaires avant toute action dépendante.

#### Scenario: Avis pour un RUN en pause
- **WHEN** un RUN en pause reçoit un avis de dépendance
- **THEN** sa pause et ses protections restent inchangées et l'avis reste consultable
