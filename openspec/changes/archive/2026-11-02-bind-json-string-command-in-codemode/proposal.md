# Lier les commandes Code Mode avec des clés JSON

## Why

Le wrapper Code Mode peut sérialiser l’objet de `request_validation` avec une
clé de commande JSON entre guillemets. Le binder reconnaissait seulement la
syntaxe de propriété JavaScript non quotée `commands`, puis laissait un
identifiant de commande non résolu dans l’objet JSON. L’appel restait alors un
wrapper `execute` non normalisé malgré une liaison littérale exacte.

## What Changes

- Le binder reconnaît les formes non quotée `commands` et JSON quotée
  `"commands"` pour une unique liste contenant l’identifiant déclaré.
- Les propriétés dupliquées, valeurs statiques ou dynamiques, wrappers
  divergents et appels supplémentaires restent refusés.
- Les décisions, opérations, permissions et `once` restent sans changement.

