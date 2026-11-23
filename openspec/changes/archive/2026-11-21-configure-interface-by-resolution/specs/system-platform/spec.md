## MODIFIED Requirements

### Requirement: Présentation par onglets de l’interface

Interface MUST afficher Blocs, Colonnes, Général, Menus, Résolutions,
Tableaux, Titres et Top barre. Général MUST ouvrir par défaut. Chaque onglet
MUST proposer Mobile, Tablette, HD, Full HD, QHD et 4K au clavier et sur mobile.

#### Scenario: Accès aux réglages historiques
- **WHEN** l’administrateur choisit Full HD
- **THEN** Général présente sa taille de texte et Résolutions ses facteurs Interface et Police
- **AND** le choix est conservé lors d’un changement d’onglet principal.

### Requirement: Persistance synchronisée des styles de composants

Les réglages MUST être validés côté serveur, conservés par profil dans
PostgreSQL et diffusés par Electric. La réinitialisation MUST viser le
seul groupe du profil affiché. Les valeurs historiques MUST rester héritées.

#### Scenario: Enregistrement synchronisé
- **WHEN** l’administrateur modifie une valeur en Full HD
- **THEN** les valeurs enregistrées pour les autres profils sont conservées
- **AND** les fenêtres ouvertes recalculent leur rendu selon leur largeur.

#### Scenario: Écran entre deux profils
- **WHEN** la largeur se situe entre deux références
- **THEN** CAB interpole les dimensions définies aux deux bornes et la taille de police de Général
- **AND** les couleurs, seuils, graisses et compteurs utilisent le profil le plus proche.

#### Scenario: Réinitialisation isolée
- **WHEN** l’administrateur réinitialise un onglet pour la 4K
- **THEN** CAB rétablit ses valeurs héritées en 4K et conserve les autres groupes et profils.
