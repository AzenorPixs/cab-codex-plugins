# Tasks

## 1. Plugin et skill CABU

- [x] 1.1 Ajouter le plugin CABU à la marketplace avec un manifeste valide et un skill `cabu` directement invocable ; vérifier la structure, les noms et la résolution des métadonnées par les tests ciblés.
- [x] 1.2 Faire du skill un point d’entrée vers la procédure canonique `/CAB update`, avec refus explicite si elle n’est pas disponible ; vérifier l’absence de logique d’update dupliquée et les scénarios de dépendance dans les tests de distribution.
- [x] 1.3 Maintenir `/CABU` comme commande autonome sans argument, alignée avec les deux plugins ; vérifier sa délégation, son refus d’arguments et sa version par les tests de commande.
- [x] 1.4 Mettre à jour `PROJECT.md`, `TECHNICAL.md`, `BUILD.md`, `README.md` et `CHANGELOG.md` pour décrire le plugin, le skill, la commande et leurs limites ; vérifier la cohérence de la matrice documentaire.

## 2. Incrément commun 1.10.11

- [x] 2.1 Incrémenter les métadonnées et artefacts de release courants à `1.10.11`, ajouter le plugin CABU à la vérification de cohérence et préserver les mentions des versions antérieures ; vérifier les tests de version, le cachebuster et l’absence de référence courante résiduelle à `1.10.10`.

## 3. Validation intégrée

- [x] 3.1 Valider le change et les spécifications OpenSpec, puis exécuter les suites ciblées et les contrôles complets configurés ; vérifier que les scénarios ajoutés sont couverts et rapporter tout contrôle indisponible ou échoué.

## Workflow follow-up

- Archiver ce change lorsque toutes ses tâches sont validées, puis vérifier l’archive et produire le rapport de statistiques exigé par `AGENTS.md`.
- Appliquer ensuite les étapes Git de SCM uniquement dans leur périmètre et après vérification des variables prévues par le protocole.
