## ADDED Requirements

### Requirement: Projection bornée du registre pour le moniteur
CAB MUST exposer GET /monitor/runs avec au plus 200 identités de réservation, actives d’abord, total et indicateur de troncature. Cette lecture MUST NOT sérialiser historique, demandes, ressources ou corps de commandes. Le moniteur MUST utiliser cette projection sans repli vers le registre complet et conserver son plafond de 2 Mio.

#### Scenario: Registre historique volumineux
- **WHEN** le registre complet dépasse 2 Mio
- **THEN** la projection fournit les champs de navigation nécessaires sans mutation ni perte de fraîcheur due à l’historique

### Requirement: Causes bornées des pannes de source
Le moniteur MUST distinguer dépassement de taille, format invalide, erreur HTTP et timeout par des codes publics fixes. Il MUST conserver les dernières observations comme périmées, sans exposer corps ou erreur libre et sans présenter une panne comme saine.

#### Scenario: Projection trop volumineuse ou invalide
- **WHEN** la source dépasse le plafond ou retourne un format invalide
- **THEN** le snapshot indique la cause précise et conserve les anciennes observations datées
