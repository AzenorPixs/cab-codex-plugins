## MODIFIED Requirements

### Requirement: Présentation des tableaux administratifs et projets

Les tableaux CAB MUST reprendre les réglages de Binaires pour la typographie,
les hauteurs, marges, séparateurs et couleurs par thème. Les vues adaptatives
MUST conserver l’empilement. Les tableaux MUST afficher au moins trois lignes.
Les tableaux paginés MUST limiter chaque page à dix résultats. Dans le détail
de session, les tableaux du Résumé et des étapes du cycle MUST afficher toutes
leurs lignes sans pagination ni recherche.

#### Scenario: Afficher un résultat court ou vide

- **WHEN** le tableau affiche moins de trois résultats
- **THEN** CAB complète le corps de tableau jusqu’à trois lignes visibles
- **AND** les lignes de complément ne sont pas comptées comme des résultats

#### Scenario: Rechercher et naviguer

- **WHEN** l’utilisateur consulte un tableau paginé
- **THEN** Premier, Précédent, Suivant et Dernier s’affichent sous le tableau
- **AND** le champ de recherche est placé à droite de Dernier
- **AND** une nouvelle recherche filtre les données accessibles avant pagination et revient à la première page

#### Scenario: Retour à la présentation de référence

- **WHEN** aucune personnalisation des tableaux paginés n’est enregistrée
- **THEN** la taille de page est de dix résultats
- **AND** une préférence de taille antérieure supérieure à dix est plafonnée à dix dans la console

#### Scenario: Lire tous les tableaux du cycle dans le détail d’une session

- **WHEN** l’utilisateur consulte le Résumé ou une étape du cycle dans le détail d’une session
- **THEN** chaque tableau affiche toutes les lignes de cycles, d’itérations ou d’actions qui lui appartiennent
- **AND** aucune commande de pagination ni aucun champ de recherche ne s’affiche sous ces tableaux
- **AND** les tableaux des cycles et des étapes de l’accueil projet conservent leurs contrôles
