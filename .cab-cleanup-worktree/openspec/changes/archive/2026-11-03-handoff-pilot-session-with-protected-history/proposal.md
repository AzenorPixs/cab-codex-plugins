# Changer la session de pilotage dans le même RUN — CAB 2.2.13

Code non attribué ; attribution ACL ultérieure.

## Why
Le transfert ordinaire refuse correctement les accès historiques non résolus.
C12 doit pouvoir poursuivre un travail disjoint sans déplacer ni effacer ces
protections, ni rejouer les permissions de son ancienne session.

## What Changes
API distincte /runs/<run>/session-handoff : aperçu de frontière puis décision
explicite du propriétaire, journal PREPARED/COMMITTED/DONE durable et reprise
idempotente. Le SID courant change ; RUN, contexte, version de réservation,
job, change, jalon, décisions, opérations, accès et réservations restent acquis.
Les anciens SID sont observés mais révoqués pour toute nouvelle permission.

## Compatibility
Le transfert ordinaire reste strict. Aucun effet natif n'est émis par le
handoff. Avant son utilisation le registre reste compatible ; après création
d'un reçu, une ancienne version ne connaissant pas sessionHandoffs échoue
fermée. Reprise en avant obligatoire ; aucun downgrade d'un registre utilisé.
Une frontière incomplète, occupée ou avec permission reste refusée.
