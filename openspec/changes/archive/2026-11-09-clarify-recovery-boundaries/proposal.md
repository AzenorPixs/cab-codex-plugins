# Clarifier les frontières de récupération

## Why

Des tests historiques exigent une séquence et un refus plus restrictifs que les exigences ultérieures de récupération. Leur divergence empêche de qualifier la suite globale de coordination.

## What Changes

- Préciser que le retrait suivi d'une libération distincte reste un chemin possible, et que la libération RECONCILED d'une préparation non émise reste soumise à ses propres gardes.
- Préciser qu'une lecture native tronquée vérifiée peut être classée non mutante sans prouver le contenu complet lu.
- Aligner les scénarios de tests sur ces exigences sans affaiblir les contrôles d'identité, de permission et de preuve.

## Capabilities

### New Capabilities

### Modified Capabilities
- `orchestrator-recovery-policy`: Clarifier la compatibilité des chemins de retrait et de libération et le statut d'une lecture tronquée.

## Impact

Spécification, tests du contrôleur et documentation ciblée ; aucune livraison ou activation.
