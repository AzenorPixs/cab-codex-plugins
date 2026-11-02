# Neutraliser la sentinelle de cause du moniteur

## Why

Le contrôleur peut publier `root_cause: NONE` lorsqu'aucun blocage n'existe.
Le moniteur conservait cette sentinelle comme une cause non vide, ce qui
classait le RUN `BLOCKED` malgré un état `RESERVED`, une readiness `READY` et
aucun pending ni blocker.

## What Changes

- Normaliser `NONE` en absence de cause dans la projection du RUN.
- Ne jamais traiter la sentinelle `NONE` comme un blocage, tout en conservant
  les causes réelles comme `resource-effects-unknown`.

## Non-Goals

- Modifier le RUN, ses leases, permissions, manifests ou preuves.
- Modifier les règles de décision, readiness ou l'état du contrôleur.

## Verification

Reproduire le snapshot `RESERVED/READY/NONE` dans un test moniteur et vérifier
qu'il n'est pas affiché `BLOCKED`. Vérifier qu'une cause réelle continue de
bloquer le RUN et exécuter les tests moniteur et OpenSpec stricts.
