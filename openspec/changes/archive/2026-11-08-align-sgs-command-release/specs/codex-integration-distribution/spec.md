## ADDED Requirements

### Requirement: Versions cohérentes des commandes CAB

La distribution MUST annoncer la même version de base sur CAB, CABU, SGS et CCAB que celle du paquet CAB. Une vérification automatisée MUST détecter toute divergence avant publication.

#### Scenario: Commande SGS antérieure
- **WHEN** le frontmatter SGS diffère de la version CAB
- **THEN** le contrôle de distribution échoue avant livraison

#### Scenario: Commandes alignées
- **WHEN** les quatre commandes portent la version du paquet
- **THEN** le contrôle de cohérence des versions réussit
