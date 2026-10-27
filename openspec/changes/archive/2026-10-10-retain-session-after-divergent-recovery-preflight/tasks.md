## 1. Spécification validée
- [x] 1.1 Écrire et valider les deltas RFC 2119 avant code/tests.
## 2. Correction
- [x] 2.1 Implémenter retry explicite et preuves séparées sans changer session/job/RUN.
- [x] 2.2 Harmoniser skill, commande, référence, protocole local et documentation.
- [x] 2.3 Aligner les versions sur 0.87.2.
## 3. Validation
- [x] 3.1 Tests ciblés puis suites Node/Python et syntaxe.
- [x] 3.2 Skill, versions, encodage, périmètre et cohérence documentaire.
- [x] 3.3 Valider OpenSpec ciblé et comparer les avertissements globaux historiques.
## 4. Livraison locale après les tâches validées

Archiver uniquement ce change, puis produire et vérifier STATISTIQUES.md dans
son archive. Ces opérations de clôture ne sont pas des tâches d'implémentation.
Leur résultat sera consigné après exécution, sans réarchivage.

## Preuves avant archivage

- Périmètre validé par le développeur après proposition SCM ; OpenSpec ciblé --strict --json : exit 0, 1/1, issues[] avant code/tests.
- Tests ciblés : 29/29. Tests Node finaux, six fichiers exécutés un par un sans modification du runner : 57/57, zéro échec. Tests Python : 38/38, zéro échec. Total final : 95/95.
- Échecs intermédiaires : deux invocations Node sandbox interrompues avant tests ; diagnostic sans isolation 12/13 (attente de version ancienne corrigée) ; deux suites groupées 56/57 avec contrôleur simulé indisponible pour strictCommands=false. Ce test, la suite de configuration actuelle et sa fixture antérieure réussissent séparément. Cause exacte des deux indisponibilités groupées non établie ; aucun test désactivé ni attente affaiblie.
- Commandes finales : node --test <chaque tests/*.test.mjs> ; python DevOps -B -m unittest discover -s tests -p 'test_*.py', avec TMPDIR dans output/scm-retain-recovery-session. Les processus et services des tests sont simulés.
- Syntaxe : py_compile sur src/cgpt_approval_bridge_server.py, tests/test_crash_recovery.py, tests/test_session_reset.py ; node --check sur contrôleur, superviseur et les deux tests Node modifiés : 7/7.
- Skill : /usr/bin/python3 /home/ade/.codex/skills/.system/skill-creator/scripts/quick_validate.py plugins/cab-approval-bridge/skills/approval-bridge : exit 0, Skill is valid!.
- Versions : 0.87.2 pour broker, contrôleur, superviseur, pyproject, commande et version de base du plugin ; nouveau cachebuster. JSON du manifeste, UTF-8/LF contrôlés.
- Revue des différences sur baseline ciblée sans Git : 18 fichiers préexistants modifiés avant synchronisation canonique ; trois changes historiques actifs inchangés.
- OpenSpec global initial strict : exit 1, 13 WARNING historiques de longueur et zéro ERROR. Le résultat final sera comparé après synchronisation.

## Matrice documentaire revue

| Élément | Résultat et justification |
| --- | --- |
| Projet réel | Contrôleur et tests de retry alignés, pas d'intégration réelle prétendue |
| AGENTS.md | Inchangé, règles générales compatibles ; empreinte identique |
| PROJECT.md | Résilience sans renouvellement ni purge après prévol divergent |
| TECHNICAL.md | Contrat retry, refus natifs, frontière et persistance documentés |
| BUILD.md | Contrôles d'intégration et version 0.87.2 actualisés |
| DEVOPS.md | Inchangé, aucune dépendance ni changement d'environnement ; empreinte identique |
| README.md | Comportement de reprise et version actualisés |
| CHANGELOG.md | Entrée 0.87.2, correction et impacts consignés |
| ORCHESTRATED_CODING.md, skill, /cab, référence de purge | Protocole distribué cohérent ; nouvelle purge réservée au nouveau RUN |
| openspec/config.yaml | Inchangé, règles de schéma inchangées |
| OpenSpec ciblé | Trois capacités couvertes ; le remplacement initial CISMP reste inchangé |

La livraison concerne les sources CAB. Pas d'installation dans le profil,
publication, service utilisateur réel, reprise du RUN Pixs, édition PROMPTS,
commit ni autre opération Git. L'intégration réelle reste à réaliser dans un
périmètre distinct. Les permissions techniques de plateforme pour le fichier
.codex et les tests hors sandbox ont été accordées.

## Preuves après archivage

- Archivage unique réussi, exit 0, specsUpdated=true : 6 exigences ajoutées, 6 modifiées, 5 supprimées, zéro renommage.
- Canon global final sans strict : exit 0, 7/7 ; strict : exit 1, 13 WARNING identiques au relevé initial, zéro ERROR. Aucun nouveau warning ; ce strict n'est pas présenté comme réussi.
- Trois capacités canoniques synchronisées, trois changes historiques actifs intacts. 21 fichiers préexistants modifiés, six artefacts archivés, un rapport : 28 chemins de livraison distincts.
- STATISTIQUES.md produit après archivage, six sections, UTF-8/LF, totaux 57 + 38 = 95 et 21 + 6 + 1 = 28 vérifiés.
- SCM TERMINÉ pour les sources 0.87.2 ; installation et intégration réelle non exécutées dans ce périmètre.
