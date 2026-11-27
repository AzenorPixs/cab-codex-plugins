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
- **THEN** le tableau Agents affiche les tarifs d’entrée, de sortie, de lecture et d’écriture du cache, en dollars par million de tokens, depuis l’entrée exacte de ce fournisseur dans le catalogue
- **AND** un tarif nul s’affiche avec sa valeur zéro
- **AND** une correspondance ambiguë ou incompatible avec le fournisseur observé laisse les tarifs vides
- **AND** les montants de coût observés restent des données distinctes des tarifs du catalogue
