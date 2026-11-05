# Conception

`ResourceRunRegistry` fournit une projection snapshot-only des opérations
filtrées par `runId`. Le contrôleur l’expose sous
`GET /runs/<runId>/operations`, avec `operationId` facultatif et une limite
fixe de 200 entrées. Le RUN doit exister ; une opération étrangère n’est jamais
retournée.

Chaque entrée contient seulement les identifiants, l’état durable, la présence
et le résultat natifs utiles à la corrélation, `onceAcknowledged`, et un état
d’accès sans bearer token. `onceAcknowledged` reflète l’accusé durable CAB ;
faux ne prouve pas à lui seul l’absence d’un effet natif. La route ne lit pas
l’historique OpenCode et n’exécute aucune mutation.
