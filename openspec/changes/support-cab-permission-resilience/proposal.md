## Why

Des contrôles de confidentialité imposent 0600 ou 0700 alors que les fichiers
utilisés par CAB sont normalisés en 0770. Le reporting et les essais externes
peuvent alors se bloquer malgré des droits POSIX utilisables.

## What Changes

- Accepter les fichiers et répertoires CAB en 0770, créer les nouveaux fichiers
  CAB en 0770 et conserver les autres modes compatibles avec le protocole.
- Préserver les contrôles d'identité, de type, de liens, d'intégrité, d'accès
  effectif et de confidentialité nécessaires à chaque frontière.
- Inventorier les composants concernés, tester leurs parcours, leur migration et
  les refus nécessaires, puis livrer par SCM, CI/CD et CABU.

## Non-goals

- Modifier les permissions des fichiers existants par une opération récursive.
- Contourner une restriction imposée par SSH ou un service tiers.
