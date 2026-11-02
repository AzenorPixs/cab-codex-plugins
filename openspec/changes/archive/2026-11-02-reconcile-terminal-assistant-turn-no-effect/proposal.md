# Réconcilier un tour approuvé terminé sans appel d’effet

## Why

Après redémarrage, un mandat approuvé peut rester `UNKNOWN` alors que la
session montre un wrapper `request_validation` exact suivi de la fin native
`finish=stop`, sans appel shell/édition, permission ou événement terminal.
L’absence de callID ou d’événement, seule, ne suffit pas à inférer `NO_EFFECT`.
Le protocole doit qualifier un cas plus étroit à partir du transcript natif
complet et du journal synchronisé, puis invalider définitivement l’accord
local avant de libérer l’accès.

## What Changes

- Ajouter une preuve `NO_EFFECT` uniquement pour un tour utilisateur complet,
  stable deux fois, terminé par assistant `finish=stop`, sans appel natif
  d’effet, permission ou événement tool dans le journal synchronisé.
- Terminaliser et invalider localement l’ancien accord avant de libérer l’accès
  avec révisions inchangées.
- Toute preuve absente, partielle, divergente, callID/permission présent,
  activité native ou opération sœur conserve `UNKNOWN` et l’accès protégé.

