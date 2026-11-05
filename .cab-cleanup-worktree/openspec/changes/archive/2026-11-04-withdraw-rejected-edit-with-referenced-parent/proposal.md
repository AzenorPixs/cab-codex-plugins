# Retrait avec parent seulement référencé — CAB 2.2.30

## Why
C12 a refusé un edit dont l’input divergent ne devait pas recevoir once.
Rejet natif ACK204 prouvé, aucun effet, mais accessId référence un parentHELD
sans membership. Le plan ne propose pas withdraw, et sa garde exige une liaison.
Le retrait sûr ne doit pas exiger de créer cette liaison artificiellement.

## What Changes
Étendre explicitement la seule frontière recovery au parent référencé unique
compatible, en conservant ses membres historiques et son empreinte. Rejeter
seulement la coordination enfant sous les mêmes preuves SDK/two-snapshot.
Aucune modification des gardes d’exécution, digest ou fin de ligne.

## Scope
Registre, plan et contrôleur de récupération, tests, contrat distribué et version.
Aucune modification manuelle de RUN Pixs. SCM puis publication/CABU ; exécution
propriétaire après activation. Code non attribué, normalisation ACL ultérieure.
