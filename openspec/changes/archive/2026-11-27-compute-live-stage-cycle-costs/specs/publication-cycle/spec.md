## MODIFIED Requirements

### Requirement: Tableau compact des passages par étape

Dans les douze onglets, CAB MUST garder une ligne par passage. Cycle, Début, Fin, CAB, Agents et Attentes MUST utiliser des gabarits fixes. Les colonnes de tokens MUST partager une largeur suffisante pour `99 999,99 M`. État MUST recevoir la largeur restante. Le défilement horizontal MUST rester limité au tableau.

#### Scenario: Colonnes dans les douze onglets

- **WHEN** un onglet d’étape affiche ses passages
- **THEN** le tableau affiche Cycle, Début, Fin, CAB, Agents et Attentes, puis Te, Ts, Tr, Tw, puis CTe, CTs, CTr et CTw pour chaque rôle applicable, puis État
- **AND** les colonnes CTe, CTs, CTr et CTw affichent les coûts fournis pour le passage et restent vides quand ces coûts sont indisponibles
- **AND** le texte complet d’une valeur dépassant sa colonne reste consultable dans son infobulle

#### Scenario: Largeurs fixes des colonnes de passage

- **WHEN** un onglet affiche le tableau Cycle
- **THEN** Cycle est dimensionné sur son titre suivi de deux espaces
- **AND** Début et Fin sont dimensionnés sur une date complète avec heures, minutes et secondes suivie de trois espaces
- **AND** CAB, Agents et Attentes sont dimensionnés sur le même gabarit `9999,9 s` suivi de quatre espaces

#### Scenario: Compteurs de tailles différentes

- **WHEN** les compteurs ont des contenus de tailles différentes
- **THEN** les huit colonnes de chaque rôle partagent la largeur de `99 999,99 M` suivi de trois espaces ordinaires
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

#### Scenario: Aligner Cycle et Actions

- **WHEN** un sous-onglet d’étape affiche Cycle et un tableau Actions
- **THEN** les zones de ces tableaux partagent les mêmes bords gauche et droit
- **AND** les en-têtes et cellules d’Actions adoptent la typographie de Cycle

## ADDED Requirements

### Requirement: Coûts des passages calculés en direct

CAB MUST calculer le montant en dollars par rôle et catégorie du passage à partir des tokens natifs déclarés et du tarif catalogue par million du modèle et du fournisseur applicables. CAB MUST stocker les montants par RUN et passage dans `sessions.token_costs`. Le chargement du tableau Cycle et du bloc de coûts de l’étape MUST lire cette projection persistée. Electric MUST signaler toute mise à jour de cette projection via le RUN. Les montants affichés MUST avoir au plus deux décimales.

#### Scenario: Modèles successifs dans un même passage
- **WHEN** CAB observe plusieurs réglages de modèle successifs pour un rôle dans un passage
- **THEN** le premier segment commence au début exact du passage, chaque changement termine le segment précédent et commence le suivant, et le dernier se termine à la fin exacte du passage
- **AND** un modèle qui revient après un autre reste une ligne distincte
- **AND** le tableau Agents conserve les quatre colonnes tarifaires alignées sur les colonnes de coût du tableau Cycle.

#### Scenario: Montant de plusieurs modèles
- **WHEN** des mesures de tokens appartiennent à différents segments
- **THEN** CAB attribue chaque mesure au segment actif à son horodatage, additionne les montants exacts avant arrondi et actualise la session et la projection Electric
- **AND** une catégorie reste sans montant si des tokens positifs ont un tarif indisponible, tandis que zéro token déclaré produit un montant nul.
