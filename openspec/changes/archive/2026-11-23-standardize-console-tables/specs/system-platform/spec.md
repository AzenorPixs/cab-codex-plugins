## MODIFIED Requirements

### Requirement: Présentation des tableaux administratifs et projets

Les tableaux de la console CAB MUST reprendre la typographie de Binaires
et partager ses réglages de typographie, hauteurs, marges, séparateurs et
couleurs par thème. Les vues adaptatives MUST conserver leurs réglages
d’empilement. Chaque tableau MUST afficher au moins trois lignes dans son
corps de tableau et dix résultats au plus par page.

#### Scenario: Afficher un résultat court ou vide

- **WHEN** la page contient moins de trois résultats
- **THEN** CAB complète le corps de tableau jusqu’à trois lignes visibles
- **AND** les lignes de complément ne sont pas comptées comme des résultats

#### Scenario: Rechercher et naviguer

- **WHEN** l’utilisateur consulte un tableau
- **THEN** Premier, Précédent, Suivant et Dernier s’affichent sous le tableau
- **AND** le champ de recherche est placé à droite de Dernier
- **AND** une nouvelle recherche filtre les données accessibles avant pagination et revient à la première page

#### Scenario: Retour à la présentation de référence

- **WHEN** aucune personnalisation des tableaux n’est enregistrée
- **THEN** la taille de page est de dix résultats
- **AND** une préférence de taille antérieure supérieure à dix est plafonnée à dix dans la console
