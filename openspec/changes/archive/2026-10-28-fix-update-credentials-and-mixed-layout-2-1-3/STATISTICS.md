# Statistiques — patch CAB 2.1.3

## 1. Statistiques générales et décisions

- Change : `fix-update-credentials-and-mixed-layout-2-1-3`.
- Date : 28 octobre 2026. Session directe SCM, un seul change ; aucune session pilotée ni sonde de pilotage.
- Agent : Codex, modèle gpt-6.1-sol. Nombre d’agents intervenus : **1** ; aucun sous-agent ni agent OpenCode de codage.
- Autorité : validation explicite du patch 2.1.3, y compris installation mixte, tests, archivage et statistiques. OpenCode démarré par le développeur pour les tests.
- État : **change achevé et archivé**, quatre spécifications synchronisées, deux exigences ajoutées et quatre modifiées. Preuves dans [PREUVES-SCM.json](PREUVES-SCM.json) et [tasks.md](tasks.md).
- La source OPENCODE_PASSWORD est facultative et propre au projet. Elle a été traitée localement sans valeur ni empreinte dans les sorties. Le credential temporaire du test a été supprimé. Aucun project.env n’a été modifié.
- Tokens, coût, décompte exact des échanges et temps humain : **N/A**, aucune télémétrie directe exhaustive disponible. Quotas non interrogés dans cette session SCM.

## 2. Types de messages et d’outils

| Catégorie | Usage observé | Nombre exhaustif |
| --- | --- | --- |
| Messages développeur | validation, précision sur project.env, disponibilité OpenCode | N/A : pas de relevé instrumenté |
| Lectures/recherches | sources, cadrages, spécifications, fichiers de tests | N/A : pas de compteur exhaustif |
| Écritures | change, correctif, tests, version, documentation, preuves et rapport | N/A : pas de compteur exhaustif |
| Exécutions | syntaxe, tests Node/Python, OpenSpec, raccord natif | voir commandes et résultats ci-dessous |
| Délégations / sondes CAB / quota | aucune | 0 |

Les essais intermédiaires ne sont pas additionnés aux totaux finaux. Deux fixtures de permissions puis des divergences documentaires de distribution ont été corrigées sans affaiblir les gardes de production. Les noms des rapports sont alignés sur AGENTS.md et SCM ; les anciennes archives restent intactes.

## 3. Fichiers modifiés

| Groupe | Fichiers ou portée | Objet |
| --- | --- | --- |
| Code | `cgpt-approval-bridge-update.mjs`, nouveau `cgpt-approval-bridge-update-credential.mjs` | prévol/provisionnement explicite, installation mixte et diagnostics |
| Tests | `active-component-update.test.mjs`, `controller-service-distribution.test.mjs`, nouveau `update-credential.test.mjs` | refus sûrs, confidentialité, repli, CLI, cohérence documentaire |
| Distribution | pyproject, sources broker et copies distribuées, modules et fixtures versionnés, deux manifests, unités et trois commandes | base commune 2.1.3 ; origine broker 2.1.2 conservée |
| Documentation | PROJECT, TECHNICAL, BUILD, README, CHANGELOG, version du protocole et références/skills distribués | option explicite, mode mixte, erreurs et rapport canonique |
| OpenSpec | ce dossier d’archive et quatre specs canoniques | exigences, conception, tâches et preuves |

Le passage initial de version a concerné 71 fichiers courants, sans archive historique. Le relevé Git complet autorisé après archivage constate **232 chemins** avant staging : **81 modifiés, 55 supprimés et 96 non suivis**. Il inclut des changements antérieurs à cette session (dont des renommages de rapports et d’autres archives) ; ce total ne mesure pas les seules éditions du patch. Le total exhaustif des chemins du commit et leur attribution exclusive sont **N/A à ce stade**, faute de relevé Git initial autorisé ; le bilan du commit distinct porte sur l’état complet du projet. DEVOPS.md, AGENTS.md, les configurations et les données métier n’ont pas été modifiés par cette session.

## 4. Commandes et validations

| Vérification finale | Résultat |
| --- | --- |
| Syntaxe Node `--check` et Python `py_compile` avec les runtimes DEVOPS | **73 fichiers, 0 erreur** |
| Suite `node --test tests/*.test.mjs`, avec CAB_TEST_OPENCODE désignant le binaire DEVOPS | **478 tests : 453 réussis, 0 échec, 25 non exécutés** |
| Suite Python `-B -m unittest discover -s tests -p test_*.py` | **73 réussis, 0 échec** |
| Totaux des suites finales | **551 cas déclarés : 526 exécutés et réussis, 25 non exécutés, 0 échec** |
| Test natif isolé OpenCode 2.2.0 | réussi, trois sessions de fixture et un broker source 2.1.3 ; processus et données de fixture nettoyés |
| Raccord réel au processus OpenCode fourni par le développeur | GET /api/info et GET /api/location réussis, version 2.2.0, même processus, credential temporaire supprimé |
| OpenSpec ciblé strict | réussi |
| OpenSpec global standard puis strict avant archive | **16/16** pour chacun |
| OpenSpec global standard puis strict après archive | **15/15** pour chacun, après condensation sans changement de sens d’une exigence signalée trop longue lors de la synchronisation |
| Encodage et intégrité | **161 fichiers UTF-8/LF**, copies broker identiques |
| `openspec archive fix-update-credentials-and-mixed-layout-2-1-3 --yes` | réussi ; tâches complètes et quatre specs synchronisées |

Les 25 cas non exécutés exigent le paquet historique 1.7.1 épinglé via CAB_TEST_ORIGINAL_PLUGIN, non fourni. Ils concernent les profils historiques de maintenance ; les scénarios courants du patch (credential, mixed layout, diagnostics et rollback) ont été exécutés. Le total 526 ne les présente pas comme réussis. Les journaux détaillés des suites restent dans output/scm-2.1.3, ignoré par Git.

## 5. Accès web et réseau

- Navigation web externe, recherche web, messages à des tiers et appels LLM : **0 pendant cette phase SCM**.
- API réelle du processus OpenCode du développeur : **deux lectures HTTP loopback**, GET /api/info et GET /api/location. Aucune reconnexion du broker ni commande métier.
- Serveurs et processus natifs de fixture : utilisés par les tests ; volume d’appels **N/A**, non instrumenté globalement. Ces appels ne sont pas additionnés aux deux lectures du raccord réel.
- Publication Git : étape postérieure à l’archive et au présent rapport, conditionnée aux variables propres à chaque destination. Son résultat figure dans le bilan de clôture, sans secret.

## 6. Synthèse globale

Le patch source 2.1.3 est qualifié et archivé. Il refuse le credential manquant avant coupure, peut provisionner explicitement le credential à partir de la seule variable du projet, conserve un credential différent, accepte la disposition mixte sans convertir le broker source en lien et conserve les causes systemd après repli.

La revue documentaire est détaillée par fichier dans PREUVES-SCM.json : les cadrages, README et CHANGELOG ont été ajustés ; AGENTS et DEVOPS restent inchangés avec justification. Les deltas complets conservent les scénarios des exigences modifiées. Aucun fichier de blocage ne figure dans cette archive.

**Limites :** aucune installation réelle de 2.1.3 ou remise en service des trois unités utilisateur n’est démontrée par ce travail SCM. L’erreur 243 observée avant le patch reste un constat runtime distinct. Les profils historiques dépendant du paquet 1.7.1 restent non exécutés. Les réussites de fixtures et d’authentification ne valent ni activation de service ni livraison d’un projet piloté.
