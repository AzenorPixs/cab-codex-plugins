# MAI07 — Forcer la mise à jour CABU et aligner les briques en 1.10.9

## Objectif

Faire de `/CABU` le point d'entrée qui mène la mise à jour CAB jusqu'à son
rapport terminal. La procédure valide le paquet, arrête systématiquement les
trois unités systemd CAB, remplace les fichiers des quatre briques et redémarre
les trois unités. Elle ne consulte pas les états CAB comme précondition.

## Comportement requis

- Toute invocation valide arrête les trois unités systemd CAB puis remplace
  atomiquement leurs fichiers et les trois fichiers broker de la destination
  déclarée ; une version déjà installée ne supprime pas le redémarrage.
- Après `daemon-reload`, les trois unités sont démarrées, sans activation au
  démarrage du compte.
- L'absence d'OpenCode ou de son API ne bloque pas la mise à jour des fichiers
  broker. La version runtime broker est rapportée `INDISPONIBLE` si elle n'est
  pas observable.
- Le rapport distingue source publiée, plugin installé, fichiers déployés,
  processus actifs et résultat de la transaction.
- Une erreur de démarrage déclenche le retour aux artefacts sauvegardés et le
  redémarrage des trois unités ; l'échec du repli reste explicite.
- Les fichiers distribués utilisent la version de base `1.10.9` et le plugin
  un cachebuster neuf.

## Hors périmètre

- Modifier les données ou statuts métier des RUN.
- Modifier le lancement MCP, les fichiers d'environnement, les secrets, les
  projets pilotés ou les historiques des RUN.
- Activer les unités au démarrage, fermer OpenCode, reprendre les RUN ou
  autoriser un mandat métier.

## Validation

Les tests isolés couvrent l'absence de lecture des états RUN avant arrêt,
l'arrêt systématique des trois unités, le remplacement des fichiers broker sans
OpenCode, le redémarrage sans `enable`, le rapport broker indisponible, les
reprises et les retours arrière. La validation runtime distingue les processus
systemd vérifiés du broker non joignable.
