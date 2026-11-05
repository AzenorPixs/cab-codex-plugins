# Corréler le requestId variable dans un wrapper Code Mode borné

## Why

OpenCode 2.2.5 émet un wrapper `execute` direct et non exécuté qui appelle une seule fois `request_validation`. Le corps conserve un objet littéral, mais sa propriété `requestId` reçoit un identifiant par variable. Le normaliseur CAB ne peut pas convertir cette forme avec son parseur de données JSON et laisse la partie sous le nom `execute`. La notification n’est alors pas corrélée, même si les métadonnées natives V2 contiennent l’appel unique terminé et son input résolu.

La comparaison d’identité native sérialise aussi les objets imbriqués avec leur ordre d’insertion. Deux cartes `expected_revisions` équivalentes peuvent donc diverger si le runtime réordonne leurs clés.

## What Changes

CAB normalise ce seul champ variable depuis l’input de l’unique appel natif `request_validation`, puis vérifie que l’objet reconstruit correspond exactement à l’input natif complet. La comparaison de l’identité ignore l’ordre des clés d’objets et conserve l’ordre des tableaux.

Les autres expressions variables, appels supplémentaires, identités divergentes, wrappers exécutés, métadonnées incomplètes ou tronquées restent refusés avant admission. La normalisation ne crée ni décision, permission, accès ni `once`.

## Périmètre

- Modifier le parseur borné `request_validation` Code Mode et sa projection native V2.
- Comparer structurellement l’identité native dans le garde d’admission.
- Ajouter des tests positifs et négatifs du normaliseur et du contrôleur, avec un accès restauré `HELD` disjoint.
- Mettre à jour la spécification `controller-transport`, les versions communes et la documentation CAB concernée.
- Valider, archiver ce change, produire son rapport statistique et publier la version source.

## Préservé

Le protocole ne réévalue pas le code, ne résout pas d’autres variables, ne relit pas les valeurs d’environnement et ne rejoue pas les `requestId` terminaux. La décision explicite, les permissions natives, les accès et `once` restent des étapes distinctes.
