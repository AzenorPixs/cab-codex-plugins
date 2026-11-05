# OBS05 — Préparer le moniteur avant les prévols

## Why

Le monitoring est appelé après le prévol et peut être omis lors de la réutilisation des services. Une panne PLLM ou MCP laisse alors le site indisponible alors que son serveur accepte déjà des sources absentes.

## What Changes

- Déclencher la procédure indépendante dès la résolution du workspace pour /cab start et toute entrée ou reprise de session pilotée, avant PLLM, santé OpenCode et prévols modèle/MCP.
- Vérifier ou démarrer le moniteur même si contrôleur et superviseur sont déjà actifs ; conserver configuration et instance conforme.
- Rapporter les preuves et échecs séparément sans agir sur les RUN ou autres services.
- Aligner le jeu source complet et ses contrats courants sur 1.6.3.

## Capabilities

### Modified Capabilities
- `codex-integration-distribution`: ordre obligatoire et couverture des reprises, version cohérente.
- `concurrent-run-coordination`: référence de protocole 1.6.3, comportements conservés.
- `native-session-statistics`: référence de bilan 1.6.3, mesures conservées.

## Impact

Commande, skill et référence monitor-service, protocole, documentation, métadonnées et versions des modules. Tests de contrat et de lancement isolé. Aucun déploiement réel, nouveau format persistant, dépendance ou migration.
