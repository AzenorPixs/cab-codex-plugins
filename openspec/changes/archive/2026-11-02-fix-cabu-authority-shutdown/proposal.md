# Préserver l’autorité du registre pendant CABU

Code de lot : code non attribué ; attribution ACL ultérieure.

## Why

CABU 2.2.1 publié sous SCM a échoué deux fois à confirmer le transfert. Les
services sont revenus en 2.2.0, le broker est en 2.2.1. Le journal montre la
perte de l’autorité flock exactement lors du stop systemd ; KillMode est
control-group, qui signale le helper avant la fin du contrôleur.
La relecture native peut aussi garder une petite taille de page pour toute
la suite et répéter un transcript complet pour chaque opération.

## What Changes

- Arrêt ciblé du principal avant le groupe pour les transferts préparés.
- KillMode=mixed dans l’unité future du contrôleur.
- Taille adaptative limitée à la page concernée, bornes natives conservées.
- Snapshot par session/génération dans une passe de réconciliation ; seconde
  lecture indépendante requise avant toute clôture.
- Incrément, publication et CABU en 2.2.2, puis rapport aux propriétaires.

## Capabilities

### Modified Capabilities
- `codex-integration-distribution`: arrêt compatible des unités et helpers.
- `opencode-v2-transport`: relecture paginée complète et bornée.

## Impact

CABU, contrôleur, client natif, unité, tests et versions distribuées.
Aucun RUN, SID ou bail Pixs modifié manuellement. Aucun contournement du
scellement, aucune permission once rejouée.
