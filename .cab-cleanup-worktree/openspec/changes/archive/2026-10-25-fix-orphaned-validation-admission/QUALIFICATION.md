# Historique de qualification du lot source avant reprise SCM

Les résultats ci-dessous décrivent le lot initial avant le SCM 1.8.0. Ils sont
conservés pour audit ; le bilan final SCM figure en fin de document et dans
la qualification du change support-frozen-recovery-controller-maintenance.

Accord transmis depuis le chat 01a16914-17c7-7971-8e8b-294cc3bc96e9 :
« Autoriser le lot source et tests CAB », question
call_e0627c8c23c84e4eb9dbe97a9e3ccce5. Cet accord couvre uniquement le lot
dans /home/devops/datas/cab ; activation et maintenance restent distinctes.

## Résultats réellement exécutés

| Contrôle | Résultat | Preuve locale non versionnée |
|---|---|---|
| Trois fichiers Node ciblés, dernier état du code | 131 réussis, 0 échec | .cab-orphan-work/verified-targeted-tests.txt |
| Suite Node globale | 326 réussis, 3 échecs, 1 ignoré, 330 cas | .cab-orphan-work/final-node-tests.txt |
| Python unittest | 72 réussis | .cab-orphan-work/python-tests.txt |
| Syntaxe des quatre modules et trois tests | 7/7, code 0 | .cab-orphan-work/syntax-and-retry.json |
| OpenSpec change strict | Code 0 avant code, puis après les deltas finaux | Commandes de validation observées |
| OpenSpec global strict | 14/14, code 0 | .cab-orphan-work/openspec-tests.txt |
| Distribution avec contrôleur original installé | Mêmes trois échecs documentaires | .cab-orphan-work/baseline-distribution-tests.txt |

Les tests ciblés sont inclus dans les suites globales et leurs répétitions :
ne pas additionner leurs nombres. Après la suite globale, le dernier ajout
de garde contre une candidate détenue par un pair est couvert par la reprise
complète des trois fichiers ciblés, 131/131. Aucun autre fichier source n'a
été changé depuis la suite globale.

Les contrôles utilisent /home/devops/node/current/bin/node et
/home/devops/python/current/bin/python3 ; TMPDIR des commandes Node et
TMPDIR/PYTHONPYCACHEPREFIX des commandes Python sont placés sous
.cab-orphan-work. Les fixtures utilisent
des ports éphémères, des workspaces privés et des agents simulés. Le scénario
OpenCode réel est ignoré, opt-in CAB_TEST_OPENCODE vide. Aucun test produit
Pixs, service partagé ou registre vivant n'est utilisé.

## Échecs observés et limites

Trois tests globaux restent en échec dans les fichiers non modifiés
controller-service-distribution.test.mjs et monitor-service-start.test.mjs :
référence run-lifecycle.md absente du protocole local, référence concurrente
non embarquée telle qu'attendue et bootstrap monitoring non présent dans sa
partie introductive. Les mêmes trois tests échouent dans une copie isolée
avec le contrôleur original du cache 1.7.1, ses références et le protocole
local non modifié. Aucun test n'est affaibli, ignoré ou corrigé pour masquer
ces écarts. Ils restent hors lot et la suite globale n'est pas verte.

Deux essais initiaux ont échoué parce que la sérialisation ajoutée comptait
la requête courante comme une transition concurrente ; la garde distingue
désormais sa propre transition, puis les scénarios concernés sont repassés.
Un premier test de perte de contexte omettait la publication de readiness
après redémarrage de sa fixture ; cette précondition a été rétablie, sans
affaiblir la garde. Les traces des suites précédentes sont conservées.

Lint, typage et construction distincte ne sont pas configurés pour ces
modules. L'interface web n'est pas modifiée ; les tests navigateur ne sont
pas rejoués pour ce lot de coordination.

## Contrats et garanties vérifiés

- Ask refusé avant propriétaire/opération ; correction de la règle puis
  nouvelle notification exacte possible sans orphelin.
