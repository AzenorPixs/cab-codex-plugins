# Déploiement contrôlé

## Jeu et destinations

Le plugin distribue tous les scripts, les trois modules Python dans broker/, les unités et les ressources Web. src/ reste la source du broker ; un test impose l'égalité des copies distribuées. L'outil reçoit le plugin installé, le workspace canonique, le profil utilisateur et le répertoire réellement lancé du broker. La procédure doit prouver ce dernier par les seules métadonnées de lancement non secrètes disponibles ; une cible inconnue reste un blocage explicite. Aucun fichier de configuration ou secret n'est ouvert par l'outil.

Les seuls fichiers remplacés sont ceux du jeu CAB : scripts du contrôleur/superviseur dans le profil, script et ressources du Web dans son arborescence indépendante, modules broker dans le répertoire d'installation désigné, unités utilisateur. Les destinations dans le workspace ou dans le paquet source, les liens et fichiers non ordinaires sont refusés. L'unité active doit exécuter le chemin attendu et son identité publique doit correspondre au workspace. Le broker reste géré par OpenCode via les routes natives MCP ; aucun processus OpenCode n'est redémarré.

## Transaction

Préparer et vérifier le paquet, refuser les versions incohérentes ou les downgrades, comparer les empreintes et sauvegarder les seuls fichiers de code connus avant tout arrêt. Le journal privé garde les états systemd/MCP initiaux, le gel corrélé, les empreintes et les phases. Un verrou interdit les mises à jour concurrentes.

Si des services CAB ou le broker sont actifs, un contrôleur disponible doit prendre le gel SHARED_MAINTENANCE. DRAINING ferme l'admission ; l'outil attend HELD avec cohorte native et contexte quiescents, sans décider aucune demande. Une attente bornée conserve le gel et laisse les processus en place ; une nouvelle invocation reprend cette même transaction. Le gel résiste au redémarrage du contrôleur et préserve les réservations et pauses existantes.

Après arrêt du superviseur, déconnexion du broker, arrêt du contrôleur et du Web initialement actifs, remplacer atomiquement chaque artefact pendant que les processus sont arrêtés, puis daemon-reload. Relancer uniquement les unités précédemment actives : contrôleur, reconnexion du broker si nécessaire, Web et superviseur. Vérifier leurs versions propres, le workspace et les identités/générations des RUN avant de lever le gel. Un composant initialement inactif est installé et reste inactif.

## Repli et interruption

Toute erreur après le début des arrêts déclenche l'arrêt contrôlé des processus relancés, le rétablissement des seuls artefacts sauvegardés et de leurs permissions, puis des états initiaux. Aucun runtime métier n'est restauré depuis une ancienne sauvegarde. Si le retour arrière échoue, le gel et le journal restent conservés et le résultat indique une récupération nécessaire. Après interruption, /cab update récupère d'abord cette transaction avant d'en ouvrir une nouvelle. Une opération de schéma incompatible est refusée ; elle exige une maintenance distincte.

## Qualification

Les tests simulent systemd et OpenCode, couvrent services actifs/inactifs, broker natif, attente puis reprise, erreur de copie/démarrage/version, retour arrière et interruption. Ils contrôlent les octets des RUN et des archives sur fixtures. Les régressions CAB, les contrôles de distribution, syntaxe et OpenSpec complètent cette qualification ; aucun service réel n'est manipulé pendant SCM.
