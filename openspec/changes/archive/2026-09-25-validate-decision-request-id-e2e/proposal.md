## Why

L'archive historique `fix-decision-request-id-correlation` contient une
validation E2E non exécutée, car le broker était alors bloqué par une demande
PENDING antérieure. Le contrôleur requis pour cette preuve n'est pas encore
distribué sous forme d'unité utilisateur : `/cab start` ne peut donc pas
lancer le composant qu'il annonce.

## What Changes

- Distribuer un modèle d'unité systemd utilisateur avec le plugin.
- Faire installer l'unité et le contrôleur de manière différée par `/cab start`,
  sans l'activer au démarrage de session ni au moment de l'installation du
  plugin.
- Démarrer explicitement le service par `/cab start` et l'arrêter par
  `/cab stop`, tout en conservant son redémarrage uniquement en cas d'échec
  pendant son exécution.
- Exécuter ensuite le parcours CAB E2E avec des identifiants `requestId` et
  `approval_id` distincts, et vérifier l'absence de demande parasite finale.

## Capabilities

### Modified Capabilities

- `codex-integration-distribution` : distribution et cycle de vie explicite du
  contrôleur utilisateur.

## Impact

La commande `/cab`, le plugin, l'unité utilisateur distribuée, la
documentation, les tests et les spécifications d'intégration sont concernés.
L'archive historique reste inchangée.
