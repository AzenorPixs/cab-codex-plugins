## MODIFIED Requirements

### Requirement: Coûts et Agents dans le résumé du cycle

Le Résumé d'un RUN MUST afficher chacun des quatre coûts sous le compteur correspondant pour le dernier cycle et pour l'ensemble des cycles, avec les deux-points alignés. Chaque bloc MUST se terminer par le coût total, tous rôles et catégories applicables compris. Les montants MUST être présentés avec quatre décimales et une virgule.

#### Scenario: Lire la durée totale et les coûts alignés

- **WHEN** le récapitulatif de tous les cycles est affiché
- **THEN** le texte « Durée : » suit « Totale de tous les cycles : » et précède la durée
- **AND** chaque coût et son compteur restent alignés lors d’un retour à la ligne.

#### Scenario: Consulter les itérations et leur état

- **WHEN** le tableau « Itération du cycle des 12 étapes » est affiché
- **THEN** sa première colonne s’intitule « Itérations »
- **AND** la colonne État affiche la coche verte, l’avertissement ou l’indicateur en cours selon l’état
- **AND** chaque pictogramme porte un libellé accessible et aucun texte d’état n’est affiché dans la cellule.

#### Scenario: Consulter le total et les coûts par itération

- **WHEN** des montants existent pour les passages des itérations
- **THEN** les quatre colonnes de coûts suivent les quatre compteurs par rôle dans Itérations du cycle
- **AND** le Résumé cumule les montants enregistrés, un coût manquant pour un compteur observé rend le cumul concerné indisponible, et un montant nul est affiché comme zéro.

#### Scenario: Consulter les périodes de modèle

- **WHEN** des modèles sont observés pendant une itération
- **THEN** « LLM par itération du cycle des 12 étapes » suit le tableau des itérations
- **AND** sa première colonne s’intitule « Itérations » et Raisonnement et LLM suivent immédiatement Fournisseurs
- **AND** les quatre tarifs ont les mêmes bords et largeurs que le dernier groupe de coûts d’Itérations du cycle.

#### Scenario: Regrouper les observations d’un LLM dans un cycle

- **WHEN** douze périodes du même cycle ont le même rôle, LLM, raisonnement, fournisseur et tarifs, y compris si elles sont espacées
- **THEN** le Résumé affiche une seule ligne avec le premier début et la dernière fin observée
- **AND** la fin reste vide si une période du groupe est encore ouverte
- **AND** des réglages différents apparaissent sur des lignes distinctes.
