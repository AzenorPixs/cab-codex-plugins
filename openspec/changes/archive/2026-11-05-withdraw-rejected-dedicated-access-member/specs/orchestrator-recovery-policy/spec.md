## ADDED Requirements

### Requirement: Retrait du membre refusé d’un accès dédié
La récupération SHALL admettre withdraw-unissued-validation pour l’unique membre PREPARED/APPROVED d’un accès HELD dédié de même identité, non restauré/non quarantiné, sans native/nativeResult/once, sous rejet natif ACK204 et deux frontières stables. Elle SHALL annuler seulement le membre, conserver APPROVED et l’accès inchangé. La libération SHALL rester une action release-access distincte sous ses gardes et son propre reçu, sans token public ni rejeu.

#### Scenario: Retrait puis libération avec token perdu
- **GIVEN** un edit divergent refusé, un accès dédié à ce seul membre et un SID idle sans permission
- **WHEN** le propriétaire applique le retrait sur preuves exactes
- **THEN** le membre devient CANCELLED et le parent HELD/token/fencing/membership/révisions/baux restent identiques
- **WHEN** il choisit ensuite une libération ordinaire admissible sur le plan frais
- **THEN** un second reçu constate RELEASED sans exposition de token ni nouvelle once/résultat natif

#### Scenario: Frontière non qualifiée
- **WHEN** une identité, un ACK, un outil, un effet, une permission ou l’empreinte diverge, ou l’accès dédié est restauré/quarantiné
- **THEN** le retrait reste refusé et les protections sont conservées
