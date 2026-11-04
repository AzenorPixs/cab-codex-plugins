# Libération déléguée d’un accès HELD après compactage — CAB 2.2.32

## Why
Le propriétaire C12 a perdu le token de son parent HELD non restauré après
compactage. Tous ses membres sont terminaux ; les previews de restauration
sont inapplicables et aucune action recovery ne fournit le token en interne
pour locks/release, contrairement à release-test. Il ne faut ni forcer un
redémarrage ni réexposer/reconstituer un secret pour fermer l’accès.

## What Changes
Ajouter release-access au mécanisme owner/policy existant, vers locks/release.
Limiter l’offre au parent HELD non restauré/non quarantiné avec membres
terminaux. Lier token/fencing et empreinte complète en interne ; recontrôler
cette frontière avant/après les preuves natives. Conserver gardes ordinaires,
issues COMPLETED/RECONCILED, reçu privé et reprise exacte après réponse perdue.

## Scope
Coordinator recovery, contrôleur, tests HTTP/unité/natif et contrat distribué.
Aucune mutation manuelle ni libération de RUN/accès/baux Pixs par le correcteur.
SCM, publication puis CABU ; décision opérante owner distincte. Code non attribué,
normalisation ACL ultérieure.
