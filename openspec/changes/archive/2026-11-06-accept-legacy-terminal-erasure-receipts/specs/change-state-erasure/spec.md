## ADDED Requirements

### Requirement: Terminaison historique sans champ nativeResult
CAB MAY qualifier pour l’effacement un ancien reçu COMPLETED dépourvu de nativeResult et de testReservationId, avec once acquittée, identité native complète, empreinte de fin, dates cohérentes et accès exact RELEASED muni de son empreinte de restitution. CAB SHALL conserver les données historiques sans fabriquer un statut natif ou exit. Le scope signé SHALL identifier les opérations qualifiées par cette lecture.

#### Scenario: Reçu terminal ancien complet
- **WHEN** le reçu satisfait les liaisons, empreintes et états historiques et toutes les autres gardes de clôture
- **THEN** le nettoyage peut poursuivre vers PURGED sans écrire nativeResult

#### Scenario: Reçu incomplet ou opération non terminée
- **WHEN** la once, une identité, date ou empreinte manque, un accès ne correspond pas, un bail de test manque de résultat, ou un résultat explicite est invalide
- **THEN** CAB refuse l’effacement et conserve les protections
