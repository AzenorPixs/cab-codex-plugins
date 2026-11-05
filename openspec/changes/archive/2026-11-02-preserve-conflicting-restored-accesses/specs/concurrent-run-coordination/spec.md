## ADDED Requirements

### Requirement: Préserver les accès actifs conflictuels après restauration

Le registre MUST conserver les accès actifs présents au redémarrage, même lorsque deux accès concernent le même RUN ou se recouvrent. Chaque accès restauré MUST rester protégé contre l’émission d’une nouvelle permission `once`. Les nouveaux accès recouvrants MUST rester en `WAITING` jusqu’à réconciliation ; les accès disjoints MAY avancer. Un accès mal formé ou un jeton invalide MUST rester refusé.

#### Scenario: Registre avec deux accès actifs recouvrants

- **GIVEN** deux leases actifs conservés dans le registre après un arrêt
- **WHEN** le contrôleur restaure le RUN
- **THEN** il charge les deux accès comme restaurés sans rejeter tout le registre
- **AND** aucun des deux accès ne peut être réutilisé pour une permission native
- **AND** un nouvel accès recouvrant attend tandis qu’un accès disjoint peut être accordé

#### Scenario: Lease restaurée mal formée

- **GIVEN** un accès dont l’identité, les ressources ou le jeton sont invalides
- **WHEN** le registre est restauré
- **THEN** la restauration échoue sans supprimer ni réparer l’accès
