# OBS06 — Démarrage du monitoring par /cab start

## Why

Je veux que /cab start prépare et démarre le service web de monitoring sans
commande manuelle supplémentaire, tout en conservant sa disponibilité après
l'arrêt ou la panne des composants qu'il observe.

## What Changes

- Installer les ressources et démarrer explicitement le service utilisateur
  du moniteur depuis /cab start, sans activation au login.
- Vérifier le service, la version, le workspace et la réponse HTTP locale ;
  réutiliser une instance conforme et préserver sa configuration.
- Préserver le moniteur lors de /cab stop et des réinitialisations CAB ;
  signaler ses échecs séparément sans remédiation des autres composants.
- Distribuer une référence opératoire et exposer l'identité HTTP non secrète.
- Aligner les sources courantes sur 1.6.1, les fichiers présents étant en 1.6.0.

## Capabilities

### New Capabilities
Aucune nouvelle capacité ; évolution du cycle de démarrage existant.

### Modified Capabilities
- `codex-integration-distribution`: installation différée, démarrage et indépendance.
- `local-web-monitor`: identité du workspace pour la vérification HTTP.
- `concurrent-run-coordination`: référence de version courante.
- `native-session-statistics`: référence de version courante.

## Impact

Commande et skill CAB, référence de service et réinitialisation, modèle systemd,
identité du moniteur, tests, versions, cadrages et documentation. Pas de nouvelle
dépendance, migration, opération Git ou modification des services actifs pendant
la préparation source. Les statistiques 1.6.0 et les contrats métier sont conservés.
