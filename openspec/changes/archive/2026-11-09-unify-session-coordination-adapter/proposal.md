# Unifier l'adaptateur de coordination CAB

## Why
Les prompts doivent consommer un contrat technique identifiable dans les modes direct et piloté, sans déduire une notification de la seule présence de la boîte.

## What Changes
- Exposer une découverte sans effet des capacités `cab-session-coordination-1`.
- Documenter le raccordement des sept frontières métier et l'unique propriétaire de coordination.
- Qualifier les échanges directs et pilotés, les pauses et les répétitions au niveau CLI.

## Capabilities
### New Capabilities
### Modified Capabilities
- `project-session-dependency-coordination`: découverte et adaptation communes.

## Impact
Projet cab uniquement : CLI, contrat distribué, tests, cadrages et livraison. Le contrat métier appartient au projet prompts et reste une livraison distincte.
