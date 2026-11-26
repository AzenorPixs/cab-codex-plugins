## MODIFIED Requirements

### Requirement: Tableau compact des passages par étape

Dans les douze onglets d’étape, CAB MUST garder chaque passage sur une ligne. Cycle MUST s’ajuster à son titre lorsqu’il suffit. Début, Fin, CAB, Agents et Attentes MUST s’ajuster au titre et au contenu avec un espace ajouté. Les compteurs MUST partager une largeur fixe suffisante pour `999 M`. État MUST recevoir la largeur restante. Le défilement horizontal MUST rester limité au tableau.

#### Scenario: Colonnes dans les douze onglets

- **WHEN** un onglet d’étape affiche ses passages
- **THEN** le tableau affiche Cycle, Début, Fin, CAB, Agents et Attentes, puis Te, CTe, Ts, CTs, Tr, CTr, Tw et CTw pour chaque rôle applicable, puis État
- **AND** chaque compteur cumulé additionne les mesures disponibles de ce rôle dans l’ordre des passages de cette étape, jusqu’au passage de la ligne incluse
- **AND** un cumul sans mesure affiche un tiret et une valeur mesurée à zéro affiche zéro
- **AND** les titres et les valeurs de Début, Fin, CAB, Agents, Attentes et État restent entiers

#### Scenario: Compteurs de tailles différentes

- **WHEN** les compteurs ont des contenus de tailles différentes
- **THEN** leurs colonnes gardent la même largeur et affichent `999 M` en entier
- **AND** toute valeur dont le format dépassera cette largeur reste consultable en entier dans son infobulle

#### Scenario: Espace disponible pour une ligne complète

- **WHEN** la largeur disponible suffit à afficher toutes les colonnes
- **THEN** État reçoit la largeur restante et le tableau n’a pas de défilement horizontal
- **AND** lorsque la largeur devient insuffisante, le tableau défile horizontalement sans faire déborder la page

#### Scenario: Passage en cours

- **WHEN** un passage est en cours
- **THEN** une icône rotative accompagne le libellé « En cours » dans la colonne État
- **AND** l’icône reste fixe si la préférence de réduction des animations est activée

#### Scenario: Passage annulé

- **WHEN** un passage est annulé
- **THEN** un triangle jaune avec un point d’exclamation accompagne le libellé « Annulé » dans la colonne État

#### Scenario: Passage terminé

- **WHEN** un passage est terminé
- **THEN** une coche verte accompagne le libellé « Terminé » dans la colonne État
