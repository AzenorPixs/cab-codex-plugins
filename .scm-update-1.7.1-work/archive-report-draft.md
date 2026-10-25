# Rapport d'archivage SCM — update-active-cab-components

Projet : Codex Approval Bridge (`cab`). Livraison source : **1.7.1**.
Date : 20 octobre 2026, Europe/Paris. Session directe SCM.

## 1. Statistiques générales et décisions

Je fais évoluer /cab update pour déployer broker, contrôleur, superviseur et Web, y compris actifs. Le jeu est vérifié et sauvegardé avant maintenance, les briques actives sont arrêtées puis relancées et les composants inactifs restent inactifs. Les RUN, pauses, décisions, sources du projet observé, preuves et archives sont conservés. Le repli restaure seulement les artefacts distribués ; il ne remet jamais en place un ancien runtime métier.

| Qualification finale | Réussis | Échecs | Ignorés | Total |
| --- | ---: | ---: | ---: | ---: |
| Node, suite complète | 308 | 0 | 1 | 309 |
| Python, unittest | 67 | 0 | 0 | 67 |
| Total distinct | **375** | **0** | **1** | **376** |

La répétition finale des quatorze tests du déploiement est réussie et n'est pas additionnée. Elle couvre les derniers contrôles de cache et de chemins systemd contenant des espaces et guillemets. Les 34 tests ciblés précédents ne sont pas additionnés. Chromium et Firefox passent chacun 34 groupes de contrôle, distincts des totaux unitaires. Syntaxe : **36 fichiers**, 11 Python et 25 JavaScript. Les **27 modules source et distribués** portent 1.7.1. Les 23 modules initiaux gardent exactement leurs corps après neutralisation du seul remplacement de version ; les trois copies broker sont identiques à src/.

Modèle exact, tokens, coûts, quotas, cache, débit, durée exhaustive et inventaire complet des messages/outils : **N/A**, aucune télémétrie de pilotage normalisée n'est activée en SCM. Aucun sous-agent, pilotage OpenCode réel ou skill de statistiques pilotées n'est utilisé.

## 2. Types de messages et d'outils

Lectures ciblées, rg, empreintes SHA-256, éditions locales, contrôles syntaxiques, tests Node/Python, adaptateurs systemd/HTTP simulés, fixtures HTTP/SSE, WebDriver Chromium et BiDi Firefox, CLI OpenSpec et vérification statique systemd. L'identité non secrète est extraite localement de PROJECT_NAME/PROJECT_ID sans restituer le contenu brut de project.env.

Aucune commande Git, aucun commit, staging, push, branche, tag ou publication. Aucun service réel, profil utilisateur installé, cache de plugin actif ou fichier du projet consommateur n'est modifié. Aucun appel au contrôleur ou broker de production. Aucun message n'est envoyé à un autre chat.

## 3. Fichiers et cohérence documentaire

Le correctif ajoute cgpt-approval-bridge-update.mjs, ses tests et sa référence component-update.md, et distribue les trois modules broker. La commande /cab update conserve la comparaison conditionnelle du plugin et de la commande de profil, puis confie le déploiement des quatre briques au moteur transactionnel. Les versions et références de distribution passent en 1.7.1 avec cachebuster neuf. Les archives antérieures restent closes.

| Document | État et preuve |
| --- | --- |
| AGENTS.md | Inchangé, empreinte initiale conservée ; autorisations, secrets, Git et règles de travail préservés. |
| PROJECT.md | Version et section 5.5 : mise à jour des quatre briques, maintenance et états initiaux. |
| TECHNICAL.md | Section 16 et Mise à jour des briques actives : phases, contrôles, attente, journal et récupération. |
| BUILD.md | Section 6 et distribution 1.7.1 : paquet broker complet, cibles, sauvegardes et relance des seules briques actives. |
| DEVOPS.md | Inchangé, empreinte initiale conservée ; runtimes et navigateurs déclarés utilisés, aucune dépendance nouvelle. |
| README.md | Bloc /cab update : maintenance, attente de 120 s, relance, reprise et limites des installations gérées. |
| CHANGELOG.md | Entrée 1.7.1 de préparation source ajoutée ; historique 1.7.0 et antérieur conservé. |
| openspec/specs/ | Capacité active-component-update et deltas de distribution, concurrence et statistiques synchronisés à l'archivage. |
| ORCHESTRATED_CODING.md | Alignement de version uniquement ; l'égalité de la référence embarquée est testée. |
| Commande et skill CAB | Procédure transactionnelle et référence component-update ; aucun démarrage implicite du pilotage par SCM. |
| Sources et distribution | 27 versions cohérentes ; copies Python contrôlées octet pour octet, imports et paquet complet qualifiés. |

