## ADDED Requirements

### Requirement: Statistiques bornées et propres au change
CAB MUST persister des périodes début/fin liées au change, au RUN et à la session
native. Chaque SID MUST avoir au plus un contexte de mesure actif ; le codeur
MUST pouvoir basculer en autonomie sans validation intermédiaire. Un change MUST
agréger plusieurs RUN et plusieurs sessions sans doubler les compteurs partagés.

#### Scenario: Deux changes successifs dans le même SID
- **WHEN** le codeur commence la mesure du second change
- **THEN** CAB ferme le premier contexte et ouvre le second à une frontière commune, sans attribuer le total antérieur au second

#### Scenario: Reprise et plusieurs sessions
- **WHEN** un change reprend dans un autre RUN ou se réalise dans plusieurs sessions
- **THEN** CAB conserve toutes ses périodes distinctes et agrège seulement les écarts prouvés, sans additionner des totaux de session ni doubler les périodes

#### Scenario: Source ou mesure insuffisante
- **WHEN** une borne manque, la source change, un compteur recule ou une mesure n’est pas attribuable
- **THEN** la mesure reste explicitement indisponible et les anciennes valeurs de session ne servent pas de remplacement

#### Scenario: Reçu répété et clôture
- **WHEN** le même début/fin est répété ou le RUN est gelé puis clôturé
- **THEN** aucune période n’est réouverte ou comptée deux fois et seule sa période active est fermée

#### Scenario: Export individuel
- **WHEN** les statistiques d’un change sont exportées pour SGS
- **THEN** la contribution comporte ses bornes, RUN/SID, écarts et preuves de couverture, sans contenu de conversation ni total d’une session partagé comme total du change

#### Scenario: Compteurs natifs anciens
- **WHEN** aucun compteur natif n’a été actualisé pendant la période ou une borne temporelle manque
- **THEN** CAB indique une mesure indisponible plutôt qu’une consommation nulle, y compris en lecture de périodes anciennes

## MODIFIED Requirements

### Requirement: Résolution publique ciblée des sources Codex
CAB MUST proposer native.locate sans création de RUN et permettre native.bind
sans source_file lorsque le stockage natif standard est résoluble. Le compte
POSIX authentifié MUST déterminer la racine par défaut, avec CODEX_HOME explicite
compatible. Aucun compte ni chemin d’utilisateur particulier ne doit être fixé.

#### Scenario: Prévol sans RUN
- **WHEN** un client autorisé indique son projet et son SID
- **THEN** CAB consulte en lecture seule l’index natif pour ce seul SID sous son UID, ou à défaut d’index les seuls noms du jour UUIDv7, puis vérifie le fichier exact par propriétaire/SID/projet, sans contenu de conversation ni écriture

#### Scenario: Candidat absent ou ambigu
- **WHEN** le candidat exact manque, est multiple, lié, non régulier, d’un autre propriétaire ou d’une autre identité
- **THEN** CAB refuse avec un diagnostic stable, sans choisir une autre conversation ni parcourir leur contenu

#### Scenario: Liaison compatible et répétable
- **WHEN** une source explicite valide est fournie ou une résolution automatique réussit
- **THEN** CAB conserve SID, RUN, génération et reçus, accepte la répétition identique sans nouvel effet et refuse un remplacement non autorisé par l’index

#### Scenario: Client ancien déjà chargé
- **WHEN** le client MCP antérieur ne connaît pas encore la nouvelle signature
- **THEN** le CLI public permet la résolution puis la liaison, sans arrêter le client ni rejouer les tests

#### Scenario: Journal repris pour le même SID
- **WHEN** le journal actif indexé a changé et le codeur demande resume=true
- **THEN** CAB exige RUN en travail non gelé, aucun effet ni période ouverte, vérifie ancienne et nouvelle liaisons, conserve l’historique et SID/RUN/génération, puis utilise le fichier indexé sans rejouer de test
