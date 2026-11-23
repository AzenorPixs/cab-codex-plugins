## MODIFIED Requirements

### Requirement: Synchronisation du catalogue OpenAI avec ses tarifs

CAB SHALL préconfigurer un fournisseur OpenAI avec les URL officielles et actualiser les modèles accessibles avec une clé API associée. Le secret SHALL être transmis uniquement aux points d’accès HTTPS officiels nécessaires au catalogue et au contrôle de la clé. L’actualisation automatique du catalogue SHALL choisir un seul créneau aléatoire par journée UTC pour chaque source de catalogue.

#### Scenario: Rafraîchir le catalogue OpenAI

- **WHEN** la clé donne accès au catalogue et que la grille tarifaire est valide
- **THEN** CAB publie les modèles et rapproche par identifiant exact les tarifs Standard par million de tokens pour l’entrée, la sortie, la lecture et chaque durée d’écriture disponible
- **AND** les prix non renseignés restent indisponibles

#### Scenario: Source indisponible

- **WHEN** la clé manque ou une récupération échoue
- **THEN** CAB conserve le dernier catalogue valide et indique le défaut sans exposer le secret

## ADDED Requirements

### Requirement: Dernière actualisation des catalogues fournisseurs

CAB SHALL rendre les URL HTTP et HTTPS du tableau Fournisseurs cliquables. La coche et la croix SHALL ouvrir un aperçu du dernier essai d’actualisation, de son résultat et de la dernière réussite connue.

#### Scenario: Utiliser une clé liée

- **WHEN** le catalogue a des clés associées
- **THEN** CAB utilise la seule clé valide disponible ou en sélectionne une au hasard si plusieurs sont valides
- **AND** CAB conserve le dernier catalogue valide si aucune clé valide ne permet l’actualisation ou que l’essai échoue

### Requirement: État et mesures des clés API

CAB SHALL vérifier chaque clé auprès de son fournisseur et tenter ensuite de récupérer ses quotas ou son crédit suivant l’API disponible. CAB SHALL planifier un créneau aléatoire par clé et par fenêtre UTC de quatre heures et permettre une actualisation manuelle depuis la colonne Actions. La table PostgreSQL des clés SHALL conserver le dernier résultat et la dernière actualisation réussie. Les données affichables SHALL être disponibles dans l’instantané PostgreSQL et synchronisées par Electric.

#### Scenario: Contrôle réussi avec des données partielles

- **WHEN** la clé est valide et que le fournisseur expose certaines mesures
- **THEN** CAB enregistre et présente les mesures selon leur unité et leur périmètre
- **AND** les mesures absentes restent explicitement indisponibles

#### Scenario: Afficher l’état de la clé et la dernière réussite

- **WHEN** l’administrateur sélectionne la coche verte ou la croix rouge
- **THEN** l’aperçu indique la dernière vérification et son résultat sans révéler la clé
- **AND** le tableau affiche la dernière actualisation réussie même si une tentative ultérieure échoue

#### Scenario: Limites OpenAI

- **WHEN** la clé OpenAI valide donne accès aux limites de fine-tuning ou à des en-têtes de débit documentés
- **THEN** CAB présente ces limites avec leur périmètre, dont le modèle pour le fine-tuning
- **AND** CAB indique le crédit comme indisponible lorsque la clé ne donne pas accès à cette donnée
