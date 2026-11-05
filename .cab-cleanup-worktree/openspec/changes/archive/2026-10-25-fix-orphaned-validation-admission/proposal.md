# L1 — Corriger l’admission des validations orphelines

## Why

Un refus natif ask peut survenir après persistance de l'opération et du
propriétaire du requestId, avant création de la validation locale. La demande
broker reste PENDING et ses notifications suivantes sont refusées par
request-reconciliation-required. Le développeur a autorisé le lot source et
tests isolés le 2026-10-25, par accord transmis depuis le chat C08.

## What Changes

- Vérifier les gardes locales et natives avant l'admission durable ; enregistrer
  ensemble opération et propriétaire avant traitement de la validation.
- Ajouter une réconciliation explicite du seul prévol orphelin non exécuté,
  avec autorisation spécifique, preuves natives, reçu durable et idempotence.
- Limiter la validation reconstruite au seul rejet explicite ; interdire
  approved, needs_clarification, acquisition et once pour cette opération.
- Conserver le retry existant : décision locale rejected et preuve MCP
  REJECTED requises avant essai neuf dans la même candidate.

## Capabilities

### Modified Capabilities

- `controller-transport`: admission et réconciliation ciblée du prévol.
- `approval-persistence`: propriétaire, opération et reçu filtré durables.
- `approval-workflow`: refus seul sans permission implicite.

## Impact

Quatre modules CAB, trois fichiers de tests, contrats et documentation.
Aucune dépendance, installation, écriture Pixs ou runtime vivant, relance
partagée, opération Git ni archivage n'est autorisé par ce lot.
