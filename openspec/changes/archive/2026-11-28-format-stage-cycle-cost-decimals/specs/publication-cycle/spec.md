## MODIFIED Requirements

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
- **THEN** le tableau Agents affiche les tarifs d’entrée, de sortie, de lecture et d’écriture du cache depuis l’entrée exacte de ce fournisseur dans le catalogue. Chaque cellule affiche le nombre arrondi à deux décimales avec une virgule, sans suffixe monétaire ni mention du million
- **AND** un tarif nul s’affiche avec sa valeur zéro
- **AND** une correspondance ambiguë ou incompatible avec le fournisseur observé laisse les tarifs vides
- **AND** les montants de coût observés restent des données distinctes des tarifs du catalogue

### Requirement: Coûts des passages calculés en direct

CAB MUST calculer le montant en dollars par rôle et catégorie du passage à partir des tokens natifs déclarés et du tarif catalogue par million du modèle et du fournisseur applicables. CAB MUST stocker les montants par RUN et passage dans `sessions.token_costs`. Le chargement du tableau Cycle et du bloc de coûts de l’étape MUST lire cette projection persistée. Electric MUST signaler toute mise à jour de cette projection via le RUN. Les montants affichés dans Cycle et son récapitulatif MUST être rendus avec une virgule et exactement deux décimales, arrondies au plus près, sans suffixe monétaire.

#### Scenario: Modèles successifs dans un même passage
- **WHEN** CAB observe plusieurs réglages de modèle successifs pour un rôle dans un passage
- **THEN** le premier segment commence au début exact du passage, chaque changement termine le segment précédent et commence le suivant, et le dernier se termine à la fin exacte du passage
- **AND** un modèle qui revient après un autre reste une ligne distincte
- **AND** le tableau Agents conserve les quatre colonnes tarifaires alignées sur les colonnes de coût du tableau Cycle.

#### Scenario: Montant de plusieurs modèles
- **WHEN** des mesures de tokens appartiennent à différents segments
- **THEN** CAB répartit les tokens déclarés pour chaque catégorie au prorata de la durée des segments du rôle, applique le tarif de chaque segment et arrondit seulement la somme avant de l’enregistrer et de la diffuser via Electric
- **AND** une catégorie reste sans montant si des tokens positifs rencontrent un segment de durée positive dont le tarif est indisponible, tandis que zéro token déclaré produit un montant nul.
