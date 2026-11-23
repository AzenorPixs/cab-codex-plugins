## ADDED Requirements

### Requirement: Registre des réservations actives

CAB MUST inscrire chaque réservation de fichier, ressource logique, Docker, LXC ou navigateur dans une table PostgreSQL commune. Une session MUST réserver avant usage, renouveler à 240 secondes tant que l’usage est nécessaire et libérer dès la fin de l’usage. Le bail MUST durer 300 secondes après l’acquisition ou le dernier renouvellement accepté. Chaque renouvellement distinct MUST incrémenter le compteur une fois.

#### Scenario: Renouvellement concurrent et répété

- **WHEN** la session propriétaire renouvelle un bail encore en cours puis retransmet la même demande
- **THEN** CAB enregistre une nouvelle échéance avec un seul incrément et restitue le même reçu

#### Scenario: Dernière session arrêtée

- **WHEN** aucune session n’a renouvelé ou acquis de bail depuis 300 secondes
- **THEN** aucune réservation active ne subsiste, et un éventuel effet non terminé reste protégé par sa preuve opérationnelle

### Requirement: Avis et restitution

CAB MUST surveiller les baux à la seconde et appliquer l’échéance à l’admission de tout nouvel usage. CAB MUST produire un avis à 30 secondes de la fin du bail et un avis à la libération effective, et les adresser à la session propriétaire encore active et existante. Un effet non terminé ou indéterminé MUST conserver sa protection jusqu’à réconciliation.

#### Scenario: Expiration pendant une opération

- **WHEN** le bail expire alors que l’opération précédente est encore active
- **THEN** CAB retire le bail du registre actif et empêche une acquisition incompatible jusqu’à la fin vérifiée de l’opération

### Requirement: Page Projet Réservations

CAB MUST présenter les réservations autorisées dans `/projects/reservations` via Electric, avec session, change, type, compteur, début, échéance et description. CAB MUST donner accès à un aperçu texte par chemin réservé et contrôler l’autorité, le bail actif et la version de contenu lors d’une édition.

#### Scenario: Mise à jour distante

- **WHEN** la session renouvelle un bail
- **THEN** l’interface affiche le compteur et la nouvelle échéance sans rechargement
