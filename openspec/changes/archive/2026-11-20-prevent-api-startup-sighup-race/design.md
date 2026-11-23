# Conception

Le processus API installe son gestionnaire de signal avant de servir sa première requête. La supervision dispose déjà d’une preuve de réponse par son socket Unix, avec validation du PID. Utiliser cette preuve pour les rechargements explicites. Retirer l’envoi inconditionnel effectué pendant la reprise initiale. La lecture de la configuration de l’API intervient déjà lorsque son processus démarre.
