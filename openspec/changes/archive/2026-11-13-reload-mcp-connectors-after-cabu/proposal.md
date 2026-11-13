# Recharger les connecteurs MCP après CABU

Code non attribué ; attribution ultérieure par ACL.

## Why
Les processus MCP déjà chargés gardent leur code et catalogue après installation.
Le service actif peut être à jour alors que Codex/OpenCode utilise un ancien client.

## What Changes
Relais stdio stable par client, moteur MCP remplaçable à frontière sûre et
notification de catalogue. Registre authentifié des processus/générations,
version chargée et catalogue effectivement relu. CABU vérifie ce parcours sur
les connecteurs actifs sans interrompre les sessions ni rejouer de requête.
Les anciens connecteurs sans relais sont signalés RELOAD_REQUIRED tant qu'une
reprise native prouvée n'a pas eu lieu ; aucun arrêt aveugle de ces processus.

## Impact
CLI/MCP, registre Django, reçu CABU, migration additive, intégrations et tests.
CI/CD3.2.3 et CABU. Aucun changement manuel des configurations tierces ni arrêt
Codex/OpenCode. PostgreSQL, SID/RUN et reçus d'exécution préservés.
