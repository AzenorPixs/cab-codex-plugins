## Why

CAB implémente déjà un pont de validation riche, mais son contrat OpenSpec est vide et ses artefacts de distribution ne décrivent pas fidèlement les sources. Le contrôleur HTTP est en outre incomplet syntaxiquement, ce qui empêche le cycle de décision annoncé de fonctionner.

## What Changes

- Réparer le contrôleur local afin de terminer son contrat HTTP de décision et son démarrage.
- Normaliser l’emplacement du plugin sous `codex/plugin/` et sa structure Codex.
- Établir les spécifications de référence des capacités déjà implémentées par CAB.
- Ajouter la décomposition OpenSpec au cadrage du projet et synchroniser les documents de distribution, de technique et de présentation.
- Définir une version de projet commune pour le broker, le plugin et le marketplace local.

## Capabilities

### New Capabilities

- `approval-workflow`: cycle de demande, de corrélation et de décision explicite.
- `approval-persistence`: magasin durable, journal intègre et reprise non ambiguë.
- `controller-transport`: contrôleur CGPT local et contrat HTTP de décision.
- `supervision-remediation`: readiness, supervision SSE et remédiations contrôlées.
- `codex-integration-distribution`: plugin Codex, commande `/cab` et artefacts de distribution.

### Modified Capabilities

_Aucune : le projet ne possède pas encore de spécification de référence._

## Impact

Les modules Python du broker, le contrôleur Node.js, l’arborescence du plugin, le manifeste marketplace et les documents de cadrage sont concernés. Aucune dépendance tierce ni interface réseau publique n’est ajoutée.
