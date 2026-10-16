## 1. Spécification
- [x] 1.1 Préparer et valider le change codex-integration-distribution pour status et 1.2.1 avant code/tests.

## 2. Commande et distribution
- [x] 2.1 Ajouter routage précoce status et --run, collecte ciblée en lecture seule, règles de preuves/fraîcheur et tableau exact.
- [x] 2.2 Aligner toutes les briques source sur 1.2.1, cachebuster et attentes de tests compris.
- [x] 2.3 Mettre à jour cadrages affectés, README.md et CHANGELOG.md ; justifier AGENTS.md et DEVOPS.md inchangés.

## 3. Vérifications
- [x] 3.1 Exécuter les tests de distribution et régressions CAB applicables avec limites natives explicites.
- [x] 3.2 Vérifier syntaxe, JSON, UTF-8/LF, versions et périmètre par empreintes sans Git.
- [x] 3.3 Revoir actif/idle, attente de pair/levée, attente interne, contradiction/indisponibilité et clôture ; distinguer revue et exécution réelle.
- [x] 3.4 Valider le change et le global strict ; établir la cohérence documentaire avant archive.

## 4. Livraison SCM après les preuves

Ces opérations obligatoires sont suivies après leur réalisation ; elles ne
sont pas cochées avant l’archive qu’elles décrivent.

- [x] 4.1 Archive unique 2026-10-16-add-cab-status-run-summary réussie, specsUpdated=true ; strict global postarchive 9/9, exit 0.
- [x] 4.2 STATISTIQUES.md produit et vérifié : six sections UTF-8/LF, 225 tests cohérents, empreintes de 30 fichiers concordantes et N/A motivés ; clôture SCM validée.
