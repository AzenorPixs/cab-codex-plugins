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
- **AND** Raisonnement précède la colonne LLM, dont le nom de modèle occupe le reste sans retour à la ligne
- **AND** un tarif par type indisponible reste vide

#### Scenario: Tarif par identifiant observé

- **WHEN** CAB dispose de l’identifiant natif du modèle d’un codeur ou d’un orchestrateur
- **THEN** le tableau Agents affiche les tarifs d’entrée, de sortie, de lecture et d’écriture du cache depuis l’entrée exacte de ce fournisseur dans le catalogue. Chaque cellule affiche le nombre arrondi à quatre décimales avec une virgule, sans suffixe monétaire ni mention du million
- **AND** un tarif nul s’affiche avec sa valeur zéro
- **AND** une correspondance ambiguë ou incompatible avec le fournisseur observé laisse les tarifs vides
- **AND** les montants de coût observés restent des données distinctes des tarifs du catalogue

### Requirement: Coûts et Agents dans le résumé du cycle

Le Résumé d'un RUN MUST afficher chacun des quatre coûts sous le compteur correspondant pour le dernier cycle et pour l'ensemble des cycles, avec les deux-points alignés. Chaque bloc MUST se terminer par le coût total, tous rôles et catégories applicables compris. Les montants MUST être présentés avec quatre décimales et une virgule.

#### Scenario: Consulter le total et les coûts par itération

- **WHEN** des montants existent pour les passages des itérations
- **THEN** les quatre colonnes de coûts suivent les quatre compteurs par rôle dans Itérations du cycle
- **AND** le Résumé cumule les montants enregistrés, un coût manquant pour un compteur observé rend le cumul concerné indisponible, et un montant nul est affiché comme zéro.

#### Scenario: Consulter les périodes de modèle

- **WHEN** des modèles sont observés pendant une itération
- **THEN** Agents suit immédiatement Itérations du cycle, avec Raisonnement et LLM immédiatement après Fournisseurs
- **AND** les quatre tarifs ont les mêmes bords et largeurs que le dernier groupe de coûts d’Itérations du cycle.

#### Scenario: Regrouper les observations d’un LLM dans un cycle

- **WHEN** douze périodes du même cycle ont le même rôle, LLM, raisonnement, fournisseur et tarifs, y compris si elles sont espacées
- **THEN** le Résumé affiche une seule ligne avec le premier début et la dernière fin observée
- **AND** la fin reste vide si une période du groupe est encore ouverte
- **AND** des réglages différents apparaissent sur des lignes distinctes.