- Admission durable groupée ; erreur de persistance ferme le registre sans
  résultat durable partiel ni validation exploitable.
- Réconciliation seulement du prévol courant gelé, exact et PENDING, avec
  autorisation spécifique et preuves natives ; identités, propriétaire,
  opération, génération, ressources et révisions divergents refusés.
- Effet, accès, permission, allow, historique changé ou candidate détenue
  par un pair refusés sans mutation de réparation.
- Reçu durable et idempotent, validation limitée à rejected, aucune décision
  automatique, acquisition, extension de groupe ou once pour l'ancien prévol.
- Perte du contexte local : reçu préservé et restauration automatique refusée.
- Rejet local, preuve MCP REJECTED puis retry existant dans la même candidate,
  avec nouvelle identité et frontière native ; pair indépendant préservé.

Le corps de checkRecoveryRetry est identique à celui du cache original :
SHA-256 6dcbb0ac71745215e04fb000fa5a8534433ee591ca4c882bb903719fc3bc335a.
Cette égalité porte sur le code, pas sur une réussite du prévol vivant.

## Périmètre et activation

Fichiers initiaux modifiés : quatre modules, trois tests, TECHNICAL.md et
BUILD.md. Les nouveaux artefacts restent dans ce seul change ; preuves et
fichiers temporaires restent dans .cab-orphan-work. Les empreintes initiales
de 430 fichiers autorisés sont comparées dans controle-perimetre.json.
Aucune suppression, écriture Pixs, mutation Git, installation, intervention
sur le registre vivant ou relance partagée n'est effectuée.

ACTIVATION.md expose les identités à préserver, le contrat de la nouvelle API,
la séquence rejet/polling/retry et l'obstacle de maintenance existant :
checkCohort refuse une récupération ouverte. La proposition n'affirme pas
qu'une activation normale par /cab update soit actuellement admissible et
n'autorise aucun contournement de cette garde.

## Bilan final de la reprise SCM 1.8.0

La demande humaine SCM étend le périmètre à la finalisation source et à
l'archivage des deux changes ciblés. La qualification globale finale commune
est réussie : 363 tests Node, 72 Python, aucun échec, un scénario OpenCode
produit optionnel non exécuté. Les trois écarts documentaires historiques
ci-dessus sont réconciliés dans le protocole distribué. Les répétitions et
résultats partagés ne sont pas additionnés par change.

Les cinq gardes retry/prévol/ASK/once conservent leurs corps originaux ; les
preuves finales sont sous .cab-scm-1.8.0-work/node-release.txt,
python-release.txt et source-final.json. Le contrôleur original 1.7.1 puis
le contrôleur 1.8.0 sont réellement démarrés en fixture jusqu'au rejet MCP,
retry, prévol neuf once/exit 0 et complete avec le même broker original.
Le mode releases et l'alignement ordinaire des quatre processus sont aussi
qualifiés. Voir QUALIFICATION.md du change
support-frozen-recovery-controller-maintenance pour les commandes, la revue
documentaire, les erreurs intermédiaires et leurs corrections.

Ce bilan ne prouve aucune installation ou réparation vivante. La demande
legacy non routée retrouvée dans l'historique C08 est distincte du prévol
coordonné de ce lot : aucun propriétaire ou manifeste ne lui est inventé.
L'activation, les preuves des pairs et les décisions opérationnelles restent
distinctes ; leur proposition actualisée figure dans ACTIVATION.md du L2.

L'archivage natif L1 a ensuite réussi dans
2026-10-25-fix-orphaned-validation-admission : cinq exigences ajoutées et
synchronisées, rapport STATISTIQUES.md à six sections vérifié. Après le
second archivage ciblé L2, OpenSpec global strict réussit sur 13/13 canons.
Les preuves finales sont archive-l1.json et openspec-release-after-archive.json
sous .cab-scm-1.8.0-work. Le cycle source est clos, sans activation réelle.
