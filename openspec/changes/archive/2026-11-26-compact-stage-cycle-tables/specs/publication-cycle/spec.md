## ADDED Requirements

### Requirement: Tableau compact des passages par étape

Dans les douze onglets d’étape du détail du RUN, CAB MUST afficher une ligne par passage. Le tableau MUST dimensionner ses colonnes selon le contenu et les titres, sans retour à la ligne ni troncature, avec une colonne Cycle limitée à la largeur de son titre lorsque celui-ci suffit à afficher les valeurs. Le défilement horizontal MUST être limité au tableau et n’être disponible que si celui-ci dépasse l’espace disponible.

#### Scenario: Colonnes dans les douze onglets

- **WHEN** un onglet d’étape affiche ses passages
- **THEN** le tableau affiche Cycle, Début, Fin, CAB, Agents et Attentes, puis Te, CTe, Ts, CTs, Tr, CTr, Tw et CTw pour chaque rôle applicable, puis État
- **AND** chaque compteur cumulé additionne les mesures disponibles de ce rôle dans l’ordre des passages de cette étape, jusqu’au passage de la ligne incluse
- **AND** un cumul sans mesure affiche un tiret et une valeur mesurée à zéro affiche zéro

#### Scenario: Espace disponible pour une ligne complète

- **WHEN** la largeur disponible suffit à afficher toutes les colonnes
- **THEN** le tableau n’a pas de défilement horizontal
- **AND** lorsque la largeur devient insuffisante, le tableau défile horizontalement sans tronquer les cellules ni faire déborder la page

#### Scenario: Passage en cours

- **WHEN** un passage est en cours
- **THEN** une icône rotative accompagne le libellé « En cours » dans la colonne État
- **AND** l’icône reste fixe si la préférence de réduction des animations est activée

#### Scenario: Passage annulé

- **WHEN** un passage est annulé
- **THEN** un triangle jaune avec un point d’exclamation accompagne le libellé « Annulé » dans la colonne État
