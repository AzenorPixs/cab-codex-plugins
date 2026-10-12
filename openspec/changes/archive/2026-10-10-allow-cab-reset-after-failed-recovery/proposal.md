## Why

Une récupération CAB échouée après transmission de `true` au lieu de
`/usr/bin/true`, avec un autre `change_id`, conserve le job gelé. Le protocole
interdit alors toute purge lors d'une reprise, même lorsque les effets sont
réconciliés et l'inactivité technique prouvée. Le développeur autorise une
nouvelle session CAB pour ce cas précis, sans rejouer les écritures validées.

## What Changes

- Ajouter une exception explicite et durable pour ce double écart de prévol,
  sans accepter ni normaliser le mandat divergent.
- Autoriser l'arrêt technique du contexte défaillant sans fabriquer de gate
  terminal, après gel, réconciliation et neutralisation des permissions.
- Purger uniquement les deux espaces runtime résolus du broker et du projet,
  avec l'outil existant, après préservation des preuves métier hors cibles.
- Exiger nouvelle session, nouveau job, mandats neufs et prévol exact
  `/usr/bin/true` avec le bon change avant reprise au premier état non prouvé.
- Aligner les briques distribuées de `0.86.8` à `0.86.9`.

## Capabilities

### Modified Capabilities

- `codex-integration-distribution` : exception de purge et redémarrage CAB
  après échec corrélé, préconditions et version de distribution.
- `persistent-job-supervision` : continuité métier depuis le checkpoint hors
  runtime, sans réadoption du job technique ni rejeu des écritures.

## Impact

AGENTS, commande `/cab`, skill CAB et référence de purge, cadrages, README,
CHANGELOG, versions et tests. Les API de récupération et l'outil de purge
restent inchangés. Pas de nouvelle dépendance, endpoint, installation,
activation de service, opération Git ou purge réelle dans cette session SCM.
Les trois changes historiques actifs restent hors périmètre.

## Validation du développeur

Le développeur a répondu « je valide » au périmètre proposé dans cette session
le 10 octobre 2026, y compris les deux espaces runtime résolus, les contrôles,
la synchronisation OpenSpec, l'archivage et le rapport du seul change ciblé.
