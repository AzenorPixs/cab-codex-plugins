# Proposal

## Why

La distribution CAB expose déjà `/CABU`, mais ne fournit pas de plugin CABU autonome ni de skill portant cette fonction. Les trois points d’entrée demandés doivent être livrés ensemble et conduire à l’unique procédure `/CAB update`.

## What Changes

- Ajouter un plugin Codex autonome `cabu` au catalogue CAB avec un skill invocable qui déclenche l’update canonique CAB.
- Conserver `/CABU` comme commande distincte, sans dupliquer la procédure d’update ; la distribuer avec le plugin CABU et le plugin CAB.
- Vérifier la cohérence entre marketplace, manifests, skill, commande et versions, et incrémenter la base commune à `1.10.11`.
- Ajouter les tests et mettre à jour les spécifications et documents de distribution concernés.

## Capabilities

### New Capabilities

### Modified Capabilities

- `codex-integration-distribution` : spécifier le plugin CABU autonome, son skill d’entrée, la commande `/CABU` et leur distribution versionnée cohérente.

## Impact

Le change OpenSpec `codex-integration-distribution`, `.agents/plugins/marketplace.json`, les manifests et skills des plugins, `.codex/commands/CABU.md`, les validations de distribution, les métadonnées de version et les cadrages CAB. Aucun plugin installé ni service actif ne sera modifié.
