# Porte-mandat shell exact sans recopie du modèle

## Why

Le modèle a altéré une commande shell longue approuvée ; les gardes exactes ont refusé la permission. Le développeur demande une solution sans recopie du long corps, sous SCM avec incrément puis CABU et information.

## What Changes

CAB2.1.25 permet à l’orchestrateur de déposer un payload Bash revu et son SHA256 dans un porte-mandat privé immuable, lié au RUN/job/SID/version/requête/opération. Le modèle ne reçoit que l’invocation courte scellée retournée, à transmettre dans request_validation puis au shell natif. La décision, les ressources/HELD et once restent obligatoires. Le lanceur vérifie le corps/longueur/CWD puis exécute ses octets via Bash, sans fichier mutable ni recopie modèle. Les anciens mandats restent inchangés.

## Impact

Module de staging, routes contrôleur et tests unitaires/natifs ; procédure/skill/commande/version commune ; OpenSpec/Map/BATCH/statistiques/publications puis CABU. Aucun usage de session.shell directe, plugin natif nouveau, dépendance tierce, secret ou modification des projets consommateurs. Le payload est explicitement revu comme Bash et reste sous les plafonds existants ; code non attribué, ACL ultérieure.
