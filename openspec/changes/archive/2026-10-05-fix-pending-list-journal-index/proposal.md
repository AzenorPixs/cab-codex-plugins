## Why

`do_list` répare le journal de toutes les approbations avant de filtrer la
réponse. Sans index, chaque recherche de création et d'état terminal relit
le journal entier sous le verrou du magasin. Un journal volumineux peut ainsi
monopoliser un cœur et bloquer les autres appels MCP, dont la readiness.

## What Changes

- Construire un index temporaire par appel de liste non vide, depuis une seule
  lecture initiale du journal, et le transmettre aux réparations existantes.
- Préserver les résultats, expirations durables, verrous, validations et
  propagation des erreurs ; actualiser l'index après chaque écriture réussie.
- Tester les lectures, les réparations, les erreurs et les résultats filtrés.
- Aligner les artefacts distribués et la documentation sur `0.86.4`.

## Capabilities

### Modified Capabilities

- `approval-persistence` : recherches indexées pendant la réparation effectuée
  par les appels de liste d'approbations.

## Impact

Broker Python, tests de liste et de distribution, versions du contrôleur,
superviseur, plugin, commande `/cab` et projet, documentation technique et
changelog. Aucun changement de schéma, de transport, de décision métier ou
de dépendance. Aucun déploiement, commit ou push.

## Autorisation

Le développeur a validé le périmètre autonome, le cycle OpenSpec complet et
la coexistence de ce correctif ciblé avec les trois changes actifs existants
le 5 octobre 2026. Il a ensuite demandé que Codex réalise directement ce
correctif CAB. Les autres changes et la session Pixs restent hors de ce lot.
