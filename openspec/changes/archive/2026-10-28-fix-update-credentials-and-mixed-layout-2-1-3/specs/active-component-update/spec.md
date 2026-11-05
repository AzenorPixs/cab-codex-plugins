## MODIFIED Requirements

### Requirement: Exception explicite pour les sources CAB
La politique cab-source MUST limiter le broker aux trois modules ordinaires de <workspace>/src. managed-release MAY gérer les scripts des services et le Web. Le projet MUST être nommé cab dans pyproject.toml et son manifeste CAB MUST correspondre au paquet installé. Les contrôles de type, propriétaire et absence de liens broker MUST rester applicables. Toute autre destination dans le workspace ou les caches MUST être refusée.

#### Scenario: Broker source du dépôt CAB
- **WHEN** la politique `cab-source` vise exactement src/ dans un dépôt CAB identifié et conforme au manifeste CAB installé
- **THEN** seuls les trois modules broker nommés sont sauvegardés et remplacés transactionnellement ; les autres sources restent intactes

#### Scenario: Exception source non prouvée
- **WHEN** le projet, le manifeste CAB, le chemin src/ ou les contrôles de liens ne sont pas conformes
- **THEN** l'outil refuse avant arrêt des services ou création du journal de transaction

#### Scenario: Installation mixte prouvée
- **WHEN** cab-source et managed-release sont fournis ensemble avec trois modules broker source ordinaires
- **THEN** les services et le Web basculent par liens gérés, les seuls trois modules broker sont remplacés en fichiers ordinaires et le repli restaure chaque type original

## ADDED Requirements

### Requirement: Credential contrôlé avant coupure
L’updater MUST vérifier le credential privé avant toute coupure. L’option --opencode-password-env-file MAY le provisionner depuis la seule affectation littérale OPENCODE_PASSWORD du project.env source ou des services. Les sources ambiguës MUST être refusées sans arrêt. Le credential MUST être régulier, privé et détenu par l’utilisateur. Un credential existant différent MUST rester intact. Les valeurs secrètes MUST NOT figurer dans les reçus, empreintes, arguments, environnement ou sorties.

#### Scenario: Credential absent sans source explicite
- **WHEN** le credential est absent et aucune source explicite n’est fournie
- **THEN** la préparation échoue avec une cause dédiée avant toute coupure

#### Scenario: Source explicite valide
- **WHEN** project.env contient une unique affectation littérale valide et le credential cible est absent ; les autres variables sont ignorées sans interprétation shell
- **THEN** seul le processus local provisionne le credential en 0600 puis poursuit sans exposer sa valeur

#### Scenario: Source ambiguë ou conflit
- **WHEN** la source contient une clé dupliquée, une valeur vide, des échappements/interpolations, un chemin non autorisé ou une valeur différente d’un credential existant
- **THEN** l’updater refuse sans remplacement du credential existant ni arrêt de service

### Requirement: Cause systemd conservée par service
Un échec de démarrage ou de vérification MUST conserver dans le reçu une cause filtrée par composant avant tout repli, ainsi que le résultat de ce repli. Le bilan CLI MUST rapporter ces causes même après restauration réussie. Les seules données systemd admises MUST être le composant, ActiveState, SubState, Result et ExecMainStatus ; aucune sortie brute ou secret MUST être exposé.

#### Scenario: Échec de credential au démarrage
- **WHEN** une unité retourne 243/CREDENTIALS après remplacement
- **THEN** le rapport nomme cette unité, son statut 243 et le résultat du repli sans assimiler systemctl start réussi à une application opérationnelle
