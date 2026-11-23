# Conception

Le dialogue ouvert utilise une grille avec un en-tête et une navigation de
hauteur intrinsèque. La ligne centrale est défilable. Le dialogue borne ses
dimensions par la fenêtre, quelle que soit la notification présentée.

La commande Web envoie un POST à `notifications/clear-messages`. Le service
vérifie le rôle administrateur, verrouille les lignes de type `message` et
enregistre leur retrait par un reçu `CLEARED` avant suppression, dans la même
transaction. Une republication de même identité retrouve son reçu. Les
messages créés après la sélection de purge restent disponibles.

Le Web retire de l’aperçu les messages listés au départ de l’action ainsi que
ceux identifiés par le serveur. Les questions restent navigables. Le flux
Electric propage les suppressions aux autres consommateurs. Un refus de l’API
est affiché dans la popup.
