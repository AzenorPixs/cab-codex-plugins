## 1. Spécification

- [x] 1.1 Valider le delta approval-persistence du périmètre approuvé.

## 2. Implémentation et release corrective

- [x] 2.1 Indexer les recherches de présence dans do_list sans changer ses contrats.
- [x] 2.2 Ajouter les tests de lectures, résultats, réparations et erreurs.
- [x] 2.3 Aligner les versions et la documentation sur 0.86.4.

## 3. Validation et archivage

- [x] 3.1 Exécuter les suites et vérifications syntaxiques applicables.
- [x] 3.2 Vérifier les versions, la cohérence documentaire et OpenSpec strict.
- [x] 3.3 Contrôler les critères d'acceptation et l'éligibilité à l'archivage ciblé.

## Clôture après validation

Archiver uniquement ce change, vérifier les spécifications synchronisées,
puis publier et contrôler STATISTIQUES.md dans l'archive avant de déclarer
la session terminée.

## Preuves avant archivage

- Validation stricte du change : réussie avant le code et après implémentation.
- Test de reproduction sur l'ancien parcours : échec attendu, 12 lectures au lieu d'une.
- Suite ciblée : 10 tests réussis ; fixture de 694 approbations et 16 774 événements,
  7 706 222 octets, une lecture initiale, 0,126 seconde (mesure synthétique).
- `/home/devops/python/current/bin/python3 -B -m unittest discover -s tests -p 'test_*.py'` :
  27 tests réussis, dont la récupération et l'initialisation MCP isolée.
- `/home/devops/node/current/bin/node --test tests/controller-configuration.test.mjs tests/controller-service-distribution.test.mjs tests/persistent-job-supervisor.test.mjs` :
  23 tests réussis, aucun refus, échec ou test ignoré.
- Compilation `py_compile` des trois fichiers Python modifiés et `node --check`
  des trois fichiers JavaScript modifiés : réussis.
- Validation stricte des 7 spécifications : réussie ; informations non bloquantes
  de longueur de requirement déjà présentes, sans changement hors périmètre.
- JSON, versions, UTF-8/LF et revue des 17 fichiers avant synchronisation : réussis.
- Diff du broker contrôlé sans Git : exactement do_list et SERVER_VERSION.
- Matrice de cohérence revue : AGENTS/PROJECT/DEVOPS inchangés ; TECHNICAL/BUILD/README
  alignés, aucune migration, dépendance, interface ou configuration nouvelle.

Les critères sont satisfaits et l'archivage ciblé est autorisé par la validation
du développeur. Aucun déploiement ni profilage du broker de production, commit,
push ou travail sur les autres changes n'a été effectué. Pixs reste en pause.
