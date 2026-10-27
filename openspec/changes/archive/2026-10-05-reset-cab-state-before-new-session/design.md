## Context

Le broker utilise un espace persistant du profil OpenCode ; le contrôleur et
le superviseur utilisent aussi un espace runtime du projet piloté. Le
démarrage doit résoudre ces emplacements réellement configurés. Purger seulement
approvals.json laisserait le journal orphelin et reproduirait le blocage.

## Goals / Non-Goals

- Supprimer entièrement l'état historique des seuls espaces CAB au début d'une
  nouvelle session, sans interpréter leurs décisions ou fichiers de conflit.
- Préserver le processus et l'interface OpenCode et toute exécution en cours.
- Ne pas purger lors d'une reprise du même RUN, d'un compactage, d'un nouveau
  mandat ou change dans la même session, de `/cab test`, `run`, `update` ou `stop`.
- Ne pas modifier Syncthing, les secrets, les configurations du projet piloté,
  les archives ou les historiques natifs des agents.

## Decisions

1. L'orchestrateur contrôle l'absence de RUN, session occupée, mandat en cours
   et permission native non résolue. Une inactivité non prouvée interdit la purge.
2. Il arrête superviseur, contrôleur, heartbeats et SSE CAB, puis déconnecte
   seulement cgpt-validation par l'API OpenCode du contexte propriétaire.
3. Il résout les répertoires d'état et les éventuels chemins personnalisés sans
   lire de secret. Un chemin non couvert interdit d'annoncer une purge complète.
4. L'outil distribué reçoit les répertoires absolus dédiés nommés
   cgpt-approval-bridge et une confirmation explicite de nouvelle session. Il
   refuse les cibles ou parents symboliques et les verrous de broker occupés.
   Toutes les cibles sont contrôlées et verrouillées avant la première suppression.
5. Le contenu opaque de chaque espace est supprimé, y compris les conflits,
   checkpoints, jobs, rappels, états de remédiation et traces secondaires. L'inode
   broker.instance.lock reste verrouillé pendant la purge ; sa métadonnée est
   vidée. Les liens internes sont supprimés sans suivre leurs cibles.
6. Le broker est ensuite reconnecté par OpenCode. Le nouveau contrôleur ne
   charge aucun ancien job. Une nouvelle session maîtresse, de nouveaux
   identifiants et un nouveau test CAB sont exigés avant le travail.

## Risks / Trade-offs

La purge est irréversible et sans sauvegarde ; cette perte a été explicitement
acceptée. Le verrou technique protège contre un broker encore actif, mais les
contrôles HTTP et l'arrêt des services restent à la charge de l'orchestrateur.
Une recréation concurrente d'état ou une suppression échouée interdit le
démarrage. Aucun diagnostic antérieur ne vaut preuve de la nouvelle session.

## Validation

Tests isolés de purge complète et répétée, état absent, verrou occupé,
validation de toutes les cibles avant suppression, liens symboliques et
préservation des fichiers extérieurs. Suites CAB Python et Node existantes,
syntaxe Python/JavaScript, validation du skill, UTF-8/LF, cohérence des versions
et validation stricte OpenSpec avant archivage de ce seul change.
