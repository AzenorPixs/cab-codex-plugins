# Délai borné de réponse à une notification — CAB 2.2.36

## Why
PA01 observe une corrélation native MATCHED après2,564s alors que le broker
limite la réponse HTTP de notification à2s. La tentative reste FAILED sans
admission. Un précédent503 broker-coordination-not-ready est distinct et
survenu avant le retour du protocole de coordination. Le délai trop court
empêche de recevoir une réponse éventuellement valide ou un refus précis.

## What Changes
Dédier10s à la réponse HTTP de notification, sous la lease15s existante.
Conserver2s pour les lectures de décision, gardes, IDs, budgets et retries.
Tester réponse202 retardée, refus précis retardé et expiration sans décision.
Documenter que la corrélation MATCHED ne prouve ni admission ni livraison.

## Scope
Broker source/copie, tests, contrat distribué, cadrages et version. SCM puis
commit/publication/CABU. Pas de mutation des états PA01 par le correcteur.
Code non attribué ; normalisation ACL ultérieure. Repli par livraison de la
version antérieure sous nouvelle transaction, jamais par rejeu métier.
