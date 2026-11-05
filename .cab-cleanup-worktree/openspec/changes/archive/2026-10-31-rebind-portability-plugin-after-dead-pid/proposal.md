# Recharger le plugin de contexte après un redémarrage OpenCode

Code de lot non attribué ; attribution ACL ultérieure.

## Why

Le plugin `cab-context-portability` conserve un PID de préparation. Après l’arrêt d’OpenCode, un nouveau PID provoque le refus sûr `cab-context-process-changed`, même si l’ancien processus a disparu. Cela laisse le plugin désactivé après un redémarrage normal.

## What Changes

CAB ne lie le plugin au PID courant que si le PID préparé n’existe plus (`ESRCH`). Un ancien PID encore vivant ou un état indéterminé demeure bloquant. Les règles de session, modèle, fournisseur, connexion et messages restent inchangées et sont conservées en mémoire ; aucun fichier client n’est réécrit par le plugin.
