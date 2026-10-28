# Statistiques — CAB 2.1.5

## 1. Statistiques générales et décisions

Change fix-native-v2-pagination-and-preflight-2-1-5, 28 octobre 2026. Session directe SCM : un agent Codex gpt-6.1-sol, aucun sous-agent. Périmètre explicitement validé : pagination, preuve native, tests, archive, statistiques, publication, activation puis CAB test isolé. Ce rapport couvre la qualification source et sa clôture ; les effets opérationnels suivants exigent leur preuve propre.

Durée exhaustive, tokens, coût et temps humain : N/A, non instrumentés. Aucun quota ni compétence de statistiques de pilotage invoqué dans SCM. Aucun secret lu par le modèle ou copié dans les preuves.

## 2. Messages et outils

Lectures ciblées des cadrages, protocoles, cartographie, registre, OpenSpec et sources ; recherches rg ; éditions du lecteur, vérificateur, tests, documentation et versions ; commandes Node/Python et OpenSpec. Nombre exhaustif des messages et appels : N/A. Délégations : 0. Deux tests négatifs HTTP ont révélé une garde de concordance de session à conserver ; elle a été conservée et la suite finale repassée sans affaiblir ces tests.

Les essais intermédiaires ne sont pas additionnés aux totaux finaux. Les 35 tests ciblés appartiennent à la suite globale et ne sont pas comptés une deuxième fois.

## 3. Fichiers et documentation

Code comportemental : cgpt-approval-bridge-opencode-client.mjs et cgpt-approval-bridge-model-policy.mjs. Tests : opencode-v2-client.test.mjs, plus suites existantes. Passage de version : 65 fichiers courants alignés sur 2.1.5, sans modification des preuves runtime historiques ni des archives antérieures. Copies broker identiques. Le commit complet prescrit par SCM inclut aussi les contributions ACL antérieures déjà présentes (règles, annotations des propositions, registre et correctif historique du moniteur), sans les attribuer aux seules éditions de cette session.

PROJECT.md, TECHNICAL.md, BUILD.md, README.md et CHANGELOG.md décrivent le nouveau contrat ; références et commandes distribuées sont alignées. AGENTS.md 0.5 et DEVOPS.md sont inchangés par cette session. La matrice complète et les chemins sont dans [PREUVES-SCM.json](PREUVES-SCM.json).

DEVELOPMENT_MAP.md et openspec/BATCH_CODES.md sont exploitables et amendés uniquement pour le suivi de ce change. Les 72 codes existants sont conservés ; le change reste une entrée provisoire « code non attribué », avec liens mis à jour après archive. Aucun code ni dépendance inter-change inventé. ACL pourra attribuer ultérieurement un code. La cartographie constate 74 archives et aucun change actif à cette clôture.

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

## 5. Accès web et réseau

Recherche ou navigation web externe pendant la correction source : 0. Aucune nouvelle génération LLM réelle : la validation native relit le seul prévol technique déjà conservé. API loopback et processus de fixture utilisés, volume exhaustif N/A. L’API réelle a été lue avec le credential privé local sans en exposer la valeur. Les publications Git et la maintenance autorisée sont postérieures au présent rapport et doivent être vérifiées séparément.

## 6. Synthèse globale

Qualification source achevée et archive vérifiée. La pagination n’envoie plus order avec cursor. La provenance native n’est pas prise dans metadata : elle est établie sur un échange complet unique. La réponse assistant et le modèle de session doivent correspondre exactement au choix ; le parent ne reçoit aucun champ fabriqué. Les preuves héritées, dates, fin stop, absence d’outil et refus des contradictions restent contrôlés.

Les statistiques n’attestent pas encore l’activation ni le dialogue CAB complet. Ces phases restent à exécuter dans le seul contexte technique autorisé, sans purge, modification des RUN existants ou fermeture OpenCode. Le prévol antérieur est conservé pour audit et ne prouve pas à lui seul une décision CAB ou une exécution once de true. Aucun BLOCKER.md ou BLOCKERS.md n’est présent dans cette archive source achevée.
