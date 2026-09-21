## Why

Le test de démarrage CAB établit aujourd'hui la disponibilité du transport et
la corrélation des validations, mais ne prouve pas que l'agent OpenCode qui
recevra le premier prompt utilise réellement le fournisseur, le modèle et le
niveau de raisonnement choisis par le développeur.

## What Changes

- Ajouter un prévol OpenCode obligatoire à `/cab start`, avant toute création
  ou réutilisation de session pilotée.
- Vérifier le fournisseur, le modèle et le niveau de raisonnement configurés,
  leur disponibilité, puis une réponse observée dans une session temporaire
  sans outil ni accès au projet.
- Refuser le démarrage et publier `CAB_INACTIF` lorsqu'une preuve est absente
  ou divergente.
- Porter les artefacts CAB courants à la version `0.84.3`.

## Capabilities

### Modified Capabilities

- `codex-integration-distribution` : prévol du modèle OpenCode avant le
  premier prompt d'une session pilotée.

## Impact

La commande `/cab`, la skill distribuée, la documentation, les tests de
distribution et la version du broker, du contrôleur et du plugin sont
concernés. Le prévol ne modifie ni le choix du développeur ni le projet suivi.
