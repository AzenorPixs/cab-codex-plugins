## ADDED Requirements

### Requirement: Pagination adaptative locale à une page native

Une réduction de page pour dépassement de taille MUST rester au même curseur et MUST NOT réduire toutes les pages suivantes. Le client MUST rétablir sa taille nominale au curseur suivant, préserver les plafonds de réponse et de pages et refuser les cycles, réponses invalides ou dépassements sans retourner un transcript partiel.

#### Scenario: Grande page puis historique ordinaire

- **WHEN** la première page nécessite une taille de 1 et que les suivantes sont petites
- **THEN** le client reprend la taille nominale et retourne l’ensemble complet sans fausse limite de pagination

### Requirement: Snapshot natif partagé dans une passe de réconciliation

Le contrôleur MAY réutiliser une lecture native pour une même session et génération pendant une seule passe. Il MUST invalider cette réutilisation après un événement natif et MUST conserver une seconde lecture indépendante et stable avant une clôture terminale. Un échec partagé MUST NOT devenir une preuve ni bloquer les RUN disjoints.

#### Scenario: Plusieurs validations de la même session

- **WHEN** une passe inspecte plusieurs opérations sans événement natif intermédiaire
- **THEN** l’historique initial est lu une fois et chaque clôture conserve sa vérification indépendante
