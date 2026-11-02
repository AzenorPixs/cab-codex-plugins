# Tâches

## Spécification

- [x] 1.1 Définir le start background corrélé, le verrou persistant et la fin native.
- [x] 1.2 Spécifier explicitement que les timeouts sans shellID restent protégés.

## Implémentation et validation

- [ ] 2.1 Ajouter la lecture V2 filtrée de `Shell.Info` par shellID.
- [ ] 2.2 Persister le lifecycle background sans étendre le schéma des RUN.
- [ ] 2.3 Garder l’accès détenu jusqu’à une fin shell terminale exacte.
- [ ] 2.4 Tester start, sortie, timeout, divergence, restart et protection de l’ancien -03.
- [ ] 2.5 Exécuter les suites applicables et OpenSpec strict.

## Livraison

- [ ] 3.1 Vérifier le périmètre SCM, archiver le change et produire son rapport d’archive.
