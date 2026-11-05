# Réconcilier une validation approuvée puis annulée nativement

Code de lot : code non attribué ; attribution ACL ultérieure.

## Why

Après une approbation locale sans consommation native, une annulation exacte
CANCELLED/OC laisse PREPARED et empêche le mandat suivant. Le bootstrap du
moniteur exige encore une ancienne version fixe malgré le paquet courant.
Le développeur autorise ce correctif sous SCM, incrément, publication, CABU
puis remontée aux sessions concernées.

## What Changes

- Réconcilier PREPARED sans native ni accès sur preuve d’annulation qualifiée,
  y compris après approbation, sans effacer sa décision historique.
- Retirer la réponse exécutable et déclencher la vérification sur fin native.
- Résoudre la version attendue du moniteur depuis le manifeste installé.
- Distribuer CAB/CABU et les quatre briques en 2.2.1.

## Capabilities

### Modified Capabilities
- `opencode-v2-transport`: annulation approuvée non consommée.
- `codex-integration-distribution`: version normative du bootstrap.

## Impact

Contrôleur, contexte privé, registre, documentation et versions distribuées.
Aucune écriture manuelle du RUN Pixs, aucun once rejoué, aucun nouveau droit métier.
