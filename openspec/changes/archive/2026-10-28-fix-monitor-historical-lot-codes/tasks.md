## Réalisation

- [x] 1. Mettre à jour l’exigence canonique et son delta en préservant les scénarios existants.
- [x] 2. Corriger le parseur pour les seuls codes historiques L1 et L2 et ajouter les régressions ciblées.
- [x] 3. Actualiser les mentions affectées du registre, de la cartographie et du changelog sans attribuer de nouveau code.

## Validation

- [x] 4. Vérifier syntaxe, tests ciblés, OpenSpec cible/global/archives et intégrité du périmètre.

Le change reste ouvert : archivage et activation ne sont pas demandés. Les résultats source ne constituent pas une qualification runtime.

## Preuves du 28 octobre 2026

- Avant correction : les deux tests ciblés des codes de lot et des codes historiques échouent sur null au lieu de L1, reproduisant le défaut.
- Après correction : `env TMPDIR=/home/devops/datas/cab /home/devops/node/current/bin/node --test tests/web-monitor.test.mjs` : 14 tests réussis, aucun échec ni cas ignoré. Les fixtures sont nettoyées par les tests.
- `node --check` sur le module monitor-data et le fichier de tests : deux succès.
- Validation stricte du change : réussie ; OpenSpec global standard et strict : 16/16 chacun, zéro problème ; contrôle strict des tâches des archives : 72/72.
- Lecture locale non mutante des deux vraies archives par readChanges : L1 et L2 restitués ; parseChangeTitle reconnaît les 72 codes existants, sans renumérotation.
- Delta MODIFIED identique à l’exigence canonique actualisée, avec les deux scénarios antérieurs préservés exactement et deux scénarios ajoutés.
- Empreintes : six fichiers existants modifiés dans le périmètre et quatre nouveaux fichiers de ce change ; 923 autres fichiers de la base conservés, notamment les 72 archives et leurs preuves. UTF-8/LF et liens locaux vérifiés.

Aucun test navigateur ni suite produit complète exécuté : le changement concerne uniquement le parseur de données, couvert par la suite ciblée ; aucun rendu ou composant frontend modifié. Aucun service installé, redémarré ou activé, aucun commit ni archivage.

## Clôture du 28 octobre 2026

Une demande humaine ultérieure autorise explicitement l’archivage de ce seul change, son rapport STATISTICS.md et la mise à jour du registre et de DEVELOPMENT_MAP.md, sans déploiement ni activation. Les mentions précédentes « reste ouvert » et « aucun archivage » décrivent l’état avant cette autorisation.

Archivage natif réussi : 2026-10-28-fix-monitor-historical-lot-codes ; aucune modification du canon, déjà identique au delta. Tests ciblés revérifiés avant archive : 14/14. Après archive : OpenSpec standard et strict 15/15 chacun, tâches des archives 73/73. Rapport : [STATISTICS.md](STATISTICS.md). Aucun code attribué à ce change ni code existant renuméroté.
