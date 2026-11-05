# Restaurer deux frontières de validation prouvées — CAB 2.2.5

## Why

PA01 conserve une approval PENDING et une opération PREPARED sans validation
dans le contexte. CISMP5 observe un terminal de lecture sans reçu once local.
Les routes 2.2.4 refusent correctement leur décision ou leur clôture ; aucune
réconciliation propriétaire adaptée n’est distribuée.

## What Changes

- Action propriétaire restore-pending-validation : restaurer la communication
  de la même demande après lecture native fraîche de son PENDING, sans décision.
- Action propriétaire reconcile-reviewed-terminal : clôturer uniquement la
  coordination d’un terminal shell de lecture revu, sans fabriquer once,
  nativeResult, NO_EFFECT ou résultat d’autorisation historique.
- Reçus durables, diagnostic et répétition idempotente après réponse perdue.

## Impact

Contrôleur, contexte, registre et policy de recovery ; schéma 4 conservé,
preuves additionnelles dans les reçus privés compatibles. Aucun changement
manuel des RUN Pixs. Mandat SCM, incrément, publication, CABU et notification
des propriétaires explicitement demandés par le développeur.
