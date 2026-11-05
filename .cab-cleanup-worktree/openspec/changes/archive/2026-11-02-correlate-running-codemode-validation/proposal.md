# Proposition

## Pourquoi

Le broker notifie le contrôleur à l’intérieur de l’appel MCP `request_validation`, avant que le wrapper natif `execute` soit terminé. Le contrôleur ne reconnaît actuellement que les wrappers Code Mode terminés, ce qui transforme une demande exacte en `NOT_ADMITTED` malgré ses identités et ressources concordantes. L’admission doit rester ciblée par RUN et ne pas confondre un lease restauré avec une interdiction globale.

## Changements

- Corréler une demande `request_validation` visible comme appel MCP unique en cours dans un wrapper `execute` natif, avec identité exacte et métadonnées complètes.
- Autoriser son admission quand un accès du même RUN demeure restauré `HELD` sur des ressources disjointes ; conserver les contrôles de conflit au moment de l’acquisition.
- Conserver les refus pour wrapper ambigu, tronqué, exécuté par le modèle, divergent ou contenant d’autres appels.
- Vérifier qu’une demande disjointe est admise alors qu’un accès restauré non recouvrant reste `HELD`; la décision, l’acquisition et la permission restent des étapes séparées.
- Incrémenter CAB, CABU et les composants versionnés en 2.1.65.

## Capacités

### Nouvelles capacités

Aucune.

### Capacités modifiées

- `controller-transport` : corréler un appel Code Mode actif exact sans attendre la fin du wrapper, et admettre les demandes disjointes du même RUN.
- `codex-integration-distribution` : aligner les composants et documenter la qualification 2.1.65.
- `opencode-v2-transport` : aligner le contrat commun de version 2.1.65.

## Impact

Contrôleur Node, tests d’intégration OpenCode V2, exigences OpenSpec, commandes CAB/CABU, plugins, cadrages et documentation. Aucun registre réel, RUN, permission, bail ou décision ne sera modifié par la qualification source.
