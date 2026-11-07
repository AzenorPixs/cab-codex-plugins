## Why
La projection récursive peut retirer le contenu d'un reçu de permission natif et laisser seule son empreinte, ce qui rend le journal illisible.

## What Changes
- Retirer entièrement un reçu valide uniquement si son identité et son répertoire correspondent à la portée terminale.
- Conserver les reçus étrangers et les enveloppes incomplètes de propriété inconnue ; refuser une référence cible non vérifiable.
- Ne pas modifier les anciens reçus incomplets ni rejouer de permission.

## Capabilities
### Modified Capabilities
- `change-state-erasure`: intégrité des reçus de permission lors de l'effacement ciblé.

## Impact
Projection du nettoyage, tests isolés et documentation. Aucun changement des RUN actifs ou des permissions natives.
