# Conception

Le contrôleur surveille `session.idle`, `session.execution.succeeded`,
`session.execution.failed` et `session.execution.interrupted`. Pour la session
identifiée par l’événement, il vérifie la présence d’opérations du même RUN en
`ISSUING`, `EXECUTING` ou `UNKNOWN`. En leur absence, aucun appel de lecture
supplémentaire n’est effectué.

Lorsqu’une opération reste en cours, le contrôleur relit les messages natifs
de la session et passe les parties d’outil par le validateur existant
`nativePartProof`. Seule une partie corrélée termine l’opération. Une réponse
indisponible ou un transcript sans preuve ne modifie ni l’opération ni ses
protections ; un événement terminal ne vaut jamais preuve à lui seul.

Le champ `nativeResult` et les gardes existantes distinguent une fin technique
d’un succès de prévol : `exit=1` peut clôturer l’opération native, mais ne
satisfait pas un prévol qui exige `exit=0`. La permission consommée n’est
jamais rejouée.
