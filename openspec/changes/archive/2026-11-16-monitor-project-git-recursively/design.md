# Conception

Une surveillance inotify récursive suit les répertoires de chaque projet READY, y compris les créations, suppressions, renommages et changements de chemin. Une file en mémoire regroupe les événements par projet ; un seul worker effectue les mesures. Les déclenchements explicites et automatiques partagent une exclusion globale et le délai minimal. La projection Git existante transmet les changements via Electric. Une perte d’événements ou de surveillance déclenche une reconstruction et une nouvelle mesure ; les erreurs restent visibles dans le journal.

Les réglages PostgreSQL s’appliquent à chaud : 7 secondes sans événement, 30 secondes entre deux analyses du même projet et 70 secondes d’attente maximale sous activité continue. Les liens symboliques ne sont pas suivis ; la surveillance reste limitée aux arborescences des projets enregistrés.
