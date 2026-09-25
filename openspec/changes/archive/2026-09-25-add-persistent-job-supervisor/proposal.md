# Proposal

## Why

Un job OpenCode peut se clore au niveau conversationnel alors que son objectif
reste incomplet et que le gate terminal CAB est ouvert. Le contrôleur actuel
expose ce gate en mémoire, mais ne conserve pas de contrat durable ni ne
réactive la session concernée après une interruption.

## What Changes

- Ajouter un superviseur local persistant, séparé du broker et du contrôleur
  de décision, qui observe un contrat de job non secret et son état terminal.
- Persister atomiquement le contrat, le dernier jalon prouvé et les tentatives
  de reprise dans l'état local CAB afin de survivre à un redémarrage.
- Relancer, après une pause configurable de 60 secondes par défaut, la même
  session OpenCode lorsqu'elle est close ou inactive et que le gate terminal
  reste ouvert ; le message de reprise exige l'examen de CAB et du flux SSE,
  sans créer de décision ni d'approbation.
- Rendre le cycle de vie, l'état du superviseur et les raisons de non-relance
  observables localement ; exiger une clôture explicitement validée avant de
  désarmer le job.
- Distribuer et gérer le superviseur avec `/cab`, puis porter les versions du
  broker, du contrôleur et du superviseur à `0.85.0`.

## Capabilities

### New Capabilities

- `persistent-job-supervision`: contrat durable de job, observation de session
  et reprise technique non décisionnelle jusqu'au gate terminal valide.

### Modified Capabilities

- `controller-transport`: exposition locale et corrélation du contrat de job
  avec le gate terminal et l'état public du contrôleur.
- `supervision-remediation`: supervision durable, règles de reprise sûres et
  observabilité des relances de session.
- `codex-integration-distribution`: distribution, cycle de vie et commande du
  superviseur local avec le contrôleur CAB.

## Impact

Le contrôleur Node.js, un nouveau superviseur Node.js et son unité systemd
utilisateur, la commande `/cab`, le manifeste du plugin, le broker Python, les
tests Node/Python, les spécifications OpenSpec et les versions distribuées sont
concernés. Le superviseur n'accède ni aux secrets ni au projet piloté et ne
prend aucune décision métier ou CAB.
