## ADDED Requirements

### Requirement: Réconciliation d’une validation annulée par OpenCode

Le contrôleur MAY clore une validation `PREPARED` sans décision seulement sur
preuve terminale native `CANCELLED` par OpenCode. Il MUST vérifier l’identité
exacte, deux lectures stables, la session inactive et l’absence de permission,
d’opération native commencée et d’accès lié. Il MUST persister `CANCELLED` sans
décision, permission, accès ni `once`, puis retirer la validation indécise.
Toute divergence ou activité MUST conserver l’état protégé.

#### Scenario: Annulation OpenCode stable sans effet

- **WHEN** la demande exacte est terminale CANCELLED par OpenCode et deux lectures natives identiques prouvent l’identité exacte, session idle et absence d’effet
- **THEN** l’opération devient CANCELLED sans décision, accès ni permission et le RUN peut préparer une autre demande distincte

#### Scenario: Annulation divergente ou frontière native active

- **WHEN** l’identité, le transcript, la session, la permission ou l’état de l’opération diverge ou reste actif
- **THEN** CAB conserve l’opération préparée ou indécise sans libérer de ressource ni créer de décision
