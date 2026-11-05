# Tâches

## 1. Corrélation native en cours

- [x] 1.1 Accepter uniquement un wrapper Code Mode natif en cours avec un appel `request_validation` exact et vérifier les refus d’identité, troncature, exécution ou appel supplémentaire.
- [x] 1.2 Ajouter un test d’intégration où un accès restauré du même RUN reste `HELD`, tandis qu’une validation disjointe est admise sans créer de permission ou `once`.
- [x] 1.3 Vérifier qu’une validation recouvrante ne gagne aucun accès et que l’acquisition demeure atomique après sa décision.

## 2. Version et qualification

- [x] 2.1 Mettre à jour les spécifications, commandes, plugins et cadrages à 2.1.65 avec un cachebuster commun neuf.
- [x] 2.2 Exécuter les tests Node et Python complets, la compilation Python et OpenSpec strict avant/après archivage.
- [x] 2.3 Produire `STATISTICS.md` avec six sections, compteurs vérifiés, UTF-8/LF et N/A motivés.

## Workflow après archivage

- Archiver le change, valider les spécifications synchronisées, puis mettre à jour les cartes sans attribuer de code ACL.
- Committer et publier selon SCM, puis lancer CABU 2.1.65 et vérifier les quatre versions réellement actives, la readiness fraîche et les RUN conservés.
- Informer les sessions concernées après l’activation vérifiée, sans rejouer de demande terminale.
