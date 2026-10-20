# Service web de monitoring — CAB 1.6.1

Cette procédure est exécutée pendant `/cab start`, après résolution du
workspace et prévol, avant le démarrage du contrôleur. La préparation des
sources, l'installation du plugin ou l'ouverture de session ne la déclenchent
pas. Elle ne démarre aucun agent ni n'accorde aucune permission CAB.

## 1. Identité et configuration attendues

Résoudre le workspace absolu canonique et la source du plugin réellement
installé. Utiliser Node.js et les versions de DEVOPS.md. Déterminer les seules
options non secrètes explicitement fournies : OC_Codex_WORKSPACE,
OC_Codex_MONITOR_HOST, OC_Codex_MONITOR_PORT et les URLs de composants.
Les autres options du moniteur gardent leur contrat dans TECHNICAL.md.
Les alias OC_CGPT_ restent acceptés. Les défauts sont 127.0.0.1 et 8790.
Seuls 127.0.0.1 et ::1 sont autorisés ; former une URL IPv6 avec crochets.

Ne pas lire un environnement complet, fichier secret ou fichier env brut.
Préserver une configuration existante ; ne pas la réinitialiser aux défauts.
Si les options non secrètes connues ne suffisent pas à vérifier une instance
existante, signaler cette limite et demander les seules valeurs manquantes,
sans tenter de les deviner ni réécrire le fichier.

## 2. Réutilisation d'une instance active

L'unité attendue est `cgpt-approval-bridge-monitor.service`. Consulter ses
métadonnées systemd utilisateur, notamment ActiveState, MainPID et FragmentPath,
sans demander les valeurs d'environnement. Vérifier le chemin de l'unité
attendue dans le profil utilisateur et son appartenance à cette installation.

Si elle est active, interroger uniquement l'URL loopback attendue :

- GET /api/snapshot doit réussir et annoncer version 1.6.1 ainsi que
  identity.workspace exactement égal au workspace canonique attendu ;
- GET / doit servir la page CAB Monitor ;
- l'unité doit utiliser Restart=on-failure.

Réutiliser une instance conforme **sans redémarrage, recopie de fichiers ni
modification de configuration**. Une identité, version ou unité divergente
interdit toute réaffectation ou mise à jour active implicite. Signaler le
diagnostic sans arrêter le moniteur ni une autre brique. Un port occupé
n'autorise ni à tuer son propriétaire ni à choisir un autre port arbitraire.

## 3. Installation différée inactive

Si l'unité est inactive ou absente et appartient au périmètre autorisé,
préparer ce jeu complet sous
`~/.local/share/cab-approval-bridge-monitor/` :

```text
scripts/
  cgpt-approval-bridge-monitor.mjs
  cgpt-approval-bridge-monitor-data.mjs
  cgpt-approval-bridge-monitor-events.mjs
  cgpt-approval-bridge-run-steps.mjs
  cgpt-approval-bridge-statistics-maintenance.mjs
  cgpt-approval-bridge-observation-statistics.mjs
web-monitor/
  index.html
  app.mjs
  stats.mjs
  style.css
```

Conserver ces deux dossiers frères : les imports et ressources sont résolus
relativement aux modules. Vérifier la version 1.6.1 et la présence de chaque
fichier avant publication du jeu. Aucune dépendance tierce n'est installée.
Refuser les destinations symboliques, étrangères ou sans propriété prouvée.
Remplacer les seuls fichiers nécessaires de façon atomique ; conserver les
anciens fichiers du périmètre pour un repli ciblé en cas d'échec. Ne pas
supprimer un répertoire étranger ni remplacer des fichiers d'un service actif.

Installer le modèle distribué dans
`~/.config/systemd/user/cgpt-approval-bridge-monitor.service` et préparer
`~/.config/cab-approval-bridge/monitor.env` seulement s'il est absent, ou lors
d'une actualisation de configuration explicitement validée. Préserver les
valeurs existantes sinon. Ce fichier distinct de controller.env contient
uniquement la configuration non secrète nécessaire, notamment le workspace.
Écrire en UTF-8/LF, atomiquement, mode 0600 et répertoires privés. Protéger les
valeurs littérales avec les règles EnvironmentFile de systemd, y compris les
chemins avec espaces ou guillemets ; ne jamais utiliser source, eval ou une
expansion shell pour charger ce fichier.

L'unité conserve Restart=on-failure, UMask=0077 et NoNewPrivileges=true.
Elle ne déclare ni After, Requires, Wants, BindsTo, PartOf, Requisite ou
PropagatesStopTo vers les services contrôleur/superviseur, ni section Install.

## 4. Démarrage et preuve

Après préparation réussie, exécuter séparément et contrôler chaque résultat :

```bash
systemctl --user daemon-reload
```

```bash
systemctl --user start cgpt-approval-bridge-monitor.service
```

```bash
systemctl --user is-active cgpt-approval-bridge-monitor.service
```

Ne jamais utiliser systemctl --user enable : aucune activation au login.
Vérifier ensuite GET /api/snapshot et GET / comme dans la section 2, avec
requêtes bornées selon le timeout configuré et au plus cinq tentatives. Un
HTTP 200 d'un autre processus ou un fichier installé ne prouve pas le succès.
Afficher l'URL réelle uniquement comme disponible après preuve conjointe du
service, de la page, de la version et du workspace.

L'installation du jeu source dans SCM n'exécute aucune de ces commandes sur
le profil réel. Ces opérations appartiennent à l'invocation explicite de
/cab start ; les tests emploient uniquement des répertoires et services isolés.

## 5. Arrêt, erreurs et indépendance

`/cab stop` et `references/session-reset.md` préservent le service, sa
configuration, son jeu installé et ses connexions propres. Ils arrêtent les
seuls clients SSE et services CAB de pilotage concernés. Le moniteur reste
disponible pour afficher contrôleur, superviseur et broker indisponibles.
Un arrêt du moniteur nécessite une demande explicite distincte, exécutée par
`systemctl --user stop cgpt-approval-bridge-monitor.service`.

Une panne ou un échec de démarrage du moniteur est signalé séparément du
statut CAB, avec cause constatée et URL attendue. Il ne ferme aucun RUN, ne
redémarre aucune autre brique et ne modifie aucune permission. Ne pas
annoncer le monitoring disponible si sa preuve échoue. CAB_ACTIF conserve
ses préconditions existantes ; un succès CAB peut donc être accompagné d'un
diagnostic de monitoring indisponible. Les deux résultats doivent être visibles.
Le lancement manuel documenté reste une solution d'exploitation distincte.
