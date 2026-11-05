# Réconciliation propriétaire autonome — CAB 2.2.24

## Why
C12 a sollicité l’hôte pour un appairage navigateur alors que le client API
CAB accédait au même SID et au MCP connecté. Un résumé de RUN BLOCKED dû à
d’anciens accès restaurés a aussi été confondu avec un obstacle global.
Le développeur demande explicitement la reprise et l’autonomie pour ce cas.

## What Changes
Ajouter une référence courte de reprise propriétaire, relier skill/commande,
triage/interfaces/grille/index et préciser la portée du BLOCKED dans le
cadrage de démarrage. Distinguer réconciliation ciblée, effet incertain,
accès courant non restauré et unité indépendante. Version2.2.24 et cycle SCM.

## Scope
Documentation, OpenSpec et versions ; aucune nouvelle action moteur ni garde
assouplie. Le propriétaire conserve ses décisions et preuves ; le correcteur
ne mute aucun RUN, accès, permission ou bail Pixs. Code non attribué ; ACL ultérieure.
