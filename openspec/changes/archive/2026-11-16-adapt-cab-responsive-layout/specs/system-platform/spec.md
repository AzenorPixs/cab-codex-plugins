## ADDED Requirements

### Requirement: Interface CAB adaptée aux écrans
L’interface CAB MUST adapter ses pages, sa navigation et ses fenêtres à la largeur disponible. La présentation existante en 3840 × 2160 MUST rester la référence sur grand écran. Les données, états et actions MUST rester accessibles.

#### Scenario: Grand écran de référence
- **WHEN** une page CAB est affichée en 3840 × 2160
- **THEN** elle conserve ses dispositions de référence et ses commandes.

#### Scenario: Téléphone ou tablette
- **WHEN** la largeur disponible ne permet plus la présentation de référence
- **THEN** la navigation, les blocs et les fenêtres s’adaptent sans débordement horizontal de la page et les textes longs restent lisibles.

#### Scenario: Sessions sur écran contraint
- **WHEN** un tableau de sessions ou d’archives ne dispose pas de la largeur nécessaire
- **THEN** ses données et actions restent accessibles dans une présentation adaptée avec leurs libellés.

#### Scenario: Contenu et opérations préservés
- **WHEN** la présentation change selon la taille de l’écran
- **THEN** CAB conserve les mêmes données, les mises à jour en direct et les mêmes actions métier.
