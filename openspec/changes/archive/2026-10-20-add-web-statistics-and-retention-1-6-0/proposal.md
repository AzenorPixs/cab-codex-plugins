# STA04 — Statistiques web et purge des historiques CAB 1.6.0

## Why

Je veux consulter les statistiques CAB depuis le menu gauche et supprimer
explicitement les historiques statistiques anciens, sans compromettre les
RUN ni leurs preuves opérationnelles.

## What Changes

- Ajouter STATS sous MONITOR et une page responsive : courant, dernière
  livraison, 24 h, 7 jours, 30 jours, filtre RUN, provenance et couverture.
- Exposer un agrégat JSON filtré des magasins statistiques existants, sans
  lecture du runtime privé par le moniteur ni addition des sources recouvrantes.
- Ajouter une purge manuelle après prévisualisation et confirmation pour
  1, 3, 7, 30 ou 365 jours. Préserver les contextes actifs ou référencés,
  fichiers opérationnels, preuves et agrégats globaux non décomposables.
- Aligner les briques sources et supports de distribution sur 1.6.0.

## Capabilities

### New Capabilities
- `web-statistics-retention`: tableau statistique et purge propriétaire bornée.

### Modified Capabilities
- `local-web-monitor`: navigation et exception explicite de maintenance statistique.
- `native-session-statistics`: purge d'historiques sans effet sur les décisions.
- `codex-integration-distribution`: distribution source cohérente 1.6.0.
- `concurrent-run-coordination`: référence courante de version.

## Impact

Interface, modules monitor/controller/statistics, module de maintenance, tests,
versions et documentation. Aucun ajout de dépendance, migration active,
installation, publication, opération Git ou purge réelle pendant la session.
Le cycle OpenSpec, son archivage et son rapport individuel font partie du
périmètre validé le 20 octobre 2026.
