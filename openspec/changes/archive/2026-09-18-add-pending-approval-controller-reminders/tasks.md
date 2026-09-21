# Tâches

## 1. Contrat OpenSpec

- [x] 1.1 Valider les deltas OpenSpec des relances corrélées, du contrôleur et de la supervision avec `openspec validate --strict`.

## 2. Broker

- [x] 2.1 Déclencher et journaliser toutes les trente secondes une relance corrélée pour chaque validation PENDING sans décision, puis couvrir le maintien de l'état PENDING par un test Python.

## 3. Contrôleur

- [x] 3.1 Ajouter l'endpoint loopback de relance, vérifier sa corrélation et transmettre l'événement structuré à la tâche orchestratrice sans créer de décision.
- [x] 3.2 Planifier le heartbeat de reprise et exposer la notification locale persistante lorsque le réveil est indisponible, avec tests Node.js ciblés.

## 4. Validation et documentation

- [x] 4.1 Mettre à jour la documentation CAB devenue inexacte et vérifier les fichiers modifiés, l'UTF-8 et les fins de ligne LF.
- [x] 4.2 Exécuter les tests Python et Node.js applicables, la syntaxe des scripts et la validation stricte OpenSpec.
