# Reprise C08 : indisponibilité et projection

Le 8 novembre 2026, la reprise du reçu C08 en phase `STOPPING` a maintenu
contrôleur, superviseur et moniteur arrêtés pendant plus d’une minute. Le
processus de projection utilisait environ 97 % d’un processeur et 500 Mo de
mémoire. Il a été interrompu alors que le reçu indiquait toujours `STOPPING`,
avant application côté contrôleur ; les services ont ensuite été redémarrés et
le moniteur a répondu HTTP 200.

Le propriétaire avait auparavant attesté `APPLIED` ; l’interruption ne le
remet pas en `PREPARED` et ne vaut pas nettoyage complet. Il faut réduire le
coût de projection et éviter que sa durée rende indisponibles les autres RUN.
