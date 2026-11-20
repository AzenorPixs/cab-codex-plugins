# Actualiser les relais MCP non observés

## Why
Des ponts MCP déjà présents conservent un ancien moteur et n’émettent pas de heartbeat. Une mise à jour du paquet qui ne change pas la définition du serveur MCP peut laisser le client réutiliser cette connexion. Un programme neuf négocie et publie correctement son état ; cela ne prouve pas l’adoption des sessions existantes.

## What Changes
- Ajouter CAB_MCP_PACKAGE_VERSION à l’environnement de la seule déclaration MCP CAB gérée, avec une valeur stable égale à la version du paquet.
- Préserver l’identité effective de configuration à version inchangée, et la faire évoluer lorsque le paquet change.
- Conserver les autres configurations, secrets, variables d’environnement et préférences explicites.
- Vérifier la reconnexion réelle d’une session existante : nouveau relais/worker, négociation et catalogue observés, appel en lecture réussi.

- En dernier recours, permettre à CABU de redémarrer l’instance graphique identifiée du demandeur, sous son compte, avec preuve distincte de la reconnexion MCP.

## Impact
Intégration Codex/Codex CLI, réconciliation et tests ciblés. Arrêt borné à l’instance graphique et à ses relais identifiés. La relance attend la sortie confirmée des processus visés et la reconnexion reste observée séparément.
