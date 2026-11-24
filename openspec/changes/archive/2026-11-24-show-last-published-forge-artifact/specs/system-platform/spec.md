## ADDED Requirements

### Requirement: Affichage du dernier artefact publié dans une carte de forge

Pour chaque format activé, CAB MUST afficher une seule ligne dans la carte de la forge, à partir de l’artefact et du tag en tête de l’inventaire ordonné. CAB MUST conserver l’indication de dernière observation lorsque la forge est indisponible.

#### Scenario: Plusieurs versions ou paquets observés

- **WHEN** l’inventaire d’une forge expose plusieurs paquets Debian d’une publication ou plusieurs tags Docker
- **THEN** la carte affiche une seule observation par format, avec le premier nom et le premier tag, sans modifier les données d’inventaire.
