# Conception

## Gestion des lignes

Un catalogue privé du moniteur conserve les archives et les marqueurs de suppression. Il est séparé des sources du workspace et de l'état opérationnel CAB. Son chemin par défaut dépend de l'empreinte du workspace ; MONITOR_STATE_DIR permet un emplacement privé explicite. Les mutations sont sérialisées et atomiques, bornées et sans liens symboliques. Une erreur de lecture interdit la mutation et reste visible. Chaque RUN est identifié par sa génération de réservation ; le rangement d'une ancienne génération ne cache pas une reprise.

Seuls les RUN libérés DELIVERED/ABANDONED (ou un job historique désarmé avec gate validé), sans activité native, mandat ou demande en cours, sont admissibles. Un change doit avoir toutes ses tâches terminées ou être déjà archivé dans OpenSpec, et aucun RUN non terminal associé. Les données doivent être fraîches. Supprimer masque durablement la ligne du moniteur ; archiver conserve sa projection publique. Désarchiver rétablit l'affichage sans modifier le RUN réel.

## Cycle de vie

Les unités utilisateur fixes contrôleur/superviseur et monitor sont les seules cibles systemd. Aucun shell ou argument arbitraire n'est accepté. La propriété d'un service actif est vérifiée avec son MainPID et le PID/workspace exposés par son endpoint. Le broker est géré exclusivement via les routes natives connect/disconnect du MCP cgpt-validation d'OpenCode.

Une garde temporaire du contrôleur refuse les mutations pendant une action perturbatrice. Elle est acquise après contrôle de quiescence, contrôle natif et recontrôle de révision ; un RUN réservé interdit ces actions. Son jeton est borné et expirant. Un service arrêté peut être démarré sans garde si son inactivité systemd est prouvée. Le Web peut être redémarré indépendamment, uniquement si le processus est celui de l'unité dédiée. L'acceptation de son redémarrage est envoyée avant le déclenchement asynchrone systemd ; le navigateur attend ensuite une nouvelle identité de démarrage. Aucun démarrage implicite d'OpenCode.

## Repli et qualification

Le catalogue privé est indépendant et les sources observées sont conservées. Les versions et modifications source peuvent être redistribuées séparément ; aucun runtime n'est migré par SCM. Tester les erreurs, refus, concurrence, persistance, générations, absence d'effet sur OpenSpec, service Web manuel, échecs et reconnexion ; puis les deux navigateurs headless sur fixtures locales.
