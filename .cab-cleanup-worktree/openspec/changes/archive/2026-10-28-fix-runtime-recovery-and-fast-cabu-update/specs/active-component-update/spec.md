## ADDED Requirements

### Requirement: Coupure rapide et restauration sans notification
CABU MUST préparer, vérifier et sauvegarder les artefacts avant la coupure. Il MUST arrêter et redémarrer les trois services sur les versions cibles sans avertir ni modifier les RUN. Les états persistants et décisions consommées MUST être conservés. Les nouvelles opérations dépendantes du transport MUST rester bloquées pendant la coupure. Une issue inconnue MUST NOT être rejouée implicitement.

#### Scenario: Coupure pendant un RUN actif
- **WHEN** CABU est déclenché pendant une session
- **THEN** les briques disparaissent sans notification, puis restaurent leurs états durables sans nouvelle permission implicite

### Requirement: Broker actif rechargé et versions prouvées
Si OpenCode est actif, CABU MUST recharger le broker par les routes natives et vérifier sa version cible et une readiness postérieure à la reconnexion. Un OpenCode absent MAY laisser uniquement le runtime broker indisponible. Les trois services MUST toujours être actifs et servir la version cible pour conclure au succès.

#### Scenario: OpenCode lancé
- **WHEN** le serveur OpenCode est actif
- **THEN** le broker est reconnecté et sa version chargée est prouvée ; une erreur de reconnexion interdit le succès global

### Requirement: Durées mesurées
CABU MUST rapporter préparation, indisponibilité et durée totale. Le banc contrôlé SHOULD atteindre une indisponibilité inférieure à cinq secondes. Les validations en cache MUST être liées au contenu exact et recontrôlées avant coupure.

#### Scenario: Paquet inchangé déjà vérifié
- **WHEN** les empreintes et le runtime de validation sont identiques
- **THEN** les validations syntaxiques en cache sont réutilisées sans supprimer les contrôles d'intégrité ni le redémarrage

## MODIFIED Requirements

### Requirement: Rapport des versions après redémarrage
Le rapport MUST séparer paquet, fichiers et versions réellement servies. OpenCode actif MUST imposer une preuve fraîche de la version cible du broker après reconnexion ; un broker non vérifiable MUST interdire le succès. Seule l'absence prouvée d'OpenCode MAY autoriser le broker runtime `INDISPONIBLE`. Aucun repli V1 MUST être tenté.

#### Scenario: Broker de mauvaise version après reconnexion
- **WHEN** OpenCode est actif et le broker annonce une ancienne version
- **THEN** l'update échoue et conserve le journal de récupération ; le rapport ne déduit jamais la version chargée des fichiers

#### Scenario: Redémarrage natif du broker OpenCode
- **WHEN** OpenCode est accessible et le broker CAB est connecté avant l'update
- **THEN** CAB déconnecte, remplace les fichiers, reconnecte puis vérifie une readiness postérieure portant la version cible sans tuer OpenCode

#### Scenario: Broker initialement en erreur
- **WHEN** l'API V2 est accessible mais le serveur MCP existant est failed ou pending
- **THEN** CABU le déconnecte puis le reconnecte après remplacement et exige la même preuve fraîche que pour un broker initialement connecté
