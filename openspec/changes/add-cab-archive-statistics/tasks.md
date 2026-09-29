## 1. Spécification

- [x] 1.1 Définir et valider le contrat d'archivage avec statistiques et la distribution CAB.

## 2. Intégration

- [x] 2.1 Embarquer le skill et ses métadonnées, sans dépendance au skill cgpt.
- [x] 2.2 Aligner le protocole CAB, AGENTS, la commande et les cadrages.
- [x] 2.3 Synchroniser les spécifications de référence sans archiver ce change.

## 3. Validation et release

- [x] 3.1 Vérifier le paquet, le contrat de distribution et les suites applicables.
- [x] 3.2 Incrémenter tous les composants versionnés de 0.85.1 à 0.85.2 et vérifier leur cohérence.
- [x] 3.3 Examiner le diff et les limites de validation ; ne pas publier ni déployer.

## Preuves et limites

- `openspec validate add-cab-archive-statistics --strict` : réussi.
- `openspec validate --specs --strict` : 7 spécifications valides.
- Validateurs du plugin et des deux skills : réussis.
- `node --test tests/*.test.mjs` : 22 tests réussis, y compris la distribution,
  le protocole de statistiques et la cohérence de version `0.85.2`.
- `python3 -B -m unittest discover -s tests -p 'test_*.py'` : 6 tests réussis.
- Compilation sans artefact des trois modules Python et `node --check` des
  quatre scripts distribués : réussis.
- UTF-8/LF, JSON et diff contrôlés. Aucun fichier sensible ou artefact de
  session ajouté au plugin ; copie limitée au skill et à ses métadonnées.
- Aucun archivage réel, déploiement de service, installation de profil,
  commit ou push effectué. Le change reste ouvert, avec ses deltas synchronisés.
- Tools Codex était déjà revenu à son état initial lors du contrôle ; aucun
  fichier de ce dépôt n'a été modifié dans ce travail.
