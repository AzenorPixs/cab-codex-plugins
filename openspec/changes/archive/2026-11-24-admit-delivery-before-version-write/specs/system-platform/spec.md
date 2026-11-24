## ADDED Requirements

### Requirement: Admission durable avant modification de la version
CAB MUST enregistrer la livraison et ses étapes avant de modifier la version
du projet. Une livraison déjà enregistrée MUST conserver ses étapes et reçus.

#### Scenario: Connecteur perdu avant admission
- **WHEN** le contrôle final de liaison refuse le connecteur avant la création de la livraison
- **THEN** CAB conserve la version du projet et la proposition encore applicable
- **AND** après rétablissement du connecteur et vérification des prérequis, le même RUN peut reprendre la publication avec la même version
