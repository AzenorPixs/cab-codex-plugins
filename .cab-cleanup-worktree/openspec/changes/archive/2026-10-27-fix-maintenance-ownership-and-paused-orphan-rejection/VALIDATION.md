# Validation SCM — CAB 1.10.7

## Périmètre et autorité
Deux correctifs, OpenSpec, incrément commun 1.10.7, tests et migration/reprise ont été validés explicitement par le développeur. SCM direct ; aucune télémétrie SCMP déclenchée.

## Preuves source
- `node --test tests/*.test.mjs` : 431 cas, 405 réussis, 26 ignorés, zéro échec. Les 25 cas du profil gelé original 1.7.1 nécessitent leur paquet historique explicite ; le cas natif OpenCode est soumis à son option d'environnement. Ces cas optionnels ne qualifient pas une activation réelle.
- `/home/devops/python/current/bin/python3 -B -m unittest discover -s tests -p test_*.py` : 73 tests réussis ; 16 compilations Python réussies.
- `tests/helpers/run-readonly-broker-two-uid.py --original-plugin <paquet 1.10.6> --actor-artifacts --worker-broker --large-registry` : succès et déconnexion avec réponse perdue, quatre processus 1.10.7, deux UID réels, fichiers et métadonnées broker inchangés, OpenCode et PAUSE conservés.
- Même banc sans `--actor-artifacts` : ancienne preuve compatible, deux issues réussies, refus effectif d'écriture broker par le compte de maintenance.
- `openspec validate --all --strict` : 15 éléments valides, zéro échec.
Les logs détaillés et résultats JSON sont dans `output/scm/fix-maintenance-ownership-and-paused-orphan-rejection/`, exclus de Git. Les premiers essais ont détecté le contexte RUN figé et un rapport de banc mal étiqueté ; ces points ont été corrigés et les contrôles affectés rejoués.

## Matrice documentaire
| Document | État et justification |
| --- | --- |
| AGENTS.md | Inchangé : règles et périmètre ne changent pas. |
| PROJECT.md | Version courante et propriété/rejet seul précisés. |
| TECHNICAL.md | Champs de preuve et réconciliation du job en PAUSE documentés. |
| BUILD.md | Distribution 1.10.7 et qualification deux UID ajoutées ; qualifications historiques conservées. |
| DEVOPS.md | Inchangé : runtimes et banc Docker déjà autorisés. |
| README.md | Comportements publics et version de distribution actualisés. |
| CHANGELOG.md | Entrée 1.10.7 ajoutée. |
| ORCHESTRATED_CODING.md | Inchangé : contrat commun conservé, référence concurrent-runs byte-compatible. |
| OpenSpec | Deux capacités enrichies, deltas stricts et canons synchronisés. |

## Exploitation
La qualification isolée ne vaut pas installation réelle. Le reçu de maintenance, les versions actives, la reconnexion, la PAUSE et la reprise seront consignés après leurs contrôles vivants. Aucun propriétaire ou droit hôte n'a été modifié.

## Migration réelle
Transaction `update-ddfd02bf-fb67-4906-8760-2ae22d421955` : COMPLETED, quatre versions actives 1.10.7, broker reconnecté READY avec pending=0/stalled=0, maintenance RELEASED. OpenCode PID/startTime conservés ; trois modules broker et leurs propriétaires/modes/inodes/horodatages conservés par comparaison du reçu. Deuxième invocation avec même preuve : up-to-date, sans redémarrage. Preuves filtrées `live-migration.json`, `live-rejection.json`, `live-resume.json`.

L'ancienne demande PENDING sans propriétaire a été refusée administrativement par l'outil manuel du broker après décision explicite. Une tentative initiale a échoué sans effet car l'outil n'était pas exposé ; après redémarrage du broker signalé par le développeur, un appel sans paramètres a été refusé -32602, puis l'appel exact a enregistré REJECTED. Un get_approval natif frais du même ID a confirmé le rejet avant clôture du mandat. Aucune écriture Pixs ni permission métier n'a été délivrée par cette maintenance.

Le seul RUN encore réservé a reçu RESUME après ces contrôles ; sa version et sa session sont conservées. Le retour d'orchestration est vérifié séparément. GitHub reste en 1.10.6 tant que la publication conditionnelle SCM n'est pas exécutée ; le paquet local 1.10.7 qualifié a été installé via la marketplace locale, et ses origines/sauvegardes sont conservées.

La reprise est effective au niveau orchestration : le chat propriétaire 1CISMP7 est actif, a confirmé la réservation et READY ciblé sans validation en attente, puis reprend la résolution du prompt et la relecture des spécifications PA01. Ce constat ne prétend pas qu’une nouvelle écriture métier est exécutée.

Le répertoire de fixtures historiques `.cab-readonly-work` était déjà versionné : il est conservé à son emplacement. Les nouveaux jeux temporaires sont sauvegardés dans output puis nettoyés ; seul le résultat courant `two-uid-result.json` est actualisé par le banc, conformément à son comportement existant.
