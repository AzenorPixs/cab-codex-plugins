# Retrait d’un Write V2 refusé — CAB 2.2.34

## Why
C12.72 est un write/path+content protégé par une permission edit, divergent et
rejeté par ACK204. La projection omet write donc masque le call et son reçu ;
la preuve n’accepte que edit/oldString/newString. Le retrait propriétaire est
refusé malgré la frontière dédiée qualifiée. Le correcteur ne doit ni écrire
le rapport ni réconcilier le RUN pour corriger cette compatibilité.

## What Changes
Inclure write dans nativeEvidenceView et conserver le journal manquant comme
lacune de couverture. Étendre explicitement la preuve edit-permission à WriteV2
path/content fermé, avec digests/cible/call/receipt exacts et gardes existantes.
Ne pas égaliser au digest approuvé, convertir le schéma ou autoriser l’exécution.
L’enfant seul est annulé ; la libération reste une seconde action owner.

## Scope
Recovery-evidence,tests unitaires/HTTP/natif et contrat distribué cohérent.
Aucune mutation du RUN Pixs, sessions/permissions/baux/rapport par le correcteur.
SCM puis publication/CABU ; décisions opérantes distinctes. Code non attribué,
normalisation ACL ultérieure.
