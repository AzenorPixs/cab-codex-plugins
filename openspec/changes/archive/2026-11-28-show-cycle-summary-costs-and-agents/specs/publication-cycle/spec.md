## ADDED Requirements

### Requirement: Coûts et Agents dans le résumé du cycle

Le Résumé d'un RUN MUST afficher chacun des quatre coûts sous le compteur correspondant pour le dernier cycle et pour l'ensemble des cycles, avec les deux-points alignés. Chaque bloc MUST se terminer par le coût total, tous rôles et catégories applicables compris. Les montants MUST être présentés avec quatre décimales et une virgule.

#### Scenario: Consulter le total et les coûts par itération

- **WHEN** des montants existent pour les passages des itérations
- **THEN** les quatre colonnes de coûts suivent les quatre compteurs par rôle dans Itérations du cycle
- **AND** le Résumé cumule les montants enregistrés, un coût manquant pour un compteur observé rend le cumul concerné indisponible, et un montant nul est affiché comme zéro.

#### Scenario: Consulter les périodes de modèle

- **WHEN** des modèles sont observés pendant une itération
- **THEN** Agents suit immédiatement Itérations du cycle, avec ses colonnes d'agent et de tarifs
- **AND** les segments contigus du même rôle, modèle, fournisseur, raisonnement et tarifs sont joints dans l'itération
- **AND** un changement ou une discontinuité d'observation ouvre un segment distinct.
