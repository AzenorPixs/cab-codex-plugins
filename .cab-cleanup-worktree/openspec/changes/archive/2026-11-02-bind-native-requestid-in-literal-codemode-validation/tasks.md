## 1. Spécification et tests du wrapper natif

- [x] 1.1 Mettre à jour l’exigence OpenSpec du parseur Code Mode pour autoriser seulement le `requestId` variable lié aux métadonnées du call natif.
- [x] 1.2 Tester la normalisation du wrapper direct exact avec un `requestId` résolu depuis l’unique `toolCalls` natif.
- [x] 1.3 Tester les refus d’une variable dans un autre champ, d’un `requestId` divergent, d’un call supplémentaire, d’une troncature et d’un wrapper exécuté.

## 2. Admission du contrôleur

- [x] 2.1 Comparer les identités natives structurellement sans tenir compte de l’ordre des clés des objets.
- [x] 2.2 Tester l’admission exacte avec une ressource disjointe d’un accès restauré `HELD`, sans décision ni permission.
- [x] 2.3 Tester le refus d’une identité divergente et préserver l’accès restauré `HELD`.

## 3. Distribution et fin

- [x] 3.1 Aligner tous les artefacts CAB sur la version commune 2.1.66 et actualiser documentation, commande et plugin.
- [x] 3.2 Exécuter les contrôles ciblés et globaux, OpenSpec strict et les tests applicables.
- [x] 3.3 Vérifier la cohérence documentaire et produire son rapport statistique d’archive.
