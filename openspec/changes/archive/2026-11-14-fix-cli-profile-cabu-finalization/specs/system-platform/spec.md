## ADDED Requirements

### Requirement: Finalisation du profil Codex CLI dédié
La validation du plan CABU MUST accepter codex-cli au même titre que codex et
opencode. Elle MUST conserver le compte et le profil dédiés du connecteur CLI.

#### Scenario: Profil CLI enrôlé
- **WHEN** un acteur codex-cli valide possède son profil local authentifié
- **THEN** cab finalize installe et vérifie ses intégrations au lieu de refuser son plan

### Requirement: Version corrective après échec CABU
finalization.retarget_release MUST permettre à l'autorité ou à l'admin local de
cibler le patch immédiatement suivant après CABU FAILED. La transition MUST être
idempotente et tracée, sans installation. Elle MUST conserver critères métier,
contrôles, producteurs et revue, ainsi que mandat, contrat et échec initiaux.
Seule la version littérale change ; une nouvelle preuve MUST être exigée.

#### Scenario: Patch correctif validé
- **WHEN** une livraison FAILED non encore prouvée est suivie d'une version corrective autorisée, avec empreinte courante, justification, nouvel identifiant CABU et sans effet, bail, gel, import ou revue
- **THEN** le même SID/RUN conserve son historique et attend le nouveau CABU sans rejouer l'ancien

#### Scenario: Effet indécis ou saut de version
- **WHEN** le CABU précédent est UNKNOWN ou la cible dépasse le patch immédiatement suivant
- **THEN** CAB refuse la transition et conserve toutes les protections
