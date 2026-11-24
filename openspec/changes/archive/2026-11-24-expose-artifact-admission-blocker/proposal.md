## Why

Un refus dans la Fabrique affiche le reçu de la demande refusée mais omet l’identité du reçu qui bloque effectivement l’opération. Un refus certain de lancement du worker peut aussi laisser une protection alors qu’aucun travail n’a été lancé.

## What Changes

- Identifier la construction, la publication ou la livraison bloquante dans le diagnostic.
- Terminer les refus certains de lancement sans libérer les opérations à résultat indéterminé.
- Proposer dans l’Overview des trois forges une vérification du reçu Docker admissible, sans nouvel envoi.
- Réconcilier automatiquement les reçus de confirmation portant l’empreinte enregistrée avant envoi.
