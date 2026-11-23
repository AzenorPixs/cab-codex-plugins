## ADDED Requirements

### Requirement: Projection PostgreSQL des durées de passage et de cycle
CAB MUST conserver les totaux observés, la partie non ventilée et une référence de calcul par passage et par cycle. Une nouvelle preuve MUST permettre de réviser ces totaux, même pour un RUN archivé. Electric MUST actualiser les vues à la suite des mises à jour.

#### Scenario: Ventilation partielle du RUN 218
- **WHEN** seules quatre secondes de la tentative Statistiques restent sans attribution
- **THEN** CAB affiche l’attente déjà observée et la durée non ventilée séparément.

#### Scenario: Travail observé pendant un passage en cours
- **WHEN** un retour mesuré est disponible avant la fin du passage
- **THEN** CAB enregistre et affiche les totaux observés via Electric. La date de fin reste vide jusqu’à la terminaison du passage.

### Requirement: Horodatages des actions et passages terminés
Un nouveau passage ou une nouvelle action MUST recevoir sa date de début à son ouverture et sa date de fin à sa terminaison connue. Une validation ponctuelle MUST porter l’instant observé aux deux bornes. Les dates historiques manquantes MUST rester non attestées.

#### Scenario: Verrou refusé avant rendu Statistiques
- **WHEN** l’admission au rendu échoue avant tout calcul
- **THEN** CAB termine les actions de préparation et d’admission effectivement réalisées avec leurs dates. Aucun calcul du change ou global n’est créé pour cette tentative.
