## ADDED Requirements

### Requirement: Regroupement des remédiations MCP

Pour une même identité d’agent et un même emplacement, CAB MUST traiter les pertes dont les périodes de remédiation se chevauchent comme un incident unique. CAB MUST conserver les reçus des contrôles déjà engagés et préserver les protections des effets incertains.

#### Scenario: Plusieurs relais sont perdus pendant le même incident
- **WHEN** plusieurs relais de la même instance et du même emplacement perdent leur connexion pendant la remédiation
- **THEN** une seule observation conduit un nouveau contrôle ou publie un bilan de perte
- **AND THEN** les observations secondaires sont conservées sans relance ni notification supplémentaire, sauf pour rapporter un effet incertain déjà engagé

#### Scenario: Plusieurs relais courants servent déjà la même instance
- **WHEN** CAB observe au moins une autre liaison authentifiée de cette instance au même emplacement, fraîche, vivante et à la version attendue jusqu’au catalogue
- **THEN** la perte devient sans objet sans attribuer un rétablissement à un contrôle ni ignorer la surveillance du nombre de liaisons

### Requirement: Stabilisation de la topologie MCP

CAB MUST confirmer la présence des mêmes relais et de leurs catalogues sur une fenêtre d’observation avant de remédier à un excès de liaisons. CAB MUST limiter le contrôle topologique des doublons à une admission par incident. CAB MUST confirmer le rétablissement uniquement après observation stable d’une seule liaison vérifiée.

#### Scenario: Le catalogue ou les relais oscillent pendant la reconnexion
- **WHEN** les liaisons ou catalogues changent pendant la fenêtre d’observation
- **THEN** CAB attend une nouvelle fenêtre complète avant un contrôle topologique ou une notification de rétablissement

#### Scenario: Les doublons persistent malgré un contrôle
- **WHEN** un premier contrôle topologique a été admis et que la topologie reste en écart
- **THEN** CAB conserve l’incident et poursuit la surveillance sans répéter ce contrôle

#### Scenario: Une seule liaison vérifiée reste disponible
- **WHEN** le relais, le moteur et le catalogue de la même liaison unique demeurent vérifiés sur toute la fenêtre
- **THEN** CAB confirme le rétablissement une fois
