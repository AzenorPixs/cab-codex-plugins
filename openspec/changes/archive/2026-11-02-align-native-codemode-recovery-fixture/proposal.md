## Why

Le test natif CodeMode crée une seconde candidate de reprise sans découvrir sa
signature avant `prepare`. Le contrôleur la refuse conformément au protocole,
ce qui empêche le test d'atteindre sa validation de bout en bout.

## What Changes

Le fixture effectue une recherche native read-only de `request_validation`
dans la nouvelle candidate avant `prepare`, selon le même contrat que les
autres scénarios de récupération.

## Non-goals

Aucun comportement du contrôleur, du broker, des décisions ou des permissions
ne change. Aucun appel métier ou permission n'est ajouté à la préparation.
