## ADDED Requirements

### Requirement: Informations de session en lignes de bloc forge
Le corps de l’onglet Informations MUST utiliser une ligne par information avec un libellé à gauche et sa valeur à droite. Le détail du RUN MUST fournir la synthèse persistée. L’indisponibilité du détail des étapes MUST laisser visibles les compteurs enregistrés.

#### Scenario: Détail des étapes indisponible
- **WHEN** le détail des étapes échoue et que le RUN contient une synthèse persistée
- **THEN** les lignes du bloc Informations affichent les données persistées et demeurent actualisées par Electric.
