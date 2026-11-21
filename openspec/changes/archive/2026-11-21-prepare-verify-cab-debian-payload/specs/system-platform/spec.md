## ADDED Requirements

### Requirement: Régénération du paquet Debian CAB

La fabrication native d’une recette installant le manifeste du runtime CAB
MUST reconstruire le frontend et générer le code Python et le manifeste dans
un espace neuf, à partir de sources alignées sur la version demandée. La
préparation MUST s’exécuter avec l’identité non privilégiée du projet.

#### Scenario: Ancien répertoire de préparation
- **WHEN** le projet contient un ancien frontend ou runtime préparé
- **THEN** la fabrication régénère ces éléments et écarte leur copie antérieure.

### Requirement: Contrôle Debian CAB avant publication

CAB MUST vérifier la version Debian, la version Python, la version du
manifeste et les empreintes Python, Web et des archives de dépendances dans
le paquet assemblé. La publication MUST vérifier l’artefact transmis avant
toute création de release ou d’asset.

#### Scenario: Paquet avec contenu périmé
- **WHEN** un paquet annonce la version demandée mais contient un manifeste ou un runtime plus ancien
- **THEN** CAB refuse le paquet et la publication de son artefact.
