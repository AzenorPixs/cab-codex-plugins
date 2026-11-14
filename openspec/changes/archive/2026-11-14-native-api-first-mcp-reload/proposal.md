# API native prioritaire et accès OS effectifs

Code non attribué ; attribution ACL ultérieure.

## Why
Le moteur MCP redémarre mais un client doit aussi relire son catalogue. Le client
OpenCode est en outre bloqué par une contrainte de mode POSIX contraire au mandat.

## What Changes
- API native prioritaire pour Codex, Codex CLI et OpenCode, liée aux instances
  réelles ; socket Codex app-server enregistré, replis possédés et bornés.
- Aucun refus ou normalisation fondé sur un mode POSIX existant ; accès réel
  accordé par l'OS, authentification par jeton et identités conservées.
- Dépendance Debian git et livraison SCM/CI/CD CAB3.2.6 avec tests minimaux.

## Impact
Adaptateurs et configuration de contrôle natif, clients, accès aux fichiers,
recette Debian et documentation. La première adoption du socket doit préserver
SID/RUN ; aucun serveur isolé ne peut attester le rechargement d'un autre client.
