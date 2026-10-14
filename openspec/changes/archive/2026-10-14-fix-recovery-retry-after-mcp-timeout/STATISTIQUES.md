# STATISTIQUES — fix-recovery-retry-after-mcp-timeout

Archive : `2026-10-14-fix-recovery-retry-after-mcp-timeout`. Projet : `/home/devops/datas/cab`.
Chat porteur : `01a13680-11af-7931-88b6-31b68c4b466e` ; mode **SCM direct**, sans agent OpenCode ni sondes de pilotage.
Autorisation : « Je valide le périmètre pour SCM », le 2026-10-14.
Intervalle mesuré : 2026-10-14T17:00:01.759324+02:00 → 2026-10-14T17:13:08.886268+02:00 (Europe/Paris).
Borne initiale : référence des fichiers après validation humaine ; borne finale : après archive et validation stricte, avant rédaction de ce rapport. Exploration antérieure et rédaction finale exclues. Durée : **787.127 secondes**, temps calendaire et non temps de service modèle.

### Agents de codage

| Agent | Version modèle | Fournisseur | Raisonnement | TTMT | Tokens/s | Temps de service |
| --- | --- | --- | --- | --- | --- | --- |
| Codex direct | N/A — non exposée | OpenAI | N/A — non mesuré | N/A — non mesuré | N/A — non mesuré | N/A — non mesuré |

Aucun orchestrateur distinct ni sous-agent. Muse/high concerne le RUN Pixs gelé, pas ce SCM direct ; aucun quota ou benchmark de ce RUN n'est attribué au correctif CAB.

## 1. Statistiques générales et décisions

- Version source : **1.0.2** ; plugin : **1.0.2+codex.20261014150408**.
- **8 tâches d'implémentation/validation sur 8 prouvées** avant archive ; obligations de clôture séparées pour éviter des coches anticipées.
- **1 archivage réussi**, aucune répétition ; **1 exigence ajoutée, 3 modifiées, 0 supprimée, 0 renommée**, dans deux capacités.
- OpenSpec : **9/9** avant archive, **8/8** après archive, strict et zéro échec.
- Décisions opérationnelles CAB et permissions OpenCode réelles de ce SCM : **0**. Assertions des tests synthétiques exclues de ce décompte.
- Décompte exhaustif des autorisations techniques de l'outil : **N/A — journal statistique non collecté** ; écritures hors Pixs et tests locaux isolés soumis au mécanisme d'autorisation de la plateforme.
- Tokens, coût, cache, quotas initiaux/finaux, variation de quota, compactages et surcharge statistique : **N/A — collecte non déclenchée en SCM ; aucune reconstruction**. Les quotas de compte seraient partagés avec d'autres chats, sans attribution exclusive possible ici.

| Suites finales sans addition des répétitions | Recensés | Réussis | Échoués | Non exécutés |
| --- | ---: | ---: | ---: | ---: |
| Node séquentiel | 128 | 127 | 0 | 1 |
| Python | 48 | 48 | 0 | 0 |
| **Total final** | **176** | **175** | **0** | **1** |

Taux de réussite des tests finaux exécutés : **175/175 = 100 %**. Test OpenCode natif optionnel non exécuté : variable CAB_TEST_OPENCODE non fournie, services et processus actifs préservés. Cette limite ne vaut pas qualification native ni déploiement.

## 2. Types de messages et d'outils

Nombre exhaustif de messages, appels d'outils, lectures, écritures et commandes de diagnostic : **N/A — session directe non instrumentée**. Sources des preuves : sorties natives de commandes dans ce chat, comparaison du contenu initial ciblé, tests HTTP, artefacts OpenSpec et empreintes. Aucun contenu de raisonnement interne reproduit.

Coordination autorisée avec le chat RUN CISMP1 persistant : information du périmètre source et de l'absence de maintenance partagée. Aucun agent de codage supplémentaire créé, aucune demande de reprise d'un autre RUN.

## 3. Fichiers modifiés

**40 fichiers existants modifiés**, dont 38 avant archive et 2 canons synchronisés par archive. Parmi ces 40 : 33 dans CAB, 7 protocoles dans les autres projets/templates. Comparaison de contenu indépendante de Git ; aucun état Git inspecté. Les chiffres de lignes ci-dessous proviennent de SequenceMatcher et décrivent la différence textuelle, pas le nombre d'opérations d'édition.

