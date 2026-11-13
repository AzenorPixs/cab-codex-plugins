## ADDED Requirements

### Requirement: Agents distincts au menu horizontal
La page /agents MUST figurer après Administration dans le bandeau et MUST quitter
le menu latéral Administration. L’ancien lien /administration/agents MUST rester
compatible. OpenCode, Codex CLI et Codex intégré MUST avoir trois blocs distincts,
avec leurs binaires/versions installés et profils Codex partagés sans confusion.

#### Scenario: Codex intégré actif sans CLI actif
- **WHEN** seul le binaire Codex du bureau est démarré
- **THEN** son bloc indique l’activité et le CLI reste distinct, sans dupliquer ni modifier les profils

### Requirement: Connexions MCP Unix observées par client
La détection MCP MUST supporter pipes et sockets Unix, vérifier les pairs du
transport et les rattacher au programme parent. Elle MUST NOT lire de flux,
reconnecter un client ou créer une session pour l’observer. Un contrôle impossible
MUST rester non vérifié ; le codeur en cours MUST conserver ses identités et effets.

#### Scenario: OpenCode relié par sockets Unix
- **WHEN** OpenCode et son connecteur ont leurs extrémités ouvertes
- **THEN** le bloc OpenCode passe connecté sans être faussement rouge à cause du type socket

### Requirement: Canal de releases OpenCode2
Le contrôle quotidien MUST sélectionner les releases stables2.x d’OpenCode,
sans utiliser une release1.x désignée Latest comme version disponible de ce canal.
La sélection MUST ignorer brouillons/prereleases et conserver un cache en cas d’échec.

#### Scenario: Latest pointe vers1.x
- **WHEN** une release2.x existe dans la liste GitHub
- **THEN** le cache disponible affiche cette branche2, sans réinstaller le binaire

### Requirement: Liens par identifiant métier du projet
Le catalogue MUST conserver un identifiant métier unique et utiliser cet ID dans
/projects/<identifier>, par exemple /projects/pixs. Les PK internes et relations
MUST rester inchangées ; les anciens liens par PK MUST rester compatibles et
être remplacés par l’adresse canonique. La lecture de PROJECT_ID MUST rester
locale, filtrée et littérale, sans exécuter project.env ni exposer d’autres valeurs.

#### Scenario: Projet Pixs existant
- **WHEN** le projet Pixs est sélectionné ou son ancien lien est ouvert
- **THEN** /projects/pixs présente le même projet et utilise la même identité interne pour les protocoles CAB

#### Scenario: Identifiant ambigu
- **WHEN** des projets déclarent le même identifiant ou une valeur non littérale
- **THEN** aucune nouvelle identité ambiguë n’est inventée, et les PK et anciens liens sont préservés
