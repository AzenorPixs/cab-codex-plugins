# Continuer une reprise CABU après une déconnexion déjà confirmée

## Why

Après une reprise avant, un nouveau reçu peut rester `ROLLBACK_FAILED` alors que le broker est déjà déconnecté par le reçu parent. Le code doit pouvoir continuer le même cycle sans traiter cet état confirmé comme une nouvelle incertitude MCP.

## What Changes

Autoriser la reprise exacte d’un reçu enfant seulement si son parent `SUPERSEDED` prouve la déconnexion, l’identité OpenCode n’a pas changé, MCP est `disabled` ou `connected`, et les artefacts sont conformes ou correspondent au paquet broker publié.

## Non-Goals

- Recharger globalement les locations OpenCode.
- Ignorer un état MCP `pending`, `failed` ou `needs_auth`.
- Modifier le RUN, les permissions ou les effets métier.

## Verification

Tester le reçu parent exact, l’état déconnecté, les empreintes broker déjà avancées et les refus sans reçu, identité ou transition concordants.
