# Preuve structurelle et échec fermé

Le code de sonde reste scellé dans le mandat natif exact. Les ancêtres sont
parcourus depuis le PID serveur, identités PID/startTime/PPID/UID/cgroup/netns
relues en fin de capture. Un pair reste candidat sauf s’il est postérieur au
serveur, de même parent et exécutable dev/inode, sur le terminal du serveur
et du parent, avec socket ESTABLISHED vers le port API loopback attesté et
socket serveur réciproque. Le nom seul ne vaut jamais preuve.
Les descendants métier restent candidats, même si un ancêtre est exclu.
Métadonnées indisponibles : aucune preuve d’exclusion. Changement d’identité
pendant capture : couverture invalide. Deux captures exit0 fraîches et revue
propriétaire demeurent nécessaires. Les captures2.3.3 ne sont pas réutilisées.
