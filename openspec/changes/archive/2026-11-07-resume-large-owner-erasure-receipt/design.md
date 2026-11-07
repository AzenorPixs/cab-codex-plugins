# Reprise bornée sous propriétaire

Le reçu garde son format et sa signature. ErasureTransaction lit et écrit au
plus128Mio, avec mêmes contrôles UID, lien, fichier ordinaire et HMAC. Les
fichiers déjà aux empreintes après ne sont pas réécrits. Une divergence reste
un refus ; APPLIED reste subordonné à la vérification d’absence.

La recherche de références utilise un automate de motifs littéraux plutôt
qu’une grande alternance régulière répétée. Il ne manque aucun identifiant
imbriqué ; les appels fournissant explicitement une expression régulière
gardent leur interface. Les références exactes typées restent contrôlées.

La reprise est liée à la transaction existante. La qualification et la
publication précèdent le bilan CABU terminal ; les versions de helper et de
processus chargé sont distinguées. Aucun redémarrage global OpenCode ni rejeu
de permission n’est déduit de cette réparation.
