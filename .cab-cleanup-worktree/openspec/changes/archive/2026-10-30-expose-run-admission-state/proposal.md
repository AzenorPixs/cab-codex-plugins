# Exposer l’état d’admission du RUN

## Why

Une décision peut recevoir409 run-transition-in-flight alors que demande native, propriétaire et compteurindécis sont visibles. La garde est correcte, mais le pilote ne distingue pas facilement une admission stabilisée d’une transition encore occupée. Le développeur valide ce dernier point sous SCM avec incrément, puis CABU et information.

## What Changes

CAB2.1.24 expose un instantané BUSY/STABLE dans le statut du RUN et une lecture ciblée GET /runs/<run>/decision/<request>/admission : propriété connue, validation enregistrée et décision locale enregistrée sont distinctes. Le409 précoce et le400 tardif existants conservent leur statut/garde, avec étatBUSY et indication locale de décision quand elle est connue. Aucun retry automatique, attente serveur, décision ou réservation nouvelle.

## Impact

Contrôleur, contexte de job, tests de concurrence/races/isolation ; documentation/protocole/version commune, OpenSpec/Map/BATCH/statistiques, publications et CABU. Aucun changement des sources métier, modèles, RUN ou permissions. L’injection exacte des longs shell est hors périmètre. Code non attribué, attribution ACL ultérieure.
