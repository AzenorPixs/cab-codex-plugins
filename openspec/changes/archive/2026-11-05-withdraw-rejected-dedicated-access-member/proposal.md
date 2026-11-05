# Retrait du membre dédié refusé avant once — CAB 2.2.33

## Why
C12.60 a un accès HELD dédié, un edit natif divergent rejeté par ACK204, aucune
once/native/nativeResult et un SID idle. Le token a disparu du contexte après
timeout. Le retrait exigeait plusieurs membres et release-access exige des
membres terminaux : aucune composition n’était offerte pour cette frontière.

## What Changes
Autoriser explicitement la seule voie recovery à traiter un accès dédié
non restauré/non quarantiné avec l’unique membre PREPARED/APPROVED. Conserver
les preuves natives de refus, deux frontières stables et l’empreinte du parent.
Annuler le membre uniquement ; le parent reste HELD inchangé. La libération
reste une seconde action owner release-access existante, avec ses gardes.

## Scope
Registre/recovery/contrôleur,tests HTTP/unité/natif et contrat distribué.
Aucune action sur le RUN Pixs par le correcteur, aucun input rendu exécutable.
SCM puis publication/CABU ; décision opérante owner distincte. Code non attribué,
normalisation ACL ultérieure.
