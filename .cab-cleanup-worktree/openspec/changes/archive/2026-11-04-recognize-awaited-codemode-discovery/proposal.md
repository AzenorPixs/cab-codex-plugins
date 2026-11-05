# Reconnaître await search avant validation — CAB2.2.17

Code non attribué ; correctif SCM de corrélation native.

## Why
Le préambule readonly const schema = await search(...) conserve un wrapper
execute opaque dans16, malgré un input littéral et un retour MCP exact.
Le contrôleur ne voit son input qu’après le timeout du call bloquant, puis
un poll. La même forme sans await est déjà projetée pendant running.

## What Changes
Accepter uniquement await optionnel dans le binding const de search déjà
qualifié, avant le retour direct d’un appel MCP littéral autorisé. Conserver
les comparaisons exactes de metadata/input, troncature, identités et suffixe.
Tests négatifs et preuve native d’admission avant timeout, sans mutation Pixs.
Les coordinations REJECTED/PREPARED restent un problème distinct non corrigé
par cette évolution. Publication puis CABU après qualification.
