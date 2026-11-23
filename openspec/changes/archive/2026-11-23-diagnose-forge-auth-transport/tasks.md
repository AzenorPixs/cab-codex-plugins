## 1. Diagnostic et validation

- [x] 1.1 Indiquer l’étape et la cause identifiable d’une erreur de transport dans les vérifications d’authentification des trois forges, sans exposer de secrets.
- [x] 1.2 Vérifier les diagnostics, les résultats HTTP et les vérifications de secours sur le dépôt.

## Sous-lots normalisés

### Diagnostic de transport et contrôles d’authentification

Le change `diagnose-forge-auth-transport` porte les tâches 1.1 et 1.2. Code non attribué. Le client HTTP instrumente les requêtes du profil et du dépôt. Les essais locaux exigent des réponses et des erreurs de transport contrôlées. Le 23 novembre 2026, la sonde sans jeton a constaté une résolution DNS suivie d’un délai TCP pour la cible GitLab configurée. La vérification réelle du jeton dépend de la disponibilité de la forge.

Le 23 novembre 2026, les six tests de `tests/platform-forge-auth.py` sont passés avec l’interpréteur et les dépendances Python du projet. Ils couvrent les trois forges, les étapes réseau, la vérification TLS, les réponses HTTP et les vérifications de dépôt.
