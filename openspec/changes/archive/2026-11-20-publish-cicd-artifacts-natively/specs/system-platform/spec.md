## REMOVED Requirements

### Requirement: Builds et releases DIU orchestrés par CAB
**Reason**: La construction et la publication sont désormais prises en charge par les fonctions natives CAB.

## ADDED Requirements

### Requirement: Construction et publication natives des artefacts de livraison
CAB MUST construire et publier les artefacts activés dans les parcours CICD et CICDF à l’aide de ses fonctions natives. Il MUST conserver un reçu par format et par forge, et protéger les résultats indéterminés contre le rejeu.

#### Scenario: Construction des formats activés
- **WHEN** le projet active des artefacts Debian ou Docker
- **THEN** CAB construit ces artefacts avec la recette locale et actualise leur inventaire
- **AND THEN** une image Docker reçoit les tags `<ID>:latest` et `<ID>:<VERSION>`

#### Scenario: Publication de la version livrée
- **WHEN** les envois Git et les constructions sont confirmés
- **THEN** CAB appelle la fonction de chaque forge présente dans la livraison pour les seuls formats construits et la version livrée
- **AND THEN** le moteur conserve les réponses incertaines et relit les artefacts confirmés

#### Scenario: Report explicite de publication
- **WHEN** le développeur diffère les publications d’un RUN et d’une version
- **THEN** CAB conserve la décision sur ce seul reçu, avec les étapes de publication comme non exécutées
