# Réconcilier les mandats directs après archivage

Code non attribué ; attribution ultérieure par ACL, sans bloquer le correctif autorisé.

## Why
Après archivage OpenSpec, un mandat direct garde le chemin actif disparu ; le
calcul de révision refuse alors les nouveaux tests avec path-missing. Aucun
mécanisme public ne permet aujourd’hui une substitution contrôlée.

## What Changes
- Commande propriétaire run.reconcile_archive, exposée par CLI/API et MCP.
- Substitution du seul change actif par son archive datée, sans effet en cours,
avec révision optimiste, idempotence et audit ; identités, gel et reçus conservés.
- Erreurs MCP lisibles sans assimiler une réponse perdue à une absence d’effet.
- Livraison 3.0.1 comprenant le delta local validé depuis 3.0.0 : administration,
projets PostgreSQL/POSIX, préférences et navigation, CSRF, inventaire agents/MCP,
parents d’atelier. Changelog complet et preuves ciblées, sans autre refactoring.

## Impact
Django commandes/API/MCP, contrats distribués utiles, documentation, changelog,
versions de distribution et paquet Debian. Aucune nouvelle dépendance ni nouvelle
migration pour la réconciliation ; les migrations de configuration/projets déjà
réalisées font partie du delta livré. Pas de modification silencieuse d’un RUN
consommateur ni de rejeu automatique de tests.
