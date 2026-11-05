# Conception

La récupération s’applique uniquement à une opération `UNKNOWN` portant la
décision locale `approved`, sans état natif, permissionId, callID, résultat ou
accusé `once`. L’accès doit protéger cette unique opération et les révisions
doivent rester à la valeur attendue.

Le client relit intégralement deux fois le transcript V2 et le journal
expérimental avec `log.synced`; les deux instantanés doivent être identiques.
Le transcript doit contenir une unique demande native `request_validation`
exacte dans un wrapper Code Mode achevé, non tronqué et `executed=false`, puis
un message assistant terminal `finish=stop` dans le même tour utilisateur.
Tous les appels du tour sont contrôlés ; aucun effet natif, permission active
ou événement tool n’est admis. La session doit être idle et la validation
quiescente.

Après preuve, CAB invalide l’accord local pour empêcher tout rejeu, terminalise
l’opération avec un reçu `NO_EFFECT` et libère l’accès sans avancer les
révisions. Le broker, le transcript et les RUN ne sont pas modifiés. Toute
ambiguïté conserve `UNKNOWN`.

