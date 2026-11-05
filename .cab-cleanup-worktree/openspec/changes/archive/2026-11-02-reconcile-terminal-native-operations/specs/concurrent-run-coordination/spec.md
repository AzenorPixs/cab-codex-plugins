## MODIFIED Requirements

### Requirement: Acquisition atomique des accès partagés

CAB MUST attribuer l'ensemble demandé de ressources partagées en une
transaction durable, ou n'en attribuer aucune. Les lectures MUST être
compatibles entre elles et toute écriture MUST exclure les accès recouvrants.
Chaque acquisition MUST porter une identité d'opération et un jeton de
génération non réutilisable. Des acquisitions distinctes du même RUN MAY
coexister uniquement si leurs ensembles complets sont compatibles ; une
extension d’un accès détenu reste refusée.

#### Scenario: Deux fichiers dont un occupé

- **WHEN** A demande deux fichiers et un seul est détenu par B
- **THEN** A attend sans verrou partiel et un RUN indépendant continue

#### Scenario: Lectures compatibles

- **WHEN** A et B lisent une même ressource sans écrivain antérieur incompatible
- **THEN** leurs accès peuvent coexister

#### Scenario: Opération indépendante dans le même RUN

- **WHEN** un accès d’un RUN est `UNKNOWN` sur une ressource et le même RUN
  demande un ensemble complet distinct sans recouvrement
- **THEN** l’accès indépendant peut être accordé
- **AND** une demande d’écriture recouvrante reste `WAITING`

#### Scenario: Extension pendant détention

- **WHEN** un détenteur demande une extension à son accès déjà actif
- **THEN** CAB refuse l’extension et exige une nouvelle acquisition complète
