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
- **AND** Début et Fin sont dimensionnés sur une date complète avec heures, minutes et secondes suivie de trois espaces
- **AND** CAB, Agents et Attentes sont dimensionnés sur `9999,9 s` suivi de trois espaces

#### Scenario: Compteurs de tailles différentes

- **WHEN** les compteurs ont des contenus de tailles différentes
- **THEN** les huit colonnes de chaque rôle partagent la largeur de `999 M` suivie d’une espace fine
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

### Requirement: Durées explicites du résumé et des actions
Résumé MUST afficher « Durée totale de tous les cycles » sous les étapes, et « Durée totale du dernier cycle » après une barre verticale à droite du titre des étapes. Chaque tableau Actions · Itération MUST ajouter Durée après Retour ou validation. Le format commun MUST afficher des secondes jusqu’à 60 secondes incluses, minutes et secondes au-delà, heures, minutes et secondes au-delà de 60 minutes. Une durée absente MUST rester non observée.

#### Scenario: Action longue et deux cycles
- **WHEN** une action dure 3661,2 secondes et les deux cycles durent 100 et 200 secondes
- **THEN** la colonne affiche 1 h 1 m 1,2 s dans un onglet d’étape, le cumul affiche 5 min 0 s et le dernier cycle 3 min 20 s.

#### Scenario: Unités des douze onglets d’étape

- **WHEN** une durée est affichée dans un sous-onglet d’étape
- **THEN** ses unités sont `h`, `m` et `s` selon les seuils communs
- **AND** Résumé et les autres vues conservent le format commun
