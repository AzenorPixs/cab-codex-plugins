## ADDED Requirements

### Requirement: Arrêt MCP borné à frontière sûre
CAB MUST arrêter seulement son moteur MCP enfant identifié par UID/PPID,
boot/start et pidfd. Il MUST vérifier la quiescence avant toute action et tout
signal. Arrêt gracieux puis SIGTERM MAY précéder SIGKILL si autorisé. Une
requête en vol/indécise, un PID divergent ou une sortie non prouvée MUST protéger
le processus ; aucune application native ni appel métier MUST être rejoué.

#### Scenario: Moteur ignorant SIGTERM
- **WHEN** le moteur reste vivant après les délais et la frontière reste sûre
- **THEN** CAB utilise SIGKILL par pidfd si autorisé puis vérifie sa sortie avant remplacement

#### Scenario: Protection ou désactivation
- **WHEN** un appel est indécis, l'identité diverge ou SIGKILL est désactivé
- **THEN** CAB refuse l'escalade correspondante et conserve un diagnostic

### Requirement: Politique et journalisation d'arrêt
CAB MUST valider mcp_reload dans /etc/cab/cab.json : graceful_timeout_seconds,
term_timeout_seconds et kill_timeout_seconds bornés0.1–120s, allow_sigkill booléen.
Il MUST fournir les seuls paramètres utiles au relais et enregistrer les étapes
techniques sans secrets ni contenu métier. Une politique indisponible MUST NOT
permettre SIGKILL. Un ancien relais MUST NOT être déclaré porteur du nouveau code.

#### Scenario: Politique modifiée
- **WHEN** l'administrateur enregistre une politique valide
- **THEN** les relais compatibles la lisent au prochain arrêt sans accès au fichier privé

### Requirement: Versions MCP observées diffusées en direct
CAB MUST exposer une projection autorisée minimale des connecteurs réellement
connectés, versions moteur/catalogue/relais et profil. Electric MUST pousser les
changements et déconnexions observés sans rafraîchissement de page. Aucun PID,
secret ni chemin privé MUST être exposé par ce flux.

#### Scenario: Changement ou déconnexion
- **WHEN** une nouvelle version ou une déconnexion est observée
- **THEN** Agents et le bandeau sont actualisés sur le même abonnement Electric

### Requirement: Libellés de versions avec indicateur connecté
Le bandeau MUST afficher à gauche d'API les groupes de connecteurs connectés,
avec boule verte et texte vert gras MCP Codex/OpenCode vX.Y.Z. Agents MUST afficher
les versions du même profil. Les versions différentes d'un profil MUST rester
visibles et un catalogue ancien MUST NOT être présenté comme actualisé.

#### Scenario: Plusieurs profils et versions
- **WHEN** Codex et OpenCode sont connectés avec plusieurs versions
- **THEN** les libellés sont groupés depuis API vers la gauche et les deux pages suivent les mutations sans reload
