## Why
Un redémarrage imprévu d'OpenCode change son PID et peut laisser les services CAB ou les protections restaurées en attente, même si les sessions persistent.

## What Changes
- Reconnaître la nouvelle instance après contrôle de l'identité et de la disparition de l'ancienne.
- Restaurer la communication, vérifier les sessions et réconcilier les protections sur preuves, sans rejouer d'effet.
- Préserver les opérations incertaines et permettre aux RUN indépendants de continuer lorsque leurs preuves sont suffisantes.
- Autoriser explicitement les échanges ciblés entre déclarants CCAB et correcteur désigné, même lorsque leurs chats relèvent de projets différents.
- Qualifier séparément un rejet attesté avant redémarrage et les essais d'atelier confinés intervenus après ce rejet.
- Détecter au prévol les règles de session qui masquent les appels MCP CAB nécessaires.

## Capabilities
### Modified Capabilities
- `opencode-v2-transport`: continuité après redémarrage imprévu.
- `corrective-incident-queue`: coordination ciblée avec le correcteur désigné entre projets.
- `orchestrator-recovery-policy`: preuve d'un rejet historique et effets d'atelier indépendants.
- `coding-session-autonomy`: diagnostic précoce des règles de session MCP.

## Impact
Transport, supervision, récupération propriétaire, tests ciblés et documentation distribuée.
