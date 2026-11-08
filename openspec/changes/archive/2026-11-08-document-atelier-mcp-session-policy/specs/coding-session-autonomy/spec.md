## ADDED Requirements

### Requirement: Diagnostic de visibilité des méthodes d’atelier

Le protocole MUST documenter la vérification des permissions natives des méthodes `atelier_execute` et `atelier_status` lorsque l’atelier est nécessaire ou que leur discovery échoue. Dans le mandat existant, l’orchestrateur MAY corriger les seules règles du SID ciblé et MUST préserver les autres protections et vérifier la discovery avant usage.

#### Scenario: Règle universelle masque l’atelier
- **WHEN** le broker est connecté mais les deux méthodes sont masquées par deny dans la session
- **THEN** le propriétaire vérifie et corrige seulement les deux règles nécessaires, puis relit la policy et la discovery

#### Scenario: Session occupée ou frontière incertaine
- **WHEN** la session est active ou une permission est en attente
- **THEN** le protocole ne modifie pas sa politique avant réconciliation
