# Statistiques — CAB 2.1.5

### Agents de codage

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| gpt-6.1-sol, déclaré dans PREUVES-SCM.json pour la réalisation ; agent Codex pour cette finalisation | N/A | OpenAI | N/A | N/A | N/A | N/A |

La déclaration de modèle du rapport source ne constitue pas une télémétrie de version. Les métriques et leur dénominateur de temps de service restent N/A : sondes périodiques non activées et durées actives absentes. Aucune reconstruction rétroactive.

### Agents orchestrateurs

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
|---|---|---|---|---:|---:|---:|
| Aucun agent orchestrateur — travaux directs | N/A | N/A | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

Change fix-native-v2-pagination-and-preflight-2-1-5, 28 octobre 2026. Session directe SCM : un agent Codex gpt-6.1-sol, aucun sous-agent. Périmètre explicitement validé : pagination, preuve native, tests, archive, statistiques, publication, activation puis CAB test isolé. Ce rapport couvre la qualification source et sa clôture ; les effets opérationnels suivants exigent leur preuve propre.

Durée exhaustive, tokens, coût et temps humain : N/A, non instrumentés. Aucun quota ni sonde de statistiques de pilotage invoqué pendant la qualification initiale ; le relevé final de compte de cette réconciliation est présenté en section 6. Aucun secret lu par le modèle ou copié dans les preuves.

## 2. Messages et outils

Lectures ciblées des cadrages, protocoles, cartographie, registre, OpenSpec et sources ; recherches rg ; éditions du lecteur, vérificateur, tests, documentation et versions ; commandes Node/Python et OpenSpec. Nombre exhaustif des messages et appels : N/A. Délégations : 0. Deux tests négatifs HTTP ont révélé une garde de concordance de session à conserver ; elle a été conservée et la suite finale repassée sans affaiblir ces tests.

Les essais intermédiaires ne sont pas additionnés aux totaux finaux. Les 35 tests ciblés appartiennent à la suite globale et ne sont pas comptés une deuxième fois.

Convention de lecture des opérations : une opération autorisée réussie ne prouve pas une approbation manuelle unitaire. Un refus nécessite une trace explicite de permission refusée ; une erreur technique ou un test échoué n’est pas un refus. Effectifs et taux exhaustifs des appels, approbations, refus et erreurs : N/A, aucune collecte complète agrégée.

## 3. Fichiers et documentation

Code comportemental : cgpt-approval-bridge-opencode-client.mjs et cgpt-approval-bridge-model-policy.mjs. Tests : opencode-v2-client.test.mjs, plus suites existantes. Passage de version : 65 fichiers courants alignés sur 2.1.5, sans modification des preuves runtime historiques ni des archives antérieures. Copies broker identiques. Le commit complet prescrit par SCM inclut aussi les contributions ACL antérieures déjà présentes (règles, annotations des propositions, registre et correctif historique du moniteur), sans les attribuer aux seules éditions de cette session.

PROJECT.md, TECHNICAL.md, BUILD.md, README.md et CHANGELOG.md décrivent le nouveau contrat ; références et commandes distribuées sont alignées. AGENTS.md 0.5 et DEVOPS.md sont inchangés par cette session. La matrice complète et les chemins sont dans [PREUVES-SCM.json](PREUVES-SCM.json).

DEVELOPMENT_MAP.md et openspec/BATCH_CODES.md sont exploitables et amendés uniquement pour le suivi de ce change. Réconciliation de clôture : CT14, attribué explicitement par CAB-ACL-R3 avant l’archivage, est conservé dans le titre et reporté dans les deux documents. Les 73 autres codes, dont OBS09, sont préservés. Le registre comporte 74 correspondances vérifiées pour 74 archives et aucun change actif ; aucune entrée provisoire ni nouvelle dépendance inter-change. Cette correction remplace le suivi provisoire écrit en parallèle.

## 4. Commandes et validations

| Vérification finale | Résultat |
| --- | --- |
| node --test tests/opencode-v2-client.test.mjs tests/model-policy.test.mjs | 35 réussis |
| Suite Node complète avec CAB_TEST_OPENCODE | 486 cas : 461 réussis, 0 échec, 25 non exécutés |
| Python DevOps -B -m unittest discover -s tests -p test_*.py | 73 réussis, 0 échec |
| Total unique des suites finales | 559 cas déclarés : 534 exécutés et réussis, 25 non exécutés |
| Node --check et Python py_compile | 72 fichiers, 0 erreur ; contrôles des deux lecteurs répétés après la dernière correction |
| Prévol natif conservé, lu avec le client corrigé | validé sans nouvelle génération, parent laissé sans modèle, assistant exact en medium, aucun outil |
| OpenSpec standard et strict avant archive | 16/16 chacun |
| openspec archive fix-native-v2-pagination-and-preflight-2-1-5 --yes | réussi, tâches complètes, trois specs synchronisées et quatre exigences modifiées |
| OpenSpec standard et strict après archive | 15/15 chacun |
| Encodage et intégrité | 76 fichiers concernés UTF-8/LF, copies broker identiques |

Les 25 cas non exécutés nécessitent le paquet historique 1.7.1 épinglé via CAB_TEST_ORIGINAL_PLUGIN, non fourni. Les scénarios courants et l’intégration native OpenCode isolée sont exécutés. Les journaux et résultats détaillés restent dans output/scm-2.1.5, ignoré par Git.

