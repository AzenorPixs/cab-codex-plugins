# Convergence NOT_ADMITTED après transition broker — CAB 2.2.20

## Why
PA01 garde une préparation sans décision alors que le broker a classé la même demande NOT_ADMITTED après un409 coordination-upgrade-required pendant CABU. La route scoped est correcte ; l’absence temporaire de readiness est confondue avec une incompatibilité définitive. Les reprises PENDING ou APPROVED ne couvrent pas cet ancien terminal.

## What Changes
Renvoyer503 broker-coordination-not-ready lorsque seule la readiness manque et préserver PENDING côté broker. Conserver409 pour un vrai contrat de requête incompatible. Étendre le retrait propriétaire existant à une préparation sans décision, sans accès/native/result/once, uniquement sur preuve native fraîche et exacte NOT_ADMITTED, double frontière stable et absence d’effet. Conserver le terminal natif et l’historique sans inventer de décision. Nouveau mandat seulement avec identifiants neufs.

## Scope
Contrôleur, broker source/distribué, preuve et offre recovery, tests, docs et versions. Aucune mutation du RUN Pixs par le correcteur, aucun rejeu, changement de SID ou protection. Code non attribué, ACL ultérieure. Aucun nouveau endpoint ni dépendance.
