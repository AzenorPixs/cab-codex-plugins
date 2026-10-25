# Conception

## Décisions

Je sépare l'observation web du broker, du contrôleur et du superviseur. Un
processus Node.js fournit les ressources statiques, un snapshot JSON et un
flux SSE commun aux RUN. Les collectes sont partagées entre les navigateurs,
bornées et sans chevauchement. Chaque source possède son horodatage, sa
disponibilité et une date de dernier succès. La page peut rester disponible
pendant une panne CAB.

Le contrôleur expose uniquement la limite de commande effective et un journal
d'observation public borné en mémoire. La consultation ne décide rien et ne
déclenche pas le sondage de décision natif. Les événements contiennent des
identifiants corrélés, des types et des dates ; corps de messages, commandes,
raisons libres et sorties ne sont pas transmis. La rétention ne constitue
pas un audit exhaustif : redémarrage et troncature sont explicités.

Le moniteur collecte uniquement des routes GET autorisées vers des adresses
loopback configurées. Il ne lit aucun état runtime privé. Les changes sont lus
dans le seul dossier OpenSpec du workspace, sans liens symboliques ni chemins
issus du contenu. Les cases Markdown de tasks.md déterminent X/Y, avec
exclusion des blocs de code. X/Y mesure les tâches cochées, jamais le temps
restant ni une validation indépendante. La phase métier reste distincte ;
un gate ouvert ne devient pas terminé parce que toutes les tâches sont cochées.

La page utilise des ressources locales sans CDN, du texte échappé par les API
DOM, une mise en page responsive, des filtres et un détail de RUN. Les états
ne reposent pas uniquement sur la couleur. La reconnexion SSE provoque une
réconciliation ; la fermeture du navigateur n'affecte aucun RUN.

## Configuration et compatibilité

Variables OC_Codex_MONITOR_HOST, MONITOR_PORT, MONITOR_POLL_INTERVAL_MS,
MONITOR_STALE_MS, MONITOR_TIMEOUT_MS et SUPERVISOR_URL, sous préfixe OC_Codex_,
plus les variables WORKSPACE, CONTROLLER_URL et OPENCODE_URL existantes.
Les alias OC_CGPT_ restent compatibles. Défauts : loopback 127.0.0.1, port
8790, collecte 1000 ms, fraîcheur 10000 ms, timeout 2000 ms ; URLs contrôleur
8788, superviseur 8789 et OpenCode 4096. Les valeurs invalides refusent le
démarrage. Aucun endpoint de mutation ni proxy générique n'est fourni.

## Risques et repli

Une donnée collectée reste limitée à sa cadence et à la couverture de sa
source. Les dates et lacunes sont visibles. Les événements OpenCode natifs
ne donnent aucune décision et ne fournissent pas de transcript complet.
Le moniteur utilise une mémoire bornée ; un client lent est déconnecté puis
réconcilié. Le repli consiste à arrêter ce seul processus et consulter les
interfaces existantes. Aucune migration ou installation n'est nécessaire.

## Validation

Tests Node de configuration, isolation GET, corrélation, limites, tâches,
liens, données périmées, SSE et pannes ; régressions contrôleur et supervision ;
tests et contrôle visuel Chromium et Firefox headless. Contrôle OpenSpec strict,
syntaxe, UTF-8/LF, versions et matrice documentaire avant archivage.
