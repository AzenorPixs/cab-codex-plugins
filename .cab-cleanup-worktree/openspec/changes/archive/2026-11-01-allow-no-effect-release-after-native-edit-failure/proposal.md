## Why

Le ledger classe toute fin native, y compris un outil `edit` terminé en erreur,
comme `COMPLETED`. `locks/release` interprète alors toute écriture préparée
comme un effet et refuse `NO_EFFECT`, même lorsque le transcript prouve l'erreur,
que la ressource n'a pas changé et que sa révision est restée identique.

## What Changes

Conserver une issue native vérifiée pour chaque opération et distinguer la fin
technique d'un outil de la réussite de son effet. Une libération `NO_EFFECT`
pourra s'appuyer sur une erreur native exacte et une révision inchangée ; une
écriture réussie, une preuve absente/divergente ou une révision modifiée
continueront de refuser la restitution. Les anciennes opérations terminales
sans issue persistée seront relues dans le transcript natif avant toute décision.

Le correctif ne rejoue ni once ni opération métier, ne libère aucun accès
automatiquement et ne change pas les règles de `COMPLETED` ou `RECONCILED`.
