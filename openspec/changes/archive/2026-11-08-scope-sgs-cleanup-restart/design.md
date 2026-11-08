# Conception

La route `simple-sgs` ne considère plus les sessions non vérifiées d’autres RUN comme un blocage global. Elle conserve les vérifications de l’identité native, de la session historique et du redémarrage en cours. Le registre refuse toujours tout RUN réservé du change ciblé et verrouille celui-ci pendant le retrait SGS.
