# Conception

`ResourceRunRegistry.acquireTests` garde sa vérification d'admission et de
portée. Pour un RUN en phase WORK, il distingue désormais :

1. toute réservation de test HELD ou WAITING déjà détenue par ce même RUN,
   qui continue de bloquer une seconde acquisition ;
2. les accès normaux actifs ou WAITING de ce RUN, qui ne bloquent l'acquisition
   que si leurs ressources recouvrent celles de l'environnement demandé.

Le test de recouvrement réutilise `conflicts`, qui traite `project:*`, les
ressources identiques et les préfixes de fichiers, avec les modes d'accès
existants. Les accès UNKNOWN restent actifs et bloquants lorsqu'ils recouvrent
la ressource ; les accès disjoints restent inchangés et protégés.

La file FIFO et l'attribution atomique entre réservations d'environnements ne
changent pas. Le code d'exécution native et la vérification du bail détenu ne
changent pas.
