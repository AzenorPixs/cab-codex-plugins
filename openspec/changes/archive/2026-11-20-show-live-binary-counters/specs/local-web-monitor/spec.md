## ADDED Requirements

### Requirement: Compteurs de binaires dans Administration
La page d’accueil Administration MUST afficher un bloc Binaires à deux colonnes. Le total des binaires actifs MUST se trouver à gauche et celui des binaires inactifs à droite, avec des couleurs distinctes. Les deux totaux MUST être mis à jour via Electric à partir du registre. La projection MUST être limitée aux totaux et accessible aux administrateurs.

#### Scenario: Un binaire devient inactif
- **WHEN** le registre passe un binaire d’actif à inactif
- **THEN** les deux compteurs sont actualisés dans la page ouverte

### Requirement: Consultation des binaires actifs et inactifs
Chaque compteur MUST ouvrir l’onglet correspondant sur /administration/binaries. Le titre MUST ouvrir la page Binaires. Les tableaux MUST se mettre à jour via Electric et rester accessibles aux seuls administrateurs.

#### Scenario: Consultation des processus arrêtés
- **WHEN** un administrateur sélectionne le compteur Inactifs
- **THEN** le tableau de l’onglet Inactifs affiche les processus arrêtés du registre

### Requirement: Pagination et tri des binaires
Les onglets Actifs et Inactifs MUST afficher au plus dix binaires par page et proposer une navigation. Chaque en-tête MUST permettre un tri réversible. Les dates MUST être triées chronologiquement et les PID numériquement.

#### Scenario: Tri d’une liste paginée
- **WHEN** l’administrateur clique deux fois sur un même en-tête
- **THEN** le tri global de l’onglet inverse son ordre et le tableau affiche la première page des résultats
