# Rejet sûr des permissions shell multiparties — CAB2.2.10

## Why
Le client2.2.9 refuse trois resources shell avant journal.begin, y compris
pour reject. Reproduction isolée confirmée avec input.command identique au
composite approuvé ;aucun POST ni reçu. Le contrat de rejet privé est incomplet.

## What Changes
Séparer identité native du rejet et équivalence d’exécution. Garde once inchangée,
INTENT/ACK204 et idempotence conservés. Documentation, tests et cycle SCM déjà
mandatés. Aucun RUN Pixs ni historique CISMP5 réécrit.

## Impact
Client V2, références et qualification ;aucune dépendance/configuration nouvelle.
