# Rétablir une activation CABU vérifiable

## Why

L’activation2.1.14 a rencontré update-broker-reload-unconfirmed, puis la reprise du rollback a été enregistrée à tort PREPARATION_FAILED après ROLLBACK_FAILED. Le démarrage du contrôleur utilise une borne fixe10s distincte du budget waitMs configuré. Le développeur autorise explicitement de retrouver un état de développement normal et d’appliquer un nouveau correctif si nécessaire.

## What Changes

Correctif ciblé2.1.15 : attente du contrôleur bornée par waitMs existant, diagnostic de démarrage distinct de celui du broker, échec de rollback durablement non terminal. Les phases post-coupure ne sont jamais reclassées comme préparation échouée. Tests isolés de démarrage retardé, timeout, reprise de rollback répétée sans perdre son journal, succès ultérieur et invariants métier. Version commune, documentation, archive/statistiques et publications SCM, puis CABU et information coordonnée des sessions autorisés par l’objectif humain.

## Impact

Updater, tests et documentation de maintenance ; aucun nouveau réglage, langage, secret ou dépendance. Les contrôles de versions, de PID, de manifeste et de readiness ne sont pas relâchés. Aucune réécriture manuelle de journal de maintenance ou de RUN, aucun rejeu once ni arrêt OpenCode. Le journal2.1.14 est conservé comme preuve ; son état actuel et les artefacts restaurés sont observés avant toute reprise.