| Chemin relatif à CAB ou absolu hors CAB | Lignes ajoutées | Lignes retirées |
| --- | ---: | ---: |
| `.codex/commands/cab.md` | 19 | 4 |
| `BUILD.md` | 9 | 2 |
| `CHANGELOG.md` | 9 | 0 |
| `ORCHESTRATED_CODING.md` | 20 | 5 |
| `PROJECT.md` | 8 | 0 |
| `README.md` | 9 | 1 |
| `TECHNICAL.md` | 9 | 1 |
| `openspec/specs/codex-integration-distribution/spec.md` | 13 | 2 |
| `openspec/specs/controller-transport/spec.md` | 14 | 2 |
| `plugins/cab-approval-bridge/.codex-plugin/plugin.json` | 6 | 6 |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-controller.mjs` | 1 | 1 |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-healthcheck.mjs` | 1 | 1 |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-job-context.mjs` | 61 | 24 |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-sse-client.mjs` | 1 | 1 |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-prompts.py` | 1 | 1 |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-registry-lock.py` | 1 | 1 |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-reset.py` | 1 | 1 |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-runs.mjs` | 1 | 1 |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor-context.mjs` | 1 | 1 |
| `plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-supervisor.mjs` | 1 | 1 |
| `plugins/cab-approval-bridge/skills/approval-bridge/SKILL.md` | 20 | 4 |
| `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-controller.service` | 1 | 1 |
| `plugins/cab-approval-bridge/systemd/cgpt-approval-bridge-supervisor.service` | 1 | 1 |
| `pyproject.toml` | 1 | 1 |
| `src/cgpt_approval_bridge_journal.py` | 1 | 1 |
| `src/cgpt_approval_bridge_router.py` | 1 | 1 |
| `src/cgpt_approval_bridge_server.py` | 1 | 1 |
| `tests/concurrent-controller.test.mjs` | 1 | 1 |
| `tests/controller-service-distribution.test.mjs` | 27 | 12 |
| `tests/controller-session-recovery.test.mjs` | 90 | 0 |
| `tests/native-opencode.test.mjs` | 3 | 3 |
| `tests/test_crash_recovery.py` | 1 | 1 |
| `tests/test_session_reset.py` | 1 | 1 |
| `/home/devops/datas/diu/ORCHESTRATED_CODING.md` | 18 | 3 |
| `/home/devops/datas/pfd/ORCHESTRATED_CODING.md` | 18 | 3 |
| `/home/devops/datas/pixs-template/ORCHESTRATED_CODING.md` | 20 | 5 |
| `/home/devops/datas/pixs/ORCHESTRATED_CODING.md` | 20 | 5 |
| `/home/devops/datas/pldap/ORCHESTRATED_CODING.md` | 18 | 3 |
| `/home/devops/datas/template/ORCHESTRATED_CODING.md` | 20 | 5 |
| `/home/devops/datas/tools-codex/ORCHESTRATED_CODING.md` | 18 | 3 |

| Artefact de cette archive | État |
| --- | --- |
| `proposal.md` | Créé puis archivé ; titres structurels corrigés après avertissement non bloquant |
| `design.md` | Créé puis archivé ; bilan documentaire et limites consignés |
| `tasks.md` | Créé puis archivé ; huit tâches prouvées |
| `specs/controller-transport/spec.md` | Créé puis archivé |
| `specs/codex-integration-distribution/spec.md` | Créé puis archivé |
| `STATISTIQUES.md` | Rapport créé après archive |

**Total : 46 chemins livrés = 40 fichiers existants modifiés + 5 artefacts archivés + 1 rapport**. Aucun fichier source supprimé ; seuls les cinq artefacts du change ont été déplacés par archivage. Temporaires régénérables de test/compilation exclus. AGENTS.md, DEVOPS.md et la marketplace sont identiques au relevé initial. Hors CAB, seuls les sept ORCHESTRATED_CODING.md autorisés changent. Les clauses spécifiques des huit protocoles sont conservées ; leurs blocs retry sont identiques. Bilan documentaire par fichier dans design.md.

## 4. Commandes

| Exécution observée | Résultat |
| --- | --- |
| `node --test --test-name-pattern='retry accepte le refus par' tests/controller-session-recovery.test.mjs`, avant correctif | Échec attendu : 0 réussite, 2 échecs ; défaut reproduit |
| `node --test tests/controller-session-recovery.test.mjs`, premier passage après code | 31 réussites, 2 échecs d'attente de reason du gate ; tests corrigés sans changer le contrôleur |
| `node --test tests/controller-session-recovery.test.mjs tests/controller-service-distribution.test.mjs` | 49/49 réussis ; 5,169 s |
| `node --test tests/*.test.mjs` | 126 réussites, 1 échec de supervision temporelle, 1 non exécuté ; 9,274 s |
| `python3 -B -m unittest discover -s tests -p 'test_*.py' -v` | 48/48 réussis ; 3,621 s ; ResourceWarning HTTP 409 synthétique conservé au bilan |
| `node --test --test-concurrency=1 tests/*.test.mjs` | 127 réussites, 0 échec, 1 non exécuté ; 23,861 s ; mêmes assertions de supervision, test non modifié |
| `python3 -m py_compile` sur chaque Python modifié, cache temporaire explicite | 8 fichiers réussis |
| `node --check` sur chaque MJS modifié | 11 fichiers réussis |
| `openspec validate fix-recovery-retry-after-mcp-timeout --strict` | Réussi avant code/tests |
| `openspec validate --all --strict` avant archive, deux passages correspondant aux deltas puis à la revue finale | 9/9 à chaque passage |
| `openspec archive fix-recovery-retry-after-mcp-timeout --yes` | Réussi une seule fois, specs synchronisées ; avertissement de titres corrigé sans réarchiver |
| `openspec validate --all --strict` après archive | 8/8 réussis |
| Audit de contenu, UTF-8/LF, versions et protocoles | Réussi ; 8 blocs identiques, sources hors job-context ne changent que de version |

Runtimes utilisés : `/home/devops/node/current/bin/node`, `/home/devops/python/current/bin/python3`, `/home/devops/.local/npm/bin/openspec`, selon DEVOPS.md. Chaque invocation shell a un seul objectif ; aucune commande Git ni action sur les services actifs.

Les six exécutions de suites recensées totalisent **388 résultats de test = 381 réussites + 5 échecs intermédiaires + 2 non-exécutions** ; il s'agit d'exécutions répétées, pas de 388 tests distincts. Les 23 variantes de données du test négatif de polling sont des assertions dans un test, pas 23 méthodes supplémentaires. Les sorties non nulles ne sont ni masquées ni assimilées à des refus humains. Aucun test désactivé pour masquer l'échec parallèle.

## 5. Accès web

**0 accès web externe** dans cette phase SCM. Les tests loopback servent des fixtures synthétiques et ne sont pas des visites web. Aucun appel aux API CAB/OpenCode actives. Messages de coordination via l'API native de l'application autorisés par le développeur ; aucun message externe à des tiers.

## 6. Synthèse globale

Le correctif permet retry dans la même candidate après timeout MCP suivi d'un REJECTED par polling corrélé à la décision locale rejected non consommée. Timeout seul, PENDING seul, erreur générique, identité/opération divergente, décision perdue ou approuvée, consommation, effet natif et préfixe historique altéré restent bloquants. Un nouvel essai exige des identifiants neufs et complete prouvé ; le superviseur reste gelé jusque-là.

Huit protocoles synchronisés, skill/commande alignés et briques source incrémentées de 0.0.1. Schémas, protocole MCP, dépendances et effets métier inchangés. Les limites observées de test parallèle et le test natif non exécuté sont consignés ; aucune qualification sur services actifs n'est revendiquée.

État de ce SCM : **correctif source validé, change archivé et rapport publié**. Mise en service coordonnée et reprise de CISMP2 : **non exécutées, distinctes du périmètre validé**. Le job, la candidate, la réservation et les preuves du RUN gelé ne sont pas modifiés. Les contrôles du rapport (présence, six sections, totaux, UTF-8/LF) sont effectués après écriture avant restitution.
