# Conception

La projection conserve le dernier état observé et ne publie Actif que pour un relais et un moteur vivants, un heartbeat frais et un catalogue correspondant à la version du moteur. CATALOG_PENDING maintient l’attente sans lancer une deuxième relance.
