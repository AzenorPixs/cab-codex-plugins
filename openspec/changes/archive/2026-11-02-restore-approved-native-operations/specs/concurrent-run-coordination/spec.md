## ADDED Requirements

### Requirement: Incertitude native limitée aux ressources concernées

Une opération à frontière native inconnue MUST conserver un accès protégé
uniquement pour les ressources de son manifeste. Elle MUST NOT déclencher un
gel global ni empêcher l’acquisition d’un ensemble complet de ressources
indépendant et compatible. Les écritures recouvrantes MUST attendre jusqu’à
une frontière native prouvée. Une permission inconnue MUST NOT être assimilée
à un accès libre.

#### Scenario: RUN indépendant sans recouvrement

- **WHEN** un RUN conserve une opération native `UNKNOWN` et qu’un autre RUN
  demande un ensemble complet sans recouvrement
- **THEN** l’accès indépendant peut être accordé selon les règles normales

#### Scenario: Écriture recouvrante

- **WHEN** un RUN demande une écriture sur une ressource protégée par une
  opération native `UNKNOWN`
- **THEN** il reste en attente et aucune permission ou effet n’est accordé

#### Scenario: Fin native ciblée

- **WHEN** une fin native exacte est prouvée pour l’opération inconnue
- **THEN** CAB clôt cette opération et ne libère que son accès ; les autres
  accès restent inchangés
