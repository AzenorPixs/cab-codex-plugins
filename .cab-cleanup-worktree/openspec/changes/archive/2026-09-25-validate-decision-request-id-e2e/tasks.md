## 1. Cycle de vie du contrôleur

- [x] 1.1 Ajouter au plugin le modèle d'unité systemd utilisateur et ses ressources de contrôleur.
- [x] 1.2 Faire installer de façon différée les ressources par `/cab start`, sans `enable`, puis démarrer explicitement le service.
- [x] 1.3 Faire arrêter explicitement le service par `/cab stop`, sans arrêter OpenCode ni le broker MCP.
- [x] 1.4 Documenter le cycle de vie et couvrir l'installation inactive, le démarrage, l'arrêt et le redémarrage sur échec par des tests.

## 2. Validation E2E corrélée

- [x] 2.1 Vérifier que `cgpt-validation` est connecté et que `broker_readiness` est READY, sans approbation parasite.
- [x] 2.2 Exécuter `/cab test` avec des identifiants `requestId` et `approval_id` distincts et vérifier l'absence de demande parasite finale.
- [x] 2.3 Archiver le change après preuve E2E, validation stricte OpenSpec et cohérence documentaire.
