# Correctif minimal

La liste fermée de validateBrokerProof devient 1.7.1/1.8.0/1.9.0/1.10.0. Le schéma exact, propriétaire, groupe, manifeste, version des artefacts, processus, parent, PAUSE et HELD restent inchangés. La version chargée reste vérifiée auprès du broker ; aucune preuve n'est réécrite pour contourner la garde.

Le test de régression vérifie l'admission 1.9.0, la séparation des versions disque/chargée et les refus de versions inconnues. Le banc deux UID lit la version réelle du paquet original : avec original 1.9.0, il démarre les quatre briques originales 1.9.0, remplace seulement les trois artefacts broker par la cible dans l'espace éphémère sous UID 1002, puis exécute l'updater sous UID 1000. Le refus réel d'écriture intercomptes, la conservation des fichiers et de l'OpenCode simulé, les PAUSE, les versions et la récupération après réponse de déconnexion perdue sont vérifiés. Le parcours historique 1.7.1 garde son amorçage existant.

Une copie originale de qualification peut être reconstruite depuis les ressources publiques 1.9.0 et contrôlée par les empreintes du relevé antérieur à l'incrément 1.10.0. Aucun fichier de release installé, source broker réelle ou état métier n'est restauré.

Après qualification, l'outil n'est jamais substitué dans un cache Codex. Le paquet opérationnel corrigé doit être identifié par empreintes et installé/chargé par une voie explicitement autorisée avant la transaction réelle. Aucun commit ou push n'est réalisé par cette session.
