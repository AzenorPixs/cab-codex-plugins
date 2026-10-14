# Conception

## Contexte et décision

Le contrôleur peut vérifier les règles de session OpenCode mais ne possède pas
le moteur d'exécution natif. Il refuse donc une validation exécutable de job
armé si la session ne fournit pas une preuve conservatrice de `ask`.
La dernière règle dont le nom couvre `bash` ou `edit` doit avoir pattern `*`
et action `ask`. Les noms avec jokers sont pris en compte. Une règle spécifique
ultérieure ou une structure inconnue est refusée plutôt que normalisée.

Le contrôle HTTP est borné, corrélé à session/directory et répété avant
approbation manuelle ou automatique, puis avant transmission native. Après
chaque attente, les gardes d'admission et de décision sont réévalués pour
éviter qu'une transition concurrente autorise une ancienne opération.
Les refus explicites restent possibles lorsque `ask` n'est plus présent.
La récupération vérifie aussi la règle Bash de sa candidate avant tout prévol.

## Protocole de réactivation

1. Attendre l'inactivité de la session ciblée.
2. Réactiver uniquement les outils nécessaires dans un message `noReply`.
3. Rétablir les règles `ask` par PATCH natif dans cette seule session.
4. Relire et contrôler la réponse native.
5. Envoyer le mandat sans champ `tools` qui réécrirait ces règles.

Cette séquence reste sous le contrôle de l'orchestrateur. CAB ne modifie pas
les permissions, n'accorde aucune décision et ne rejoue aucune approbation.
Une modification externe après le contrôle ne peut être rendue atomique par
le contrôleur : la discipline de session et l'exécution native restent requises.

## Compatibilité et risques

Pas de nouvelle variable, dépendance, version de schéma ou protocole MCP.
Les jobs armés dont l'API ne publie pas les règles sont refusés avec diagnostic.
Le traitement historique des validations sans job armé est conservé.
La remédiation humaine existante d'un prévol exécuté sans `once` reste distincte
du retry ordinaire et n'est pas élargie par ce change.
La distribution 1.0.1 ne sera pas installée sur les services actifs ici.
Le repli consiste à conserver le jeu installé existant ; un futur déploiement
devra coordonner le jeu complet des composants après quiescence des RUN.

## Validation

Tests HTTP simulés : `allow`, règle absente/malformée, joker, priorité des
règles, panne HTTP, réactivation sûre, édition, approbation manuelle et
automatique, changement pendant la décision, unicité de `once`, récupération
et isolation concurrente. Syntaxe, versions, encodage et validation OpenSpec
stricte avant et après archivage. L'intégration sur les services actifs reste
hors périmètre et ne sera pas annoncée comme vérifiée.

## Vérifications exécutées

Le périmètre a été validé explicitement par « Je valide » dans le chat
`01a13893-8782-7531-a646-cdbd55a81c85`. Le change a été créé puis validé en mode
strict avant les écritures de code et de tests.

| Contrôle | Commande ou preuve | Résultat observé |
| --- | --- | --- |
| Python | `python3 -m py_compile src/*.py plugins/cab-approval-bridge/scripts/*.py tests/test_session_reset.py tests/test_crash_recovery.py` | Réussi, 8 fichiers |
| JavaScript | `node --check` sur les 7 scripts et 5 tests JavaScript modifiés | Réussi, 12 fichiers ; tests reparsés par la suite finale |
| Tests Python | `python3 -m unittest discover -s tests -p 'test_*.py'` | 48 réussis, 0 échec |
| Tests JavaScript | `env -u CAB_TEST_OPENCODE /home/devops/node/current/bin/node --test --test-concurrency=1 tests/*.test.mjs` | 123 recensés : 122 réussis, 1 non exécuté, 0 échec ; 23,359 s |
| Versions | Tests de distribution et constantes des sources | Base 1.0.1, plugin `1.0.1+codex.20261014050004` |
| OpenSpec avant archivage | `/home/devops/.local/npm/bin/openspec validate --all --strict` | 9 éléments valides, 0 échec |
| Intégration OpenCode réelle | Test natif désactivé par retrait de `CAB_TEST_OPENCODE` | Non exécutée ; services actifs hors périmètre |

Les premières tentatives HTTP dans la sandbox ont échoué sur `listen EPERM`.
Les contrôles ont ensuite utilisé des serveurs simulés sur ports loopback
éphémères hors sandbox. Les écarts de fixtures (répertoire, décision automatique
incomplète), attentes de version et route documentaire ont été corrigés.
La suite est exécutée séquentiellement pour éviter les collisions de ports des
fixtures. Les tests de récupération attendent uniquement le refus transitoire
`validation-in-flight`, qui précède toute mutation ; les autres refus restent
vérifiés tels quels. Ces échecs initiaux ne sont pas comptés comme réussites.

## Bilan documentaire

| Document | État dans ce SCM et preuve |
| --- | --- |
| `AGENTS.md` | Inchangé ; §§6, 7 et 21 régissent OpenSpec, rapport et validations. Empreinte initiale conservée. |
| `PROJECT.md` | Inchangé ; §§3.2–3.4 et 5.2 conservent neutralité, corrélation et once. L'architecture concurrente 1.0.0 reste compatible avec le correctif. |
| `TECHNICAL.md` | Mis à jour ; « Garde des permissions natives — CAB 1.0.1 » décrit le contrôle conservateur, les diagnostics et limites. Remédiation CISMP3 conservée. |
| `BUILD.md` | Mis à jour ; §11 distingue vérifications source et future mise en service coordonnée. |
| `DEVOPS.md` | Inchangé ; runtimes et chemins Node/OpenSpec utilisés tels que déclarés, aucune nouvelle dépendance. Empreinte initiale conservée. |
| `ORCHESTRATED_CODING.md` | Mis à jour ; réactivation sûre et route retry par RUN alignée sur le skill et la commande. |
| `README.md` | Mis à jour ; garde natif et version de base 1.0.1. |
| `CHANGELOG.md` | Mis à jour ; entrée 1.0.1, comportement, compatibilité et absence de déploiement. |
| Skill et commande CAB | Mis à jour ; séquence noReply/PATCH/lecture/génération, erreurs explicites et version de commande. |
| `openspec/specs/` | Deltas validés du contrôleur et de la distribution à synchroniser par l'archivage autorisé. Les autres capacités restent inchangées. |

La comparaison d'empreintes des 54 fichiers ciblés constate 31 fichiers
modifiés avant archivage, tous dans le périmètre prévu. Les modifications
préexistantes de la remédiation CISMP3 ont été préservées. Les opérations Git,
les caches installés, permissions et états des RUN actifs n'ont pas été modifiés
par ce SCM. Aucune migration ni nouvelle dépendance ; l'installation existante
reste le repli avant une mise en service séparée.
