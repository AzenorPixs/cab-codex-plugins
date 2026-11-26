## MODIFIED Requirements

### Requirement: Tableau compact des passages par étape

Dans les douze onglets, CAB MUST garder une ligne par passage. Cycle, Début, Fin, CAB, Agents et Attentes MUST utiliser des gabarits fixes. Les colonnes de tokens MUST partager une largeur suffisante pour `999 M`. État MUST recevoir la largeur restante. Le défilement horizontal MUST rester limité au tableau.

#### Scenario: Colonnes dans les douze onglets

- **WHEN** un onglet d’étape affiche ses passages
- **THEN** le tableau affiche Cycle, Début, Fin, CAB, Agents et Attentes, puis Te, CTe, Ts, CTs, Tr, CTr, Tw et CTw pour chaque rôle applicable, puis État
- **AND** les colonnes CTe, CTs, CTr et CTw restent vides et sans liaison aux mesures
- **AND** le texte complet d’une valeur dépassant sa colonne reste consultable dans son infobulle

#### Scenario: Largeurs fixes des colonnes de passage

- **WHEN** un onglet affiche le tableau Cycle
- **THEN** Cycle est dimensionné sur son titre suivi de deux espaces
- **AND** Début et Fin sont dimensionnés sur une date complète avec heures, minutes et secondes suivie de deux espaces
- **AND** CAB, Agents et Attentes sont dimensionnés sur `9999,9 s` suivi de deux espaces

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

#### Scenario: Passage non exécuté

- **WHEN** un passage porte l’état « Non exécuté »
- **THEN** un cercle gris avec un tiret accompagne son libellé dans la colonne État

## ADDED Requirements

### Requirement: Dernier cycle dans le titre de chaque étape

Dans chaque onglet d’étape du détail de session, CAB MUST afficher le pictogramme du dernier passage immédiatement après le titre de l’étape. Sa taille MUST suivre celle du titre. À sa suite, « Dernier Cycle de cette étape » MUST présenter la durée et les quatre mesures de tokens de ce passage pour chaque rôle applicable.

#### Scenario: Dernier passage disponible

- **WHEN** l’étape possède plusieurs passages chronologiques
- **THEN** le pictogramme et les valeurs proviennent exclusivement du dernier passage observé de cette étape
- **AND** la durée est suivie de Token/Entrant, Token/Sortant, Tokens lus dans le cache et Tokens écrits dans le cache pour le ou les rôles applicables
- **AND** une mesure indisponible affiche un tiret

#### Scenario: Aucun passage disponible

- **WHEN** l’étape n’a aucun passage observé
- **THEN** son titre reste seul sans résumé du dernier cycle
