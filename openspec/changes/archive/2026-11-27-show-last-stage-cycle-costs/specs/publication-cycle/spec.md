## MODIFIED Requirements

### Requirement: Tableau compact des passages par étape

Dans les douze onglets, CAB MUST garder une ligne par passage. Cycle, Début, Fin, CAB, Agents et Attentes MUST utiliser des gabarits fixes. Les colonnes de tokens MUST partager une largeur suffisante pour `999 M`. État MUST recevoir la largeur restante. Le défilement horizontal MUST rester limité au tableau.

#### Scenario: Colonnes dans les douze onglets

- **WHEN** un onglet d’étape affiche ses passages
- **THEN** le tableau affiche Cycle, Début, Fin, CAB, Agents et Attentes, puis Te, CTe, Ts, CTs, Tr, CTr, Tw et CTw pour chaque rôle applicable, puis État
- **AND** les colonnes CTe, CTs, CTr et CTw affichent les coûts fournis pour le passage et restent vides quand ces coûts sont indisponibles
- **AND** le texte complet d’une valeur dépassant sa colonne reste consultable dans son infobulle

#### Scenario: Largeurs fixes des colonnes de passage

- **WHEN** un onglet affiche le tableau Cycle
- **THEN** Cycle est dimensionné sur son titre suivi de deux espaces
- **AND** Début et Fin sont dimensionnés sur une date complète avec heures, minutes et secondes suivie de trois espaces
- **AND** CAB, Agents et Attentes sont dimensionnés sur le même gabarit `9999,9 s` suivi de quatre espaces

#### Scenario: Compteurs de tailles différentes

- **WHEN** les compteurs ont des contenus de tailles différentes
- **THEN** les huit colonnes de chaque rôle partagent la largeur de `999 M` suivi de deux espaces ordinaires
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

#### Scenario: Passage non exécuté

- **WHEN** un passage porte l’état « Non exécuté »
- **THEN** un cercle gris avec un tiret accompagne son libellé dans la colonne État

## ADDED Requirements

### Requirement: Coûts du dernier passage dans le bloc des étapes

Dans les douze onglets d’étape, le bloc avant Cycle MUST présenter les durées, les compteurs de tokens et les coûts en trois colonnes équilibrées lorsque la largeur le permet. Une séparation verticale MUST délimiter chaque groupe de tokens et de coûts. Chaque ligne « Coût » MUST reprendre la valeur de la cellule de coût correspondante du dernier passage de l’étape, par type de token et par rôle.

#### Scenario: Plusieurs passages et coûts distincts

- **WHEN** le tableau contient un coût pour un type de token du dernier passage
- **THEN** la même valeur figure sur sa ligne Coût, y compris si elle vaut zéro
- **AND** les coûts éventuels des passages précédents ne contribuent pas à ce bloc

#### Scenario: Coût indisponible

- **WHEN** la cellule correspondante du dernier passage est vide ou que le passage est absent
- **THEN** le bloc affiche un tiret pour ce coût

#### Scenario: Écran étroit

- **WHEN** les trois colonnes ne tiennent plus dans le bloc
- **THEN** elles sont empilées avec une séparation horizontale et restent accessibles
