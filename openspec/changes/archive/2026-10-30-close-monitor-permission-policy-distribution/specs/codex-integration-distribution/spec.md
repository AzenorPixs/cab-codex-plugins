## ADDED Requirements

### Requirement: Fermeture des imports selon leur destination déployée
L’updater MUST inclure permission-policy dans monitorScripts et vérifier chaque import relatif statiquement déclaré contre sa source et sa destination réelles. Un module présent seulement dans un autre groupe MUST NOT satisfaire l’import. Un paquet incomplet MUST être refusé avant coupure. Les gardes de permissions MUST rester inchangées ; archivage/publications SCM MUST précéder CABU vérifié et information.

#### Scenario: Client du moniteur installé
- **WHEN** le groupe indépendant est déployé dans son layout géré
- **THEN** son client ESM charge sa dépendance de politique et expose le garde sans composant source externe

#### Scenario: Dépendance dans le mauvais groupe
- **WHEN** un import existe dans le paquet mais pas à la destination relative attendue
- **THEN** update-package-import-missing est émis avant tout arrêt ou reconnexion
