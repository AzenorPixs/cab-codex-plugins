# Retrait ciblé d’édition attachée et historique annulé — CAB 2.2.25

## Why
C12.33 est PREPARED/APPROVED, sans émission CAB, avec edit avorté/refus natif
ACK204. Son accès conserve une ancienne opération CANCELLED d’un autre SID,
sans native/résultat/once. Le plan refuse le retrait à cause du SID historique ;
le contrôleur n’admet en outre que la preuve shell pour un enfant attaché.

## What Changes
Accepter aussi la preuve edit qualifiée existante et l’historique autre SID
uniquement CANCELLED sans native/nativeResult/once, mêmes RUN/contexte/version.
Conserver le parent strictement identique. Gardes d’émission, once et preuve
double inchangées. Tests de rejet/persistance et documentation distribuée.
Version2.2.25 ; SCM, commit, publication puis CABU.

## Scope
Deux gardes ciblées du registre/contrôleur, tests, OpenSpec, docs et versions.
Aucune mutation du RUN Pixs par le correcteur. Aucun nouveau endpoint, permission,
rejeu, détachement ou libération de parent. Code non attribué ; ACL ultérieure.
