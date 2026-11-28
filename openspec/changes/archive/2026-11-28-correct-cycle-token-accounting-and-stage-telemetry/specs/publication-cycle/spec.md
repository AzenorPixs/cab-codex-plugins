## ADDED Requirements

### Requirement: Bases tarifaires exclusives pour les tokens

CAB MUST laisser les journaux natifs intacts et valoriser les catégories facturables selon la sémantique native de l’agent. Le compteur de raisonnement inclus dans les sorties MUST NOT être valorisé une deuxième fois.

#### Scenario: Entrées Codex avec cache
- **WHEN** les compteurs Codex distinguent le total d’entrée, les lectures et les écritures du cache
- **THEN** CAB soustrait les lectures et les écritures du total avant d’appliquer le tarif d’entrée et valorise chaque catégorie de cache à son tarif.

#### Scenario: Entrées OpenCode déjà exclusives
- **WHEN** les compteurs OpenCode présentent les entrées et le cache comme des catégories exclusives
- **THEN** CAB valorise chaque compteur directement.
- **AND** CAB ajoute le raisonnement à la sortie textuelle quand OpenCode expose deux compteurs de sortie exclusifs.

#### Scenario: Base tarifaire incomplète ou incohérente
- **WHEN** une catégorie nécessaire au calcul est inconnue ou que les sous-compteurs Codex dépassent le total
- **THEN** le coût concerné reste inconnu et les compteurs bruts restent consultables.

### Requirement: Confirmation native au début de chaque tentative

Pour les nouveaux RUN utilisant le protocole d’étapes, chaque rôle concerné MUST confirmer au début de chaque tentative la remontée de son modèle, de son niveau de raisonnement et de ses compteurs. CAB MUST vérifier la source native liée au RUN et corréler le reçu à la tentative et au rôle. La clôture de l’étape MUST attendre les confirmations requises.

#### Scenario: Confirmation avec un compteur nul
- **WHEN** les réglages et compteurs requis sont observés dans la source native et qu’un compteur vaut zéro
- **THEN** CAB accepte la valeur nulle observée et enregistre la preuve.

#### Scenario: Source incomplète
- **WHEN** la source native n’expose pas une donnée requise ou expose une mesure incohérente
- **THEN** CAB indique les champs manquants ou invalides et la confirmation reste en attente.

#### Scenario: Nouvelle tentative ou RUN historique
- **WHEN** un RUN soumis à cette exigence recommence une étape
- **THEN** les preuves précédentes restent consultables et chaque rôle confirme de nouveau.
- **AND** un RUN ouvert sous le contrat antérieur conserve ses obligations initiales.
