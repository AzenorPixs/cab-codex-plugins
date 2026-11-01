# Récupérer un reçu CABU autorisé lorsque le broker MCP est failed

## Why

Le reçu global de récupération peut rester `MCP_RECOVERY_REQUIRED` alors que le
statut du broker est `failed`. L’updater 2.1.42 s’arrête avant la snapshot
native, même lorsque le développeur a explicitement autorisé le rechargement
global pour ce reçu exact. Le reçu reste alors non terminal sans permettre
d’utiliser cette autorisation après vérification de la frontière native.

## What Changes

- Autoriser le mode `--recover-mcp` exact à poursuivre depuis `failed` après une
  snapshot globale inactive, sans permission partagée et avec la même identité
  OpenCode.
- Persister l’intention avant l’unique POST global ; vérifier ensuite PID,
  version, location, empreinte des sessions et readiness fraîche.
- Continuer à refuser `needs_auth`, l’absence ou divergence de reçu, une session
  active, une permission partagée ou une intention de reload déjà présente.
- Préserver le refus du statut `failed` sans option de récupération exacte.

## Out of Scope

Aucun redémarrage/kill OpenCode, dispose, nouvel état de RUN, nouvelle
installation, décision, permission métier ou rejeu de connect/disconnect n’est
autorisé. L’état `failed` seul ne prouve pas que le rechargement est sûr.

## Acceptance Criteria

1. Un reçu `MCP_RECOVERY_REQUIRED` exact et autorisé peut traiter `failed` par
   une snapshot inactive, une intention durable, puis un seul POST global ; la
   clôture exige identité et readiness cible vérifiées.
2. Sans flag exact, ou avec `needs_auth`, identité divergente,
   session/permission active ou snapshot invalide, aucun POST n’est effectué.
3. Une intention existante, une réponse perdue ou un état restant failed
   n’autorise jamais un second POST ; le même reçu reste ouvert si la preuve
   finale manque.
