# Clarifier le401 et le client local authentifié

## Why
C12 a interprété les401 de GET sans authentification comme un problème d’accès
au SID. Le même SID répond200 depuis le client CAB local, y compris depuis
la session de pilotage C12, sans secret communiqué au modèle.

## What Changes
Documenter le client existant et le triage, sans nouveau code. Incrément de
révision documentaire +codex des plugins, base2.2.11 et commandes inchangées,
selon command-update.md. Le cycle SCM/publication/CABU reste vérifié.
