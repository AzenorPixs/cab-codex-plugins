# Qualification source — 29 octobre 2026

## Périmètre et résultat

Correctif SCM autorisé : reconcile-rejected, reçu natif non exécutable, levée globale liée au recovery, distribution commune 2.1.7. Aucun état privé CAB édité. Aucune activation réelle à ce stade.

## Preuves exécutées

| Contrôle | Résultat observé |
| --- | --- |
| Tests recovery | 44/44, dont perte de décision locale, erreur -32602 puis rejet, persistance, nouveau prévol once et complete |
| Contrôleur concurrent | 93/93, dont transaction différente, autorité absente, pair occupé, historique altéré et release liée au reçu |
| Recovery + concurrence + distribution | 166/166 avant campagne finale |
| Node global, exécution séquentielle des fichiers | 508 tests : 481 réussis, 27 ignorés, 0 échec ; journal `output/scm-rejected-preflight/node-tests-sequential.log` |
| Python DevOps | 74/74 avec `/home/devops/python/current/bin/python3 -B -m unittest discover -s tests -p 'test_*.py'` |
| Syntaxe | node --check : 35 modules ; py_compile : 11 fichiers, caches isolés dans output |
| Intégrité | 74 fichiers UTF-8/LF ; trois copies broker identiques aux sources |
| OpenSpec global strict | 17/17, avant synchronisation ; change strict valide |

La première campagne Node parallèle a donné deux échecs : délai de coordination et rejet de restauration non observé. La restauration passe isolément 29/29 ; la campagne globale avec `--test-concurrency=1` passe entièrement sans correction de ces mécanismes. Les deux observations restent conservées dans `output/scm-rejected-preflight/node-tests.log`.

Les 27 ignorés correspondent aux 26 scénarios optionnels de maintenance avec paquet original 1.7.1 (`CAB_TEST_ORIGINAL_PLUGIN` non fourni) et au scénario serveur OpenCode natif isolé (`CAB_TEST_OPENCODE` non fourni). Ils ne constituent pas des réussites ni une nouvelle qualification réelle des anciens profils mixtes. Les contrôles HTTP, de distribution et de maintenance ordinaire exécutés utilisent leurs fixtures isolées. L'activation homogène et le recovery réel restent à prouver après CABU.

## Matrice documentaire

| Document | État et justification |
| --- | --- |
| AGENTS.md | Inchangé : règles de sécurité, OpenSpec et SCM applicables conservées |
| PROJECT.md | Référence source commune 2.1.7 en section 1 ; responsabilités préservées |
| TECHNICAL.md | Nouvelle réconciliation explicite, preuve canonique, reçu et release ; cibles courantes alignées |
| BUILD.md | Distribution courante 2.1.7 et séquence archive puis CABU ; preuves historiques conservées |
| DEVOPS.md | Inchangé : inventaire daté d'environnement, chemins Node/Python/OpenSpec réutilisés ; aucun nouvel outil |
| ORCHESTRATED_CODING.md | Inchangé : protocole consommateur partagé ; retry ordinaire conservé, nouvelle exception détaillée dans le skill CAB et les commandes |
| README.md | Version source et procédure de réconciliation/release expliquées |
| CHANGELOG.md | Entrée 2.1.7 décrivant comportement, limites et compatibilité |
| DEVELOPMENT_MAP.md / BATCH_CODES.md | Entrée provisoire sans attribution de code ; liens et état actualisés lors de l'archive |
| Skills, références et commandes CAB/CABU | Version commune, nouveau protocole et autorité humaine ; CABU conserve sa procédure unique |

## Procédure opérationnelle après archive

1. Publier les sources selon les destinations configurées SCM et vérifier le SHA.
2. Exécuter CABU selon sa référence GitHub et vérifier les quatre versions réellement chargées, sans fermer OpenCode.
3. Relire le recovery et la transaction `integrity-6c1a28bb-9191-4845-8f9f-0be460db138c`. Produire localement la preuve native canonique sans contenu privé exposé, puis soumettre reconcile-rejected sous l'accord humain déjà obtenu.
4. Recontrôler et confirmer/libérer uniquement cette transaction avec le reçu retourné ; conserver le même RUN/job/candidate.
5. Dans la candidate, exiger le nouveau prévol exact avec décision explicite, ask/once, exit 0, READY puis complete. Reprendre ensuite PA01 au premier jalon non prouvé.

Une preuve divergente conserve le gel. Aucun rétablissement d'une sauvegarde métier, remplacement d'une décision, rejeu de once ou abandon implicite du RUN n'est autorisé.