### Revalidation de clôture du 28 octobre 2026

La présente demande a constaté l’archive et ses six tâches déjà complètes après un travail parallèle. L’archivage n’a pas été rejoué. Le rapport existant est conservé et amendé ; les références encore actives et le suivi provisoire écrit en parallèle sont réconciliés avec CT14. Les trois fichiers modifiés par cette finalisation sont STATISTICS.md, openspec/BATCH_CODES.md et DEVELOPMENT_MAP.md ; aucun fichier source, scénario, tâche ou preuve SCM antérieure n’est modifié.

| Contrôle réexécuté | Résultat |
|---|---|
| Deux fichiers de tests ciblés V2 et modèle | 35/35 réussis, 100 % ; inclus dans la suite générale |
| Suite Node sans CAB_TEST_OPENCODE | 486 déclarés : 460 réussis, 26 non exécutés, aucun échec |
| Test OpenCode natif exécuté séparément dans une fixture isolée | 1/1 réussi ; remplace le cas ignoré correspondant dans la suite générale |
| Bilan Node distinct après rapprochement | 486 déclarés : 461 réussis (94,9 %), 25 non exécutés (5,1 %), aucun échec ; 100 % des cas exécutés réussis |
| Python DevOps unittest | 73/73 réussis, 100 %, aucun échec |
| Total distinct Node et Python | 559 déclarés : 534 réussis (95,5 %), 25 non exécutés (4,5 %), aucun échec ; 100 % des cas exécutés réussis |
| OpenSpec global standard et strict | 15/15 chacun, 100 %, aucun problème |
| Contrôle strict des archives | 74/74, 100 %, aucun problème |
| Trois copies broker distribuées | Identiques aux sources ; aucune modification durant cette finalisation |

Les 35 tests ciblés, la répétition de la suite et le test natif séparé ne sont pas additionnés comme de nouveaux cas : le seul cas natif auparavant ignoré est reclassé exécuté après son succès isolé. Les 25 cas restants exigent le paquet original 1.7.1 épinglé absent. La preuve native fournisseur consignée dans PREUVES-SCM.json reste une preuve historique, non rejouée ; le test OpenCode isolé ne génère aucune nouvelle réponse de fournisseur et ne qualifie aucune activation utilisateur. Les résultats de syntaxe 72/72 sont relus dans les preuves, pas présentés comme une nouvelle exécution de 72 contrôles.

## 5. Accès web et réseau

Recherche ou navigation web externe pendant la correction source : 0. Aucune nouvelle génération LLM réelle : la validation native relit le seul prévol technique déjà conservé. API loopback et processus de fixture utilisés, volume exhaustif N/A. L’API réelle a été lue avec le credential privé local sans en exposer la valeur. Les publications Git et la maintenance autorisée sont postérieures au présent rapport et doivent être vérifiées séparément.

## 6. Synthèse globale

Qualification source achevée et archive vérifiée. La pagination n’envoie plus order avec cursor. La provenance native n’est pas prise dans metadata : elle est établie sur un échange complet unique. La réponse assistant et le modèle de session doivent correspondre exactement au choix ; le parent ne reçoit aucun champ fabriqué. Les preuves héritées, dates, fin stop, absence d’outil et refus des contradictions restent contrôlés.

Les statistiques n’attestent pas encore l’activation ni le dialogue CAB complet. Ces phases sont exclues de la présente finalisation, explicitement demandée sans déploiement ni activation. Aucune purge, modification des RUN existants ou fermeture OpenCode n’est effectuée par cette finalisation. Le prévol antérieur est conservé pour audit et ne prouve pas à lui seul une décision CAB ou une exécution once de true. Aucun BLOCKER.md ou BLOCKERS.md n’est présent dans cette archive source achevée.

### Mesures de la finalisation

| Durée de la session de codage | Valeur |
|---|---|
| Début | N/A — borne de début exhaustive non collectée |
| Fin — après archivage | 28/10/2026 21:50:49 UTC+1 (Europe/Paris), relevé de fin avant cet amendement |
| Durée globale (pauses et attentes incluses) | N/A — borne de début absente |

| Mesure du quota Codex sur 7 jours | Horodatage du relevé | Quota utilisé | Réinitialisation |
|---|---|---:|---|
| Avant — début de session | N/A — relevé initial absent | N/A | N/A |
| Après — après archivage de la spécification | 28/10/2026 21:50:49 UTC+1 (Europe/Paris) | 36 % | 04/11/2026 07:45:53 UTC+1 (Europe/Paris) |
| Différence après − avant | — | N/A — relevé initial absent | — |

Source : get_usage_limits, bucket codex, fenêtre 10080 minutes. Le compte est partagé ; ce relevé ne constitue ni la consommation exclusive de CT14 ni une valeur en tokens ou en euros. Aucun début n’est reconstitué rétroactivement. La source native est utilisée directement, sans écrire de rendu /cgpt hors de la racine du projet.

État final vérifié : CT14 ARCHIVÉ, 6/6 tâches, rapport présent ; registre de 74 codes uniques, 74 archives et aucun change actif. Aucun déploiement, activation, publication ou opération Git exécuté dans cette finalisation.
