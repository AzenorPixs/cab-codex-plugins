## ADDED Requirements

### Requirement: Garde-fou de télémétrie par passage

CAB MUST vérifier les modèles et compteurs natifs par rôle et passage. Un temps agent alloué, même inférieur à une seconde, avec un modèle manquant ou aucun compteur positif MUST être signalé. CAB MUST conserver une preuve du signalement. Les valeurs inconnues restent distinctes de zéro.

#### Scenario: Observer plusieurs passages
- **WHEN** les réglages natifs sont applicables à plusieurs passages
- **THEN** CAB utilise l’historique complet des réglages pour chacun d’eux.

#### Scenario: Demander les mesures manquantes
- **WHEN** le passage terminé a du temps agent alloué et des mesures manquantes
- **THEN** CAB vérifie de nouveau la projection puis adresse une seule relance par passage et rôle à la session native disponible
- **AND** la relance demande de vérifier les sources et de signaler les limites de la collecte, sans fabriquer ni transférer les compteurs d’une autre étape
- **AND** un RUN clôturé ou une session sans canal disponible conserve un diagnostic visible.

#### Scenario: Compteurs obligatoires en Implémentation
- **WHEN** l’agent demande la validation d’Implémentation avec du temps agent alloué et aucun compteur natif positif rattaché au passage
- **THEN** CAB garde l’étape en attente et enregistre immédiatement une relance
- **AND** une mesure native positive rattachée au passage permet de reprendre la validation.

### Requirement: Somme des durées du tableau Actions

Pour un passage aux bornes connues, la somme affichée dans Actions MUST égaler sa durée totale. Un chevauchement compte une fois et les périodes restantes apparaissent comme temps hors actions enregistrées.

#### Scenario: Ventiler une étape terminée
- **WHEN** des actions se chevauchent ou laissent des intervalles vides
- **THEN** CAB répartit les dixièmes affichés entre les actions et le temps hors actions pour obtenir exactement le total de l’étape
- **AND** les bornes natives des actions restent accessibles.

### Requirement: Précision des coûts par catégorie de tokens

CAB MUST arrondir le coût agrégé au dix-millième après le prorata, puis persister le résultat. Les montants et tarifs affichés MUST conserver quatre décimales, sans suffixe.

#### Scenario: Coût inférieur au centime
- **WHEN** le montant calculé s’arrondit à 0,0029
- **THEN** le tableau Cycle et son récapitulatif affichent `0,0029`.

## MODIFIED Requirements

### Requirement: Tableau compact des passages par étape

Dans les douze onglets, CAB MUST garder une ligne par passage. Cycle, Début, Fin, CAB, Agents et Attentes MUST utiliser des gabarits fixes. Les colonnes de tokens MUST partager une largeur suffisante pour `999 999,9999`. État MUST recevoir la largeur restante. Le défilement horizontal MUST rester limité au tableau.

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
- **THEN** les huit colonnes de chaque rôle partagent la largeur de `999 999,9999` suivi de trois espaces ordinaires
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

### Requirement: Agents observés des passages d’étape

CAB MUST conserver dans PostgreSQL, dans `sessions_agents`, les modèles et niveaux de raisonnement observés pour les passages et rôles applicables. CAB MUST résoudre le fournisseur depuis le catalogue des modèles et fournisseurs lorsque le rapprochement est univoque. Le détail du RUN MUST afficher Agents directement sous Cycle dans le même espace de défilement.

#### Scenario: Observer le rôle et les réglages

- **WHEN** un modèle est observé pendant un tour qui recoupe un passage
- **THEN** CAB conserve le modèle, le raisonnement disponible et le type « Codage » ou « Orchestrateur » établi dans le RUN
- **AND** une nouvelle collecte des mêmes réglages ne duplique pas la ligne
- **AND** un fournisseur ambigu ou un raisonnement absent demeure indisponible

#### Scenario: Aligner Agents sous Cycle

- **WHEN** le tableau Cycle d’un onglet d’étape est affiché
- **THEN** Agents suit immédiatement Cycle, avec les mêmes trois premières colonnes et les mêmes largeurs
- **AND** Type est dimensionné pour « Orchestrateur » suivi de deux espaces et Fournisseurs précède les quatre coûts
- **AND** les quatre coûts suivent les bords et largeurs du groupe de coûts le plus à droite de Cycle
- **AND** Raisonnement précède Agents, dont le nom de modèle occupe le reste sans retour à la ligne
- **AND** un tarif par type indisponible reste vide

#### Scenario: Tarif par identifiant observé

- **WHEN** CAB dispose de l’identifiant natif du modèle d’un codeur ou d’un orchestrateur
- **THEN** le tableau Agents affiche les tarifs d’entrée, de sortie, de lecture et d’écriture du cache depuis l’entrée exacte de ce fournisseur dans le catalogue. Chaque cellule affiche le nombre arrondi à quatre décimales avec une virgule, sans suffixe monétaire ni mention du million
- **AND** un tarif nul s’affiche avec sa valeur zéro
- **AND** une correspondance ambiguë ou incompatible avec le fournisseur observé laisse les tarifs vides
- **AND** les montants de coût observés restent des données distinctes des tarifs du catalogue

### Requirement: Coûts des passages calculés en direct

CAB MUST calculer le montant en dollars par rôle et catégorie du passage à partir des tokens natifs déclarés et du tarif catalogue par million du modèle et du fournisseur applicables. CAB MUST stocker les montants par RUN et passage dans `sessions.token_costs`. Le chargement du tableau Cycle et du bloc de coûts de l’étape MUST lire cette projection persistée. Electric MUST signaler toute mise à jour de cette projection via le RUN. Les montants affichés dans Cycle et son récapitulatif MUST être rendus avec une virgule et exactement quatre décimales, arrondies au plus près, sans suffixe monétaire.

#### Scenario: Modèles successifs dans un même passage
- **WHEN** CAB observe plusieurs réglages de modèle successifs pour un rôle dans un passage
- **THEN** le premier segment commence au début exact du passage, chaque changement termine le segment précédent et commence le suivant, et le dernier se termine à la fin exacte du passage
- **AND** un modèle qui revient après un autre reste une ligne distincte
- **AND** le tableau Agents conserve les quatre colonnes tarifaires alignées sur les colonnes de coût du tableau Cycle.

#### Scenario: Montant de plusieurs modèles
- **WHEN** des mesures de tokens appartiennent à différents segments
- **THEN** CAB répartit les tokens déclarés pour chaque catégorie au prorata de la durée des segments du rôle, applique le tarif de chaque segment et arrondit seulement la somme avant de l’enregistrer et de la diffuser via Electric
- **AND** une catégorie reste sans montant si des tokens positifs rencontrent un segment de durée positive dont le tarif est indisponible, tandis que zéro token déclaré produit un montant nul.