Le déploiement exige des cibles gérées et prouvées, un OpenCode accessible pour son MCP et, si CAB fonctionne, un contrôleur disponible au schéma 4 avec protocole resource-scoped-v1. Un répertoire broker inconnu, dans le workspace ou dans un cache de plugin reste un blocage explicite. La commande ne modifie pas la configuration pour déplacer une installation manuelle. Configurations env, secrets et drop-ins restent hors écriture. Aucun schéma opérationnel n'est migré.

## 4. Commandes et résultats

Validations exécutées et réussies :

- `node --test --test-reporter=spec --test-concurrency=1 tests/*.test.mjs` : code 0, 308 réussis, un ignoré, 114 233,077786 ms ; trace node-tests.txt.
- `node --test tests/active-component-update.test.mjs` : répétition finale, code 0, quatorze tests, 32 132,691825 ms ; final-update-tests.txt.
- `node --test tests/active-component-update.test.mjs tests/controller-service-distribution.test.mjs` : reprise ciblée, 34/34, code 0 ; targeted-tests.txt.
- `python3 -m unittest discover -s tests -p 'test_*.py'` : code 0, 67 réussis, 11,439 s ; python-tests.txt.
- `node tests/web-monitor-browser.mjs` : code 0, 34 groupes par navigateur, Chromium 155.0.8059.79 et Firefox 153.5.0 ; résultat JSON et captures de régression.
- `node --check <fichier.mjs>` et `python3 -m py_compile <fichier.py>` : code 0 sur les 36 fichiers concernés ; syntax.json.
- `systemd-analyze --user --man=no verify <trois unités source>` : code 0, sans activation réelle. Deux avertissements concernent les bits exécutables des modèles contrôleur/superviseur ; leurs permissions sont conservées dans ce correctif.
- `openspec validate update-active-cab-components --strict --no-interactive` : code 0 avant code/tests, puis contrôle final du change.
- `openspec validate --all --strict --no-interactive` : code 0, 13/13 avant archivage.

Les tests du moteur couvrent le jeu réel et sa syntaxe, les quatre briques actives, les briques inactives, l'idempotence, l'attente puis la reprise de transaction, les paquets incomplets, imports absents, downgrades, syntaxe invalide, erreurs de démarrage ou de version, repli, interruption avant gel/pendant installation/à la libération, concurrence flock, journal corrompu, cibles interdites, liens, dérive des RUN, modifications externes et altération du stage. Une intervention externe levant le gel interdit de couper les RUN repris.

Un premier contrôle documentaire a échoué sur une expression régulière qui ne traversait pas un retour à la ligne. Le test vérifie maintenant la même exigence sur le texte normalisé ; la reprise ciblée et la suite complète passent. Aucun test fonctionnel n'est affaibli, désactivé ou supprimé pour obtenir ces résultats.

TMPDIR et PYTHONPYCACHEPREFIX sont dirigés sous la racine dans .scm-update-1.7.1-work ; ce dossier contient les preuves et artefacts régénérables, hors livraison source. Lint, typage et construction tiers : **non pertinents**, aucune chaîne correspondante configurée. ShellCheck : **non pertinent**, aucun script shell modifié. Intégration native OpenCode opt-in : **non exécutée**, CAB_TEST_OPENCODE absent. Installation et redémarrage de services réels : **non exécutés**, hors périmètre de cette préparation source.

## 5. Accès web

Aucune recherche ni consultation web externe. Les tests HTTP/SSE, WebDriver et BiDi utilisent des fixtures loopback. Les commandes de services et routes de maintenance du moteur de déploiement sont simulées ; les fichiers de code, sauvegardes et journaux sont réellement écrits dans les profils de test isolés. Volumes et nombre exhaustif d'appels : **N/A**, aucun relevé normalisé.

## 6. Synthèse globale

Je livre /cab update 1.7.1 avec un déploiement contrôlé des quatre briques, y compris actives. La maintenance attend une frontière sûre, conserve les RUN et leurs pauses, distingue versions installées et actives et prévoit le repli et la récupération après interruption. OpenCode n'est pas redémarré et aucune permission, session ou purge métier n'est créée.

Qualification : 375 tests réussis, un scénario optionnel ignoré, 36 fichiers syntaxiquement valides, 27 modules cohérents et deux navigateurs qualifiés. Le déploiement réel, la publication et l'installation de la nouvelle commande restent des opérations distinctes.
