# Qualification CAB2.2.10

91tests client/récupération,145paquet/continuité,94Python et1OpenCode réel :
331réussites,0échec final. Le natif contient une permission shell à3ressources,
une garde d’exécution toujours refusée, rejet ACK privé, absence de fichier
témoin créé et aucune once. Le fournisseur est synthétique loopback.
La relecture ACK et INTENT avec un client neuf, une session étrangère, une
source non corrélée et un PID changé sont vérifiés sans POST indu.

Le premier ajout au banc natif supposait à tort que client.request retournait
une Response ;il retourne déjà du JSON. Le banc corrigé réussit. Aucune
preuve Pixs n’a été rejouée pour qualifier ce changement. La suite complète
hors périmètre inchangé n’est pas répétée pour les versions seules.

Lecture historique de l’opération composite :CANCELLED, décision APPROVED,
native/nativeResult absents, accès RELEASED/RECONCILED. Cette observation reste
distincte de la régression synthétique et ne fabrique aucun reçu rétroactif
ou NO_EFFECT. Le rejet client natif ne modifie pas la décision du mandat et
ne libère aucun accès automatiquement. Les récupérations restent propriétaires.

La nouvelle voie reject est privée au client :workspace/session/source/message/
call et PID/version sont vérifiés, mais elle ne rend pas la cible admissible
à l’exécution. Les règles de la voie once sont inchangées. Les commandes ne
sont pas conservées en clair dans le journal de refus. Empreintes et bornes :
qualification.json. Publication et activation sont des étapes séparées.
