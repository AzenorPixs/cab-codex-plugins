# Étapes du RUN et versions observées

## Why

Je veux distinguer le cycle du change de la phase technique CAB et des cases
cochées dans tasks.md, tout en identifiant les versions réellement observées.
Une revue ou une vérification peut demander une nouvelle implémentation.

## What Changes

- Regrouper l’état observé sous ETAT, ajouter ÉTAPE avec position sur onze,
  et conserver la phase technique dans le détail du RUN.
- Déclarer les étapes par le contrat de progression, avec persistance,
  historique borné, reprises et retours explicites vers une étape antérieure.
- Afficher les versions du contrôleur, superviseur, broker et OpenCode ;
  conserver celle du moniteur. Une version absente reste indisponible.
- Documenter le producteur des étapes dans le protocole et le skill distribués.
- Conserver toutes les versions sources à 1.5.0 et les gates existants.

## Capabilities

### New Capabilities
Aucune nouvelle capacité ; extension des contrats existants.

### Modified Capabilities
- `local-web-monitor`: étapes distinctes des phases et versions observées.
- `controller-transport`: progression structurée et événements d'étape filtrés.
- `persistent-job-supervision`: restauration compatible des étapes et historique.
- `codex-integration-distribution`: catalogue partagé et documentation distribuée.

## Impact

Contexte de job, catalogue partagé, observation publique, moniteur, ressources
web, tests, protocole, skill et cadrages. Aucun changement de version, ajout de
dépendance, migration de runtime, service actif, permission ou transport MCP.
