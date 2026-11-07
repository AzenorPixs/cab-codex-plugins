## ADDED Requirements

### Requirement: Corrélation shell native à ressources multiples
Le client SHALL vérifier le SID, le message et l’identifiant du call source unique. Pour plusieurs ressources, elles SHALL couvrir dans l’ordre et littéralement la commande native entière, les seuls séparateurs tolérés étant des opérateurs ou espaces shell. L’empreinte SHALL couvrir l’entrée native complète. Toute couverture absente, ambiguë ou divergente SHALL être refusée sans réponse à la permission.

#### Scenario: Commande composée exactement couverte
- **WHEN** les ressources de la permission correspondent aux segments ordonnés de la commande source exacte
- **THEN** le client retourne la commande entière et l’empreinte de son entrée native

#### Scenario: Ressource différente ou commande incomplète
- **WHEN** un segment est absent, modifié ou que du texte non couvert subsiste
- **THEN** le client refuse la corrélation et ne répond pas à la permission

### Requirement: Observation native convergente
Le job SHALL éviter les observations simultanées et ne SHALL NOT répéter un diagnostic identique à chaque cadence. Une observation ultérieure réussie SHALL permettre la convergence normale ; une erreur SHALL conserver les protections et SHALL NOT autoriser un effet.

#### Scenario: Erreur persistante puis rétablissement
- **WHEN** une erreur identique persiste puis une observation réussit
- **THEN** un diagnostic initial est conservé et la cadence converge sans rejeu ni acquittement implicite
