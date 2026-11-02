# Réconcilier une validation annulée par OpenCode

## Problème

Après annulation native d’une demande CAB par OpenCode, le broker publie
`CANCELLED/cancelled_by=OC`, mais le contrôleur conserve la validation comme
indécise et l’opération comme `PREPARED`. Une nouvelle demande reste alors
bloquée alors qu’aucune décision, permission, acquisition ni exécution n’a eu
lieu.

## Objectif

Clore l’opération préparée à partir d’une annulation native exacte et terminale,
sans créer de décision, sans répondre à une permission et sans consommer `once`.

## Hors périmètre

- Réconcilier un refus, une approbation ou un effet natif.
- Libérer un accès existant ou une opération dont l’exécution a commencé.
- Modifier, remplacer ou relancer une demande native.

## Vérification

Les tests couvrent le transcript exact relu deux fois, l’identité et l’état
terminal `CANCELLED` par OpenCode, la session inactive, l’absence de permission,
d’accès et d’opération native, ainsi que les divergences et effets qui gardent
l’opération protégée.
