## ADDED Requirements

### Requirement: Libération après travail hôte sans livraison
CAB MUST permettre au codeur de libérer les réservations de son RUN après
validation et indexation des fichiers, sans commit ni push. Le service MUST
vérifier leur concordance avec l'index isolé, conserver cet index et ses objets,
et refuser une libération si une livraison ou un effet incertain existe.

#### Scenario: Commit manuel après validation hôte
- **WHEN** le codeur libère ses fichiers validés et indexés sans CI/CD
- **THEN** CAB retire uniquement ses réservations actives et conserve un reçu idempotent
- **AND** le commit manuel ne reste plus bloqué par ces réservations
- **AND** les réservations des autres sessions restent protégées

#### Scenario: Modifications pas encore indexées
- **WHEN** un fichier réservé diffère de l'index de session ou n'y figure pas
- **THEN** CAB refuse de libérer les réservations

### Requirement: Édition des métadonnées depuis le détail d'un commit
CAB MUST proposer Éditer à côté de Fermer dans le détail d'un commit local.
L'overview MUST permettre de modifier message, auteur, courriel, date avec
fuseau, tag et description du tag. Message et description du tag MUST être
distincts. L'historique parent MUST rester ouvert et être actualisé après édition.

#### Scenario: Édition d'un commit de l'historique
- **WHEN** le développeur valide le formulaire d'édition
- **THEN** CAB réécrit le commit choisi et ses descendants sur la branche locale
- **AND** les arbres des commits, l'index et les fichiers de travail restent identiques
- **AND** les autres branches et dépôts distants restent inchangés
- **AND** les tags locaux concernés suivent les nouveaux commits

#### Scenario: Édition ou création d'un tag
- **WHEN** un nom et une description de tag sont fournis
- **THEN** CAB crée ou modifie le tag choisi avec cette description
- **AND** un nom vide supprime le tag choisi et une description sans nom est refusée

#### Scenario: Éditeur commun depuis la ligne Tag
- **WHEN** le développeur clique sur un tag du bloc Git ou sur l'ajout d'un tag
- **THEN** CAB ouvre le même overview complet de métadonnées que depuis l'historique
- **AND** le tag cliqué est présélectionné ou le nom proposé suit le défaut du projet
- **AND** la corbeille conserve son parcours de suppression directe du tag
- **AND** le sélecteur Tag à éditer reste visible sans tag existant avec le choix Créer un nouveau tag

#### Scenario: Édition depuis le dernier commit
- **WHEN** le développeur clique sur Éditer dans l'overview Dernier commit
- **THEN** CAB ouvre l'éditeur commun dans un second overview
- **AND** fermer ou annuler ce second overview conserve le détail du commit ouvert
- **AND** après enregistrement le détail du commit est actualisé

#### Scenario: Métadonnées du futur commit
- **WHEN** le développeur ouvre Nouveau commit depuis le titre du bloc Git
- **THEN** CAB propose message, auteur, courriel, date, tag et description du tag
- **AND** l'auteur et le courriel proviennent du projet et la date est préremplie
- **AND** les valeurs saisies s'appliquent au commit créé et à son tag
- **AND** message du commit et description du tag restent indépendants
- **AND** le suivi console et la confirmation de déplacement d'un tag existant sont conservés

#### Scenario: Concurrence ou signature protégée
- **WHEN** HEAD, branche ou tags ont changé depuis la lecture, ou une signature serait invalidée
- **THEN** CAB refuse l'édition avant de déplacer une référence
- **AND** un reçu incertain n'est pas rejoué automatiquement
