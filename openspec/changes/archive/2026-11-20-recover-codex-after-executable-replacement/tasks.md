# Tâches
- [x] Implémenter la reconnaissance de l’exécutable remplacé.
- [x] Préserver l’historique du reçu et distinguer les observations périmées.
- [x] Vérifier la relance et les catalogues MCP sur l’hôte.

## Vérification sur l’hôte

Le reçu `CABU-3.2.27-MCP-RELAIS-HOTE` ne pouvait pas identifier le
frontend de l’instance encore chargée depuis l’ancien exécutable supprimé.
Pour le même moteur natif, `CABU-3.2.28-MCP-RELAIS-HOTE` a identifié
le frontend, confirmé son arrêt et celui de son moteur après SIGTERM, puis
observé le nouveau frontend sous le même UID. Le journal indépendant a
confirmé que le nouveau processus était vivant après relance.

Le contrôle hôte 761 et la livraison 3.2.28 sont confirmés. Les 15 tests
ciblés ont été revérifiés le 20 novembre 2026. Le reçu 3.2.28 conserve
`WAITING_MCP` et `RELOAD_REQUIRED` pour les quatre catalogues Codex
historiques. La publication du heartbeat a été traitée séparément en 3.2.29.
