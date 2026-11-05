# Conception

Le budget waitMs déjà validé (0..900000ms,120000ms par défaut) borne l’attente du contrôleur avant reconnexion et la même étape du rollback. Aucun simple délai ne valide un service : version réelle de /status requise. Une erreur update-controller-start-unconfirmed est conservée, plutôt que masquée par update-broker-reload-unconfirmed.

La branche de nettoyage PREPARATION_FAILED s’applique seulement à PREPARING/PREPARED sans maintenance. Une reprise de ROLLBACK_FAILED qui échoue conserve ce même état non terminal, son identifiant et les sauvegardes. Aucun nouveau journal ne peut contourner cette récupération. Une réussite vérifie les versions antérieures et la reconnexion effective avant ROLLED_BACK.

La borne10s et le reclassement incorrect sont établis dans le code et dans le journal observé. La cause précise masquée du premier échec n’est pas inventée : démarrage et connexion restent diagnostiqués séparément. Les tests simulent un contrôleur prêt après15s, puis un service jamais prêt ; aucun test ne remplace un statut réel par une affirmation.

Le journal déjà marqué PREPARATION_FAILED par l’ancien code reste une preuve historique de cet incident. Pas de modification manuelle pour fabriquer ROLLED_BACK : constater la restauration des artefacts/services et conserver un reçu d’observation séparé. La procédure supportée réévalue ensuite l’installation cible à partir de cet état, sans restaurer les données métier.
