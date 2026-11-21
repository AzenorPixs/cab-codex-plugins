# Reprendre le même journal et réserver les fichiers cadrés

Après redémarrage, le numéro de périphérique d’un journal natif peut changer alors que son chemin, son inode et son propriétaire sont identiques. CAB doit pouvoir réconcilier ce changement dans le RUN existant, en conservant l’ancienne identité et les preuves.

Une session directe doit pouvoir réserver une modification préexistante dans son cadre sans demander un accord supplémentaire. Les réservations des autres sessions restent opposables. En piloté, l’autorité du mandat reste l’orchestrateur.
