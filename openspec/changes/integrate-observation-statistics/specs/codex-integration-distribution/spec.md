## ADDED Requirements

### Requirement: Commandes simples de consultation statistique
La commande distribuée CAB MUST proposer /cab stats pour les changes courants, /cab statslast pour la dernière livraison observée, /cab stats 24 pour les dernières 24 heures, /cab stats7 pour les derniers 7 jours et /cab stats30 pour les derniers 30 jours. Les commandes MUST être ponctuelles, en français et en lecture seule, sans action de cycle de vie.

#### Scenario: Cinq consultations
- **WHEN** l'utilisateur demande l'une des cinq commandes
- **THEN** CAB consulte la sélection correspondante et restitue bornes, identités, couverture, sources et métriques disponibles avec N/A explicites

#### Scenario: Plusieurs RUN actifs
- **WHEN** /cab stats est demandé sans cible dans un projet concurrent
- **THEN** chaque change courant est présenté avec son RUN et son contexte sans fusion ni question de sélection obligatoire ; un RUN explicitement ciblé reste isolé

### Requirement: Distribution statistique CAB 1.2.2
Les modules distribués, broker, contrôleur, superviseur, manifeste, unités et commande MUST annoncer la version de base 1.2.2. Le module de fenêtres et l'importeur MUST être distribués avec leurs contrats et tests, sans nouvelle dépendance tierce ni installation automatique.

#### Scenario: Jeu source complet
- **WHEN** le jeu CAB 1.2.2 est qualifié
- **THEN** ses versions sont cohérentes et les tests couvrent import, fenêtres, commandes et absence d'effet métier sans modifier une installation active
