# Libérer une réservation Git précise

Une réservation peut bloquer un autre RUN alors que les autres fichiers du RUN détenteur doivent rester réservés. L’administration locale de CAB doit pouvoir libérer un seul chemin déjà indexé après vérification de l’identité et de l’état courant.

L’opération doit conserver les fichiers et les objets Git, tracer la décision du développeur et rendre son reçu consultable après une interruption.
