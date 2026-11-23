## ADDED Requirements

### Requirement: Saisie groupée du fournisseur et de sa clé

CAB SHALL permettre à un administrateur d’ajouter une clé API facultative dans l’Overview de création ou d’édition du fournisseur. La saisie est masquée par défaut et un bouton œil permet de la contrôler. CAB SHALL associer la clé chiffrée au TPM dans la table des clés API dans la même transaction que le fournisseur.

#### Scenario: Valider une clé avec les URL

- **WHEN** un administrateur enregistre les URL et une clé
- **THEN** CAB crée ou édite le fournisseur et ajoute la clé associée
- **AND** les lectures n’exposent ni secret ni chiffré

#### Scenario: Refus de la clé

- **WHEN** CAB ne peut pas enregistrer la clé
- **THEN** la transaction laisse les données du fournisseur dans leur état initial

### Requirement: Synchronisation du catalogue OpenAI avec ses tarifs

CAB SHALL préconfigurer un fournisseur OpenAI avec les URL officielles et actualiser les modèles accessibles avec une clé API associée. Le secret SHALL être transmis uniquement à l’URL HTTPS officielle du catalogue. L’actualisation automatique SHALL choisir un seul créneau aléatoire par journée UTC pour chaque source de catalogue.

#### Scenario: Rafraîchir le catalogue OpenAI

- **WHEN** la clé donne accès au catalogue et que la grille tarifaire est valide
- **THEN** CAB publie les modèles et rapproche par identifiant exact les tarifs Standard par million de tokens pour l’entrée, la sortie, la lecture et chaque durée d’écriture disponible
- **AND** les prix non renseignés restent indisponibles

#### Scenario: Source indisponible

- **WHEN** la clé manque ou une récupération échoue
- **THEN** CAB conserve le dernier catalogue valide et indique le défaut sans exposer le secret
