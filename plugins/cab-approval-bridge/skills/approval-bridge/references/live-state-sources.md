# Sources d’état courantes — CAB 2.2.39

## Tableau des autorités

| Question | Source à utiliser | Ne suffit pas |
|---|---|---|
| SID actuellement occupé ? | client.sessionStatus(workspace), GET /api/session/active | time.busy supérieur à time.idle |
| Permission native présente ? | client.permissions avec sessionIds, ou observation brute filtrée si le normaliseur refuse | activeValidationCount0 |
| Appel achevé ou effet observé ? | part native exacte, son état/executed/temps, résultat et reçu corrélés | SID absent du registre actif seul |
| Validation admise ou décision locale ? | /runs/<run>/decision/<request>/admission, opération et décision exactes | broker READY ou corrélation MATCHED |
| Demande broker terminale ? | résultat MCP exact get/poll/lookup, reçu et identités | décision locale APPROVED seule |
| Policy autorise cette action ? | authority de l’action exacte et couverture de ses ressources | policySetupRequired=false |
| État actuel du RUN ? | /runs/<run>/status et /locks, sources natives corrélées | cache monitor stale |

## Timestamps et terminal natif

Les time.busy/time.idle du dossier de session sont historiques. Après un rejet,
le tour peut être terminal error/aborted et le SID absent de /api/session/active,
tout en conservant un busy plus récent que le dernier idle enregistré. Ne pas
créer une condition supplémentaire imposant l’ordre de ces deux dates. La
quiescence qualifiée requiert les surfaces courantes prévues par la route :
activité du SID, permissions, part terminale et preuves natives/receipts.
Une autre session active n’est pas automatiquement un obstacle au retrait du
RUN ; les gels globaux/infrastructures et ressources recouvrantes restent exigés.

## Monitoring et authentification

Le contrôle [monitor-service](monitor-service.md) vérifie service/version,
workspace, page et Restart=on-failure. Un cache source-too-large ou stale ne
prouve pas un blocage de coordination actuel. Utiliser les endpoints directs
et dater chaque constat ; ne pas masquer l’incident de télémétrie ni augmenter
ses plafonds. Une version conforme ne garantit pas la fraîcheur de ses données.

Un401 d’un GET OpenCode brut indique un accès non authentifié, pas à lui seul
une panne du credential ou du broker. Utiliser le client CAB installé qui charge
le credential localement ; ne pas lire/afficher le secret, changer le port,
réinitialiser les accès ou redémarrer OpenCode pour cet unique constat.
Comparer résultat MCP structuré, champs natifs et texte assistant : seul un
texte annonçant READY avec une ancienne date ne remplace pas le résultat natif.
La readiness du RUN et infrastructure_status se distinguent d’un autre RUN
protégé. Ne jamais ignorer un blocage d’intégrité ou gel global applicable.

## completed/exit0 avec executed=false ou diagnostic UNVERIFIED

Le booléen executed d’une projection V2 n’est pas une définition universelle
d’exécution d’un processus. Un shell peut être completed avec exit0 observé
et une onceAcknowledged durable tout en exposant executed=false. Ne pas en
déduire NO_EFFECT ni relancer la commande. Inversement, le booléen seul ne
prouve aucun succès : corréler SID/call/commande/PID,fin native et résultat
durable de l’opération selon les gardes de la route.

nativeExecutionOutcome=UNVERIFIED est un diagnostic conservateur ; il ne
réécrit pas un nativeResult.status=completed/exit0 déjà enregistré avec sa
preuve corrélée. Pour la clôture normale, utiliser la route ordinaire et son
évaluation de preuves. Si la corrélation manque ou si un effet reste inconnu,
conserver la protection ; ne jamais transformer le diagnostic par déclaration.

replyReceipts désigne les reçus privés de réponses programmatiques, notamment
reject. Une liste vide n’annule pas la preuve once du contrôleur et ne doit
pas exiger un rejet fictif après une exécution réussie. Les scénarios de retrait
avant once exigent leur vrai ACK204 ; les scénarios après effet exigent leurs
vraies fins/résultats. Une sortie vide de py_compile avec exit0 n’est pas une
sortie manquante ; le cleanup et l’état attendu se vérifient séparément.
