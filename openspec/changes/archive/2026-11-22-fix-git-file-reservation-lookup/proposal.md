# Corriger la recherche des baux concurrents lors d’une réservation Git

CAB 3.12.0 échoue à réserver des fichiers parce que Django refuse le filtre
par préfixe sur la clé étrangère de `Lease`. L’incident
`CAB-3120-GIT-RESERVE-FIELDERROR` bloque les écritures SCM.

Appliquer le filtre à la clé de la ressource liée, sous le verrou existant.
Une réservation de fichier libre doit aboutir. Un bail de fichier d’un autre
RUN qui recouvre le chemin demandé doit toujours bloquer la réservation.
Aucune migration de données n’est nécessaire.
