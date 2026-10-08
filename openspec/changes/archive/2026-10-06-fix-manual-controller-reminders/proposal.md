## Why

Les relances du contrôleur sollicitent un tour Codex auxiliaire même en mode
manuel. Ce tour peut publier une décision HTTP à la place de l'orchestrateur
principal. Le contrat manuel doit aussi protéger les relances.

## What Changes

- En mode manuel, signaler les rappels corrélés sans créer de thread ni de
  tour Codex, y compris lorsqu'un heartbeat les reprend.
- Vérifier que des rappels répétés laissent la demande indécise et qu'une
  décision HTTP explicite reste disponible et unique.
- Incrémenter toutes les briques versionnées de `0.86.5` à `0.86.6`, avec
  alignement de la documentation et du contrat de distribution courant.

## Capabilities

### Modified Capabilities

- `controller-transport`: protection du mode manuel pour les rappels.
- `codex-integration-distribution`: version de base courante `0.86.6`.

## Impact

Contrôleur, tests ciblés, déclarations de version, cadrages et documentation.
Aucune modification du mode automatique, des interfaces HTTP, des schémas
persistants ou du protocole MCP. Aucun déploiement, publication ou effet Git.
Le développeur a autorisé ce change dédié malgré trois changes préexistants,
qui restent hors périmètre et ne sont ni modifiés ni archivés.
