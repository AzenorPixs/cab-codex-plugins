## Why

Après un arrêt non propre, le broker répare le journal avant de traiter stdin
MCP. Chaque approbation terminale provoque deux lectures intégrales du journal,
même lorsque ses événements existent déjà. Ce coût peut dépasser le délai
d'initialisation d'OpenCode et provoquer de nouveaux arrêts non propres.

## What Changes

- Indexer une fois les couples `(approval_id, event_type)` pour la boucle
  initiale de réparation après un arrêt non propre.
- Actualiser cet index local seulement après une écriture durable réussie.
- Préserver la récupération synchrone, les écritures du journal, ses contrôles
  d'intégrité, les verrous et les traitements hors de cette boucle.
- Porter les versions CAB courantes à `0.86.3`, y compris `pyproject.toml`.
- Vérifier la réparation, l'idempotence, les erreurs, les divergences et
  l'initialisation MCP sur des données synthétiques isolées.

## Capabilities

### Modified Capabilities

- `approval-persistence`: recherches d'événements indexées pendant la
  réparation initiale post-crash, sans modification de ses garanties.

## Impact

Le serveur Python, un nouveau test de récupération, le test de distribution,
les versions du contrôleur, du superviseur, du plugin et de la commande CAB,
`pyproject.toml`, `TECHNICAL.md`, `BUILD.md`, `README.md` et `CHANGELOG.md`.
Aucune dépendance, migration, modification de schéma ou nouvelle readiness.
La copie globale du broker et les redémarrages utilisateur sont hors périmètre.
Les autres changes actifs et les entrées historiques restent inchangés.

Extension documentaire explicitement validée : rétablir dans `AGENTS.md` la
règle de rapport post-archivage déjà spécifiée, et reproduire exactement cet
ajout dans `/home/devops/datas/template/AGENTS.md`, modèle des projets. Aucun
autre fichier de template ni synchronisation globale n'est concerné.
