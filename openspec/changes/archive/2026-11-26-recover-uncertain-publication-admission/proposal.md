## Why

Une interruption de l’admission de publication peut laisser le RUN en état `UNKNOWN` sans reçu de livraison. Deux tentatives de la livraison 3.46.0 ont nécessité une réconciliation administrative pour établir l’absence d’effet.

## What Changes

- Rattacher automatiquement un reçu de livraison compatible déjà créé.
- Conserver le reçu d’incertitude et reprendre une seule fois lorsque le prévol et les effets observables prouvent l’absence d’effet de la tentative interrompue.
- Afficher un point d’interrogation dans un rond bleu pour l’état « Indéterminé » dans les douze tableaux d’étape.

## Capabilities

### Modified Capabilities

- `publication-cycle` couvre la réconciliation autonome d’une admission et le rendu de son état.

## Impact

Worker de publication, reçus du cycle et tableaux de passages. Les essais utilisent PostgreSQL éphémère, Chromium et Firefox.
