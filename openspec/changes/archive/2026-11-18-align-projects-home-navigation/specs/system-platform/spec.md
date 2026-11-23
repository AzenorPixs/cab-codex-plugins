## ADDED Requirements

### Requirement: Navigation de l'accueil Projets
La page /projects MUST remplacer son titre central Projets par une maison
cliquable vers cette même page, dans une barre de navigation utilisant la même
présentation et le même séparateur horizontal que les pages d'un projet.

#### Scenario: Accueil de la zone
- **WHEN** le développeur ouvre /projects sans projet sélectionné
- **THEN** la maison remplace le titre central et renvoie vers /projects
- **AND** le séparateur horizontal reprend la présentation des menus d'un projet

### Requirement: Retour depuis le titre latéral Projets
Le libellé Projets du menu latéral MUST être un lien vers /projects sur toutes
les pages qui utilisent cette barre latérale.

#### Scenario: Retour à la liste
- **WHEN** le développeur clique sur Projets dans la colonne gauche d'un projet ou d'une sous-page
- **THEN** CAB revient à /projects sans modifier le projet
