## ADDED Requirements

### Requirement: Lecture compacte et détail du modèle fournisseur

Le catalogue des modèles MUST afficher au plus deux lignes de texte par cellule,
avec une ellipse en cas de dépassement. Chaque cellule de données MUST réserver au moins deux hauteurs de ligne. Les montants restent sur une ligne. Les colonnes tarifaires MUST s’intituler
T in/M, T out/M, Re/M et Wr/M, avec des largeurs adaptées à l’écran qui
gardent 999 $ visible. Dans le tableau en colonnes, Sorties MUST disposer
de plus de largeur qu’Entrées.

#### Scenario: Nom visible du modèle

- **WHEN** un nom lisible est enregistré
- **THEN** seule cette valeur est visible dans la colonne Modèles
- **AND** l’identifiant technique reste utilisable pour la recherche et remplace le nom si celui-ci manque

#### Scenario: Ouvrir les données d’un modèle

- **WHEN** un administrateur sélectionne le nom d’un modèle
- **THEN** CAB présente dans un overview de lecture l’identifiant, le fournisseur, les données normalisées et les métadonnées enregistrées pour ce modèle
- **AND** les différents tarifs d’écriture cache disponibles restent consultables dans le détail
