# Masquer les capacités des consultations publiques

Code non attribué ; convergence ACL ultérieure. Correctif demandé dans le mandat SCM permanent et confirmé par le développeur après explication des jetons.

## Why
Les GET masquent les jetons des baux de test mais les projections des accès de travail les exposent encore. Un diagnostic ne doit pas transmettre les capacités de mutation au modèle ou aux journaux.

## What Changes
Masquer token dans les projections GET des accès de travail (/runs, statut, locks, coordination/global et autres projections issues de la même liste). Ne modifier ni stockage, jeton, fencing, décision, once ni garde. Les POST autorisés d’acquisition/réconciliation conservent le retour unitaire requis. Documenter la conservation locale des jetons et la récupération qualifiée si le retour d’acquisition est perdu. Version2.3.8, tests, archive/SGS, DIU puis CABU quand C12 atteint une frontière sûre.

Périmètre : contrôleur, tests HTTP, documentation distribuée et versions couplées ; aucune mutation des services ou états de C12 durant ses sondes.
