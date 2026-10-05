## 1. Spécification

- [x] 1.1 Valider le change ciblé et vérifier le périmètre approuvé.

## 2. Correctif et versions

- [x] 2.1 Indexer les recherches de la boucle initiale de réparation post-crash et préserver les garanties existantes.
- [x] 2.2 Aligner les versions CAB courantes et pyproject.toml sur 0.86.3, et actualiser la documentation concernée.

## 3. Validation

- [x] 3.1 Tester réparation, idempotence, expiration, erreurs et divergences sur des données isolées.
- [x] 3.2 Vérifier le nombre de lectures et mesurer la récupération sur un volume synthétique représentatif.
- [x] 3.3 Vérifier initialize MCP en sous-processus isolé, la syntaxe et les suites Python/Node applicables.
- [x] 3.4 Vérifier la cohérence des versions, les fichiers touchés et OpenSpec strict.
- [x] 3.5 Ajouter et vérifier la même règle de statistiques dans AGENTS.md de CAB et de template, selon l'extension validée.

## 4. Archivage

- [x] 4.1 Archiver le seul change ciblé après satisfaction des critères et synchroniser sa spécification.
- [x] 4.2 Produire et vérifier STATISTIQUES.md dans l'archive, avec N/A motivé pour les mesures indisponibles.

## Résultats observés avant archivage

- Suite Python : 17 tests réussis, dont 11 tests de récupération.
- Jeu synthétique : 694 approbations, 16 774 événements, 7 521 590 octets.
  Récupération en 0,612 s avec 5 lectures du journal (index, contrôles et
  écritures techniques compris) ; sous-processus MCP initialize et arrêt
  propre en 1,714 s. Mesures indicatives sur cette machine, sans garantie de
  délai pour l'installation utilisateur.
- Syntaxe Python et JavaScript : réussie. UTF-8/LF et versions 0.86.3 :
  vérifiés sur les fichiers du périmètre ; schémas/protocole conservés.
- Contrôleur/superviseur Node : 15 tests réussis hors sandbox après EPERM
  sur l'écoute loopback dans le sandbox. Aucune installation utilisateur.
- Distribution Node : 8 tests réussis après l'ajout documentaire autorisé dans
  AGENTS.md de CAB et de template. Ajout identique, UTF-8/LF et empreintes des
  deux documents privés du seul ajout vérifiés ; aucune autre modification.
- OpenSpec strict : change valide. Archivage effectué dans
  `2026-10-03-fix-crash-recovery-journal-scans` ; une exigence ajoutée à
  `approval-persistence`, sans modification des autres changes. Rapport final
  `STATISTIQUES.md` produit et vérifié : six sections, UTF-8/LF, 21 fichiers
  finaux présents, totaux croisés et données absentes motivées. Cycle terminé
  dans le périmètre validé ; copie globale et démarrage OpenCode utilisateur
  hors périmètre, non exécutés.
