# Régulariser les RUN historiques archivés

Code non attribué ; attribution ultérieure par ACL.

## Why
Deux RUN DIU archivés restent WORKING car leurs tests historiques ne possèdent
pas les reçus nécessaires à la revue normale. Les rejouer ou inventer des reçus
ne convient pas.

## What Changes
Ajouter une inspection et une clôture historique explicite, propriétaire direct
ou administrateur, sur archive unique complète et preuves locales bornées.
Une autorisation développeur et une justification sont conservées avec les
empreintes calculées par CAB. CLOSED historique ne vaut pas acceptation normale.

## Impact
API/CLI/MCP CAB, audit durable sans migration, documentation et tests ciblés.
CI/CD CAB 3.1.3 puis CABU ; régulariser uniquement les deux RUN DIU autorisés.
Aucune modification du code DIU ni exécution de ses anciens travaux.
