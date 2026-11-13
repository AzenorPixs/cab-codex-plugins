# Finaliser les RUN sur preuves authentifiées

Code non attribué ; attribution ultérieure par ACL.

## Why
L'archivage peut laisser un RUN WORKING faute de soumission finale du LLM.
CAB doit assembler et finaliser son dossier à partir de preuves réelles.

## What Changes
Contrat immutable de finalisation au cadrage : nature, critères, vérifications,
preuves attendues et revue réservée. Registre de preuves par producteur authentifié,
périmètre RUN/change/révision/artefact. Capture automatique des reçus CAB ; API
agnostique réservée aux producteurs autorisés. Worker déterministe, attentes
explicites, clôture des périodes/statistiques et reçu sans soumission du LLM.
Les clients minimes passent le contrat et les vérifications au moteur installé.

## Impact
Django, migrations additives, exécuteurs et API, interface, clients distribués,
tests ciblés et CI/CD/CABU3.2.2. Aucun adaptateur ni dépendance métier DIU ;
les futures briques de publication CAB utilisent le même contrat de preuves.
Pas de reprise automatique des anciens RUN/imports ni de reçus rétroactifs.
