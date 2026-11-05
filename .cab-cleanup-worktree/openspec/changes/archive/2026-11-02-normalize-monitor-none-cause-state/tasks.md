## Spécification

- [x] 1.1 Ajouter l'exigence qu'une cause sentinelle NONE ne bloque pas un RUN sain.

## Implémentation et validation

- [x] 2.1 Normaliser NONE en absence de cause dans la projection du moniteur.
- [x] 2.2 Qualifier le cas RESERVED/READY/NONE et conserver le blocage des causes réelles.
- [x] 2.3 Aligner les versions communes et la documentation.
- [x] 2.4 Exécuter les tests moniteur, suites applicables et OpenSpec strict ; la suite ciblée (215/215), Python (87/87) et OpenSpec strict (19/19) passent. Deux exécutions globales Node ont rencontré des expirations intermittentes au démarrage de tests existants.

## Livraison

- [x] 3.1 Vérifier le périmètre SCM, archiver le change et produire son rapport d'archive.
