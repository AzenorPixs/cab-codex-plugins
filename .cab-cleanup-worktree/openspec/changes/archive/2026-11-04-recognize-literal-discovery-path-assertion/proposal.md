# Assertion readonly du chemin découvert — CAB2.2.18

Code non attribué ; correctif SCM ciblé.

## Why
Le wrapper PA01 ajoute après search un if vérifiant items[0].path puis throw
Error littéral avant request_validation. Le correctif17 reconnaît await mais
laisse cette assertion opaque. La vérification du wrapper réel l’a révélé
avant toute prétention de couverture complète de cette forme.

## What Changes
Qualifier uniquement cette assertion de chemin fixe, sur la variable de
search exacte, reliée au même nom MCP littéral. Aucun JavaScript arbitraire,
expression dynamique, code additionnel ou garde de permission élargi.
Régression avant patch, tests négatifs et preuve native isolée ; vérification
du wrapper réel par GET sans le rejouer. Version, publication puis CABU.
