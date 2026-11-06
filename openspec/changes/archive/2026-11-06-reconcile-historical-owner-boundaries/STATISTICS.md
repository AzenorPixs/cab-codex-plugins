# Statistiques du change

### Agents de codage — relevé scm-cab-owner-remediation-20261106

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | N/A | N/A |

### Agents orchestrateurs — relevé scm-cab-owner-remediation-20261106

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

### Relevé scm-cab-owner-remediation-20261106

Change archivé ; mesures limitées aux preuves de ce relevé.

Portée : cumulative.

Agent coder : codex, modèle N/A, raisonnement N/A.

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Durée globale | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Durée hors pauses et attentes | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tokens d’entrée | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tokens de sortie | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tokens de raisonnement | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tokens de cache lus | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tokens de cache écrits | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Total natif des tokens | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Compactions achevées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Demandes d’autorisation distinctes | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Demandes approuvées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Demandes refusées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Demandes expirées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Demandes annulées | N/A | Mesure absente ou périmètre exhaustif non identifiable |

#### Décisions et garanties

| Décision | Preuve | Limite |
| --- | --- | --- |
| Ancienne génération/SID | Retraite seule PREPARED/REJECTED testée | Aucun nouveau droit/once ; décision et identité conservées |
| Séquence native de rejet | Parentés, rejet exact, stop, utilisateur suivant, deux frontières | Suffixe conservé et non déclaré sans effet |
| Reboot après timeout | Époque noyau et deux sondes du SID courant | Aucun exit historique inventé |
| DEVOPS hvp1 | Demande explicite du développeur | Version locale incluse au commit complet SCM |

Session SCM directe : Codex est le codeur ; aucun orchestrateur ou agent OpenCode de production n’a été créé pour CAB. Les propriétaires PA01/C12 ont gardé leurs propres RUN et décisions.

Suivi initialisé au début de cette reprise avec blank() du module CAB ; borne native de début connue. Les explorations et métriques des anciennes sessions ne sont pas reconstruits rétroactivement. Les durées finales, tokens/cache, quotas, coûts et compteurs de messages/outils non exposés restent inconnus.

Périmètre autonome validé par le développeur : trois remédiations historiques, OpenSpec, code/tests/docs, incrément2.3.3, CI/CD puis CABU. Publication et activation postérieures au présent relevé source restent à vérifier.

## 2. Types de messages et d’outils

### Relevé scm-cab-owner-remediation-20261106

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Messages des codeurs | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Messages utilisateur | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Messages assistant | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels d’outils des codeurs | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels terminés | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Erreurs techniques | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels en cours | N/A | Mesure absente ou périmètre exhaustif non identifiable |

Les compteurs natifs exhaustifs des outils/messages de cette conversation ne sont pas exposés. Les consultations de coordination ont été filtrées localement ; aucun secret ni état privé de production n’a été lu manuellement. Aucune télémétrie de pilotage n’a été lancée en SCM direct.

## 3. Fichiers modifiés

### Relevé scm-cab-owner-remediation-20261106

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Écritures effectivement exécutées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Fichiers distincts touchés par change | N/A | Mesure absente ou périmètre exhaustif non identifiable |

#### Fichiers et familles contrôlés

| Famille | Chemins réels | Modification |
| --- | --- | --- |
| Runtime | /home/devops/datas/cab/plugins/cab-approval-bridge/scripts | Contrôleur, coordination, contexte, preuve native et port ; autres versions couplées |
| Tests | /home/devops/datas/cab/tests | 139 fichiers runtime/tests figés ; scénarios historiques, refus et reprises |
| Contrat | /home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/historical-owner-boundaries.md | Référence ciblée, routage skill/plugin/commande et empreintes |
| OpenSpec | /home/devops/datas/cab/openspec/changes/archive/2026-11-06-reconcile-historical-owner-boundaries | Spécifications, tâches, conception, qualification et archive |
| Cadrages | /home/devops/datas/cab | PROJECT/TECHNICAL/BUILD/README/CHANGELOG et entrée ciblée de cartographie |
| Machine | /home/devops/datas/cab/DEVOPS.md | Différence locale préexistante conservée et destinée au commit |
| Inventaire pré-rapport | 111 chemins nouveaux/modifiés observés par Git | Exclut le présent rapport ; ne remplace pas un total de tous les fichiers lus |

## 4. Commandes

### Relevé scm-cab-owner-remediation-20261106

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Commandes exécutées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Commandes réussies | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Commandes en échec | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tests exécutés dans le bilan final | 1533 | QUALIFICATION.md et journaux de qualification finale ; web hors transport Git/API locale |
| Tests finaux réussis | 1533 | QUALIFICATION.md et journaux de qualification finale ; web hors transport Git/API locale |
| Tests finaux échoués | 0 | QUALIFICATION.md et journaux de qualification finale ; web hors transport Git/API locale |
| Fichiers ayant passé un contrôle syntaxique | 139 | QUALIFICATION.md et journaux de qualification finale ; web hors transport Git/API locale |
| Validations OpenSpec standard réussies | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Validations OpenSpec standard échouées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Validations OpenSpec strictes réussies | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Validations OpenSpec strictes échouées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tâches OpenSpec prouvées et terminées | 12 | QUALIFICATION.md et journaux de qualification finale ; web hors transport Git/API locale |

#### Commandes de qualification finales

| Commande | Résultat | Preuve locale |
| --- | --- | --- |
| node --test --test-concurrency=1 tests/*.test.mjs | 1370 cas ;1339 PASS/0 FAIL/31 SKIP | output/scm-owner-remediation/release-node.tap |
| python3 -B -m unittest discover -s tests -p test_*.py | 193 PASS | output/scm-owner-remediation/release-python.log |
| CAB_TEST_OPENCODE=/home/devops/.opencode/bin/opencode node --test tests/native-opencode-codemode.test.mjs | 1 PASS ; mode isolé réel | output/scm-owner-remediation/release-native.tap |
| node --check / py_compile | 112JS+27Python valides | output/scm-owner-remediation/release-syntax.json |
| openspec validate --all --strict | 22 éléments avant archive,21 après, PASS | output/scm-owner-remediation/release-openspec.log et postarchive-openspec.log |
| openspec archive reconcile-historical-owner-boundaries --yes --skip-specs | Archivage réussi, canons déjà synchronisés | Archive présente avec tâches source complètes |

Les campagnes intermédiaires ne sont pas ajoutées aux1533tests finaux distincts. Les échecs réels de comparaison, de date volatile et les corrections de fixtures sont explicités dans QUALIFICATION.md ; les anciens codes de retour restent dans leurs journaux.

Les31cas ignorés concernent le mode générique ; un de ces cas a été exécuté séparément avec OpenCode réel. Les21tests métier PA01 ne sont pas des tests CAB et ne sont pas ajoutés à ce total.

## 5. Accès web

### Relevé scm-cab-owner-remediation-20261106

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Appels aux outils web | 0 | QUALIFICATION.md et journaux de qualification finale ; web hors transport Git/API locale |
| Appels web réussis | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Recherches web | 0 | QUALIFICATION.md et journaux de qualification finale ; web hors transport Git/API locale |
| Consultations web | 0 | QUALIFICATION.md et journaux de qualification finale ; web hors transport Git/API locale |

Aucun outil de recherche/consultation Web n’a été invoqué dans cette reprise SCM. Les transferts Git et appels API loopback de coordination sont distingués des consultations Web ; aucune adresse contenant un secret n’est restituée.

## 6. Synthèse globale

### Relevé scm-cab-owner-remediation-20261106

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Écritures de fichiers | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Commandes | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Web | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Autres outils | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Total | N/A | Mesure absente ou périmètre exhaustif non identifiable |

#### Remédiations des sessions consommatrices

| Session | État observé | Limite |
| --- | --- | --- |
| PA01 | Deux accès libérés, reprise produit et21tests linker PASS après révision10700 correcte | T4 reste décochée ;21tests synthétiques sans liaison réelle |
| C12 | Cinq séquences natives réelles qualifiées en simulation lecture seule | Aucun retrait ou probe réel avant activation vérifiée |
| C12 .03 | Timeout unique prouvé et reboot postérieur constaté | Accès/once protégés jusqu’à deux sondes et réconciliation propriétaire |
| Livraison CAB2.3.3 | Source qualifiée et archivée | DIU puis CABU doivent encore produire leurs preuves propres |

CHANGE est exécuté par le module SGS CAB3.3 via stdin, sans fichier de preuves partagé. DELTA est distinct ; un global incompatible est conservé sans REBUILD automatique. Le global Pixs reste hors périmètre conformément à l’instruction de C12.

Aucun RUN CAB de production n’a été créé pour ce SCM direct ; son nettoyage natif/états CAB n’est pas applicable. Les runtimes et protections des sessions consommatrices sont conservés pour leur reprise propriétaire.


<!-- CAB_SGS_SESSIONS_V1
{
  "format": "cab-sgs-1",
  "sessions": [
    {
      "agent_details": [
        {
          "model": "N/A",
          "provider": "N/A",
          "reasoning": "N/A",
          "role": "coder",
          "service_percent": "N/A",
          "throughput": "N/A",
          "ttmt": "N/A",
          "version": "N/A"
        }
      ],
      "contribution": {
        "agents": [
          {
            "agent": "codex",
            "model": "N/A",
            "reasoning": "N/A",
            "role": "coder"
          }
        ],
        "bounds": {
          "end": null,
          "start": "1793940756"
        },
        "breakdowns": {},
        "costs": {},
        "metrics": {
          "commands": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "commands_failure": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "commands_success": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "compactions": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "domain_command": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "domain_other": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "domain_total": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "domain_web": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "domain_write": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "duration": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "files_touched": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "messages": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "messages_assistant": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "messages_user": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "net_duration": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "openspec_standard_failure": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "openspec_standard_success": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "openspec_strict_failure": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "openspec_strict_success": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "permissions": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "permissions_approved": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "permissions_cancelled": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "permissions_expired": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "permissions_rejected": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "syntax_files": {
            "evidence": [
              {
                "line": 1,
                "note": "QUALIFICATION.md et journaux de qualification finale ; web hors transport Git/API locale"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "139"
          },
          "tasks": {
            "evidence": [
              {
                "line": 1,
                "note": "QUALIFICATION.md et journaux de qualification finale ; web hors transport Git/API locale"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "12"
          },
          "tests": {
            "evidence": [
              {
                "line": 1,
                "note": "QUALIFICATION.md et journaux de qualification finale ; web hors transport Git/API locale"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "1533"
          },
          "tests_failure": {
            "evidence": [
              {
                "line": 1,
                "note": "QUALIFICATION.md et journaux de qualification finale ; web hors transport Git/API locale"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "0"
          },
          "tests_success": {
            "evidence": [
              {
                "line": 1,
                "note": "QUALIFICATION.md et journaux de qualification finale ; web hors transport Git/API locale"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "1533"
          },
          "tokens_cache_read": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tokens_cache_write": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tokens_input": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tokens_output": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tokens_reasoning": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tokens_total": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tools": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tools_completed": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tools_error": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tools_running": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "web": {
            "evidence": [
              {
                "line": 1,
                "note": "QUALIFICATION.md et journaux de qualification finale ; web hors transport Git/API locale"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "0"
          },
          "web_open": {
            "evidence": [
              {
                "line": 1,
                "note": "QUALIFICATION.md et journaux de qualification finale ; web hors transport Git/API locale"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "0"
          },
          "web_search": {
            "evidence": [
              {
                "line": 1,
                "note": "QUALIFICATION.md et journaux de qualification finale ; web hors transport Git/API locale"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "0"
          },
          "web_success": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "writes": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          }
        },
        "performance": [],
        "proof_ids": [
          "release-source-freeze-d7d25bd797f8",
          "release-node-1370",
          "release-python-193",
          "release-native-1"
        ],
        "sessions": [
          "scm-cab-owner-remediation-20261106"
        ],
        "web_calls": []
      },
      "details": {
        "1": [],
        "2": [],
        "3": [],
        "4": [],
        "5": [],
        "6": []
      },
      "id": "scm-cab-owner-remediation-20261106",
      "input_sha256": "622a13e366d63681d13714ac793015159235d81eed494f6c253ddab0a28e0240",
      "notes": {
        "1": [
          "Session SCM directe : Codex est le codeur ; aucun orchestrateur ou agent OpenCode de production n’a été créé pour CAB. Les propriétaires PA01/C12 ont gardé leurs propres RUN et décisions.",
          "Suivi initialisé au début de cette reprise avec blank() du module CAB ; borne native de début connue. Les explorations et métriques des anciennes sessions ne sont pas reconstruits rétroactivement. Les durées finales, tokens/cache, quotas, coûts et compteurs de messages/outils non exposés restent inconnus.",
          "Périmètre autonome validé par le développeur : trois remédiations historiques, OpenSpec, code/tests/docs, incrément2.3.3, CI/CD puis CABU. Publication et activation postérieures au présent relevé source restent à vérifier."
        ],
        "2": [
          "Les compteurs natifs exhaustifs des outils/messages de cette conversation ne sont pas exposés. Les consultations de coordination ont été filtrées localement ; aucun secret ni état privé de production n’a été lu manuellement. Aucune télémétrie de pilotage n’a été lancée en SCM direct."
        ],
        "3": [],
        "4": [
          "Les campagnes intermédiaires ne sont pas ajoutées aux1533tests finaux distincts. Les échecs réels de comparaison, de date volatile et les corrections de fixtures sont explicités dans QUALIFICATION.md ; les anciens codes de retour restent dans leurs journaux.",
          "Les31cas ignorés concernent le mode générique ; un de ces cas a été exécuté séparément avec OpenCode réel. Les21tests métier PA01 ne sont pas des tests CAB et ne sont pas ajoutés à ce total."
        ],
        "5": [
          "Aucun outil de recherche/consultation Web n’a été invoqué dans cette reprise SCM. Les transferts Git et appels API loopback de coordination sont distingués des consultations Web ; aucune adresse contenant un secret n’est restituée."
        ],
        "6": [
          "CHANGE est exécuté par le module SGS CAB3.3 via stdin, sans fichier de preuves partagé. DELTA est distinct ; un global incompatible est conservé sans REBUILD automatique. Le global Pixs reste hors périmètre conformément à l’instruction de C12.",
          "Aucun RUN CAB de production n’a été créé pour ce SCM direct ; son nettoyage natif/états CAB n’est pas applicable. Les runtimes et protections des sessions consommatrices sont conservés pour leur reprise propriétaire."
        ]
      },
      "scope": "cumulative",
      "state": "archived",
      "tables": {
        "1": [
          {
            "columns": [
              "Décision",
              "Preuve",
              "Limite"
            ],
            "rows": [
              [
                "Ancienne génération/SID",
                "Retraite seule PREPARED/REJECTED testée",
                "Aucun nouveau droit/once ; décision et identité conservées"
              ],
              [
                "Séquence native de rejet",
                "Parentés, rejet exact, stop, utilisateur suivant, deux frontières",
                "Suffixe conservé et non déclaré sans effet"
              ],
              [
                "Reboot après timeout",
                "Époque noyau et deux sondes du SID courant",
                "Aucun exit historique inventé"
              ],
              [
                "DEVOPS hvp1",
                "Demande explicite du développeur",
                "Version locale incluse au commit complet SCM"
              ]
            ],
            "title": "Décisions et garanties"
          }
        ],
        "2": [],
        "3": [
          {
            "columns": [
              "Famille",
              "Chemins réels",
              "Modification"
            ],
            "rows": [
              [
                "Runtime",
                "/home/devops/datas/cab/plugins/cab-approval-bridge/scripts",
                "Contrôleur, coordination, contexte, preuve native et port ; autres versions couplées"
              ],
              [
                "Tests",
                "/home/devops/datas/cab/tests",
                "139 fichiers runtime/tests figés ; scénarios historiques, refus et reprises"
              ],
              [
                "Contrat",
                "/home/devops/datas/cab/plugins/cab-approval-bridge/skills/approval-bridge/references/historical-owner-boundaries.md",
                "Référence ciblée, routage skill/plugin/commande et empreintes"
              ],
              [
                "OpenSpec",
                "/home/devops/datas/cab/openspec/changes/archive/2026-11-06-reconcile-historical-owner-boundaries",
                "Spécifications, tâches, conception, qualification et archive"
              ],
              [
                "Cadrages",
                "/home/devops/datas/cab",
                "PROJECT/TECHNICAL/BUILD/README/CHANGELOG et entrée ciblée de cartographie"
              ],
              [
                "Machine",
                "/home/devops/datas/cab/DEVOPS.md",
                "Différence locale préexistante conservée et destinée au commit"
              ],
              [
                "Inventaire pré-rapport",
                "111 chemins nouveaux/modifiés observés par Git",
                "Exclut le présent rapport ; ne remplace pas un total de tous les fichiers lus"
              ]
            ],
            "title": "Fichiers et familles contrôlés"
          }
        ],
        "4": [
          {
            "columns": [
              "Commande",
              "Résultat",
              "Preuve locale"
            ],
            "rows": [
              [
                "node --test --test-concurrency=1 tests/*.test.mjs",
                "1370 cas ;1339 PASS/0 FAIL/31 SKIP",
                "output/scm-owner-remediation/release-node.tap"
              ],
              [
                "python3 -B -m unittest discover -s tests -p test_*.py",
                "193 PASS",
                "output/scm-owner-remediation/release-python.log"
              ],
              [
                "CAB_TEST_OPENCODE=/home/devops/.opencode/bin/opencode node --test tests/native-opencode-codemode.test.mjs",
                "1 PASS ; mode isolé réel",
                "output/scm-owner-remediation/release-native.tap"
              ],
              [
                "node --check / py_compile",
                "112JS+27Python valides",
                "output/scm-owner-remediation/release-syntax.json"
              ],
              [
                "openspec validate --all --strict",
                "22 éléments avant archive,21 après, PASS",
                "output/scm-owner-remediation/release-openspec.log et postarchive-openspec.log"
              ],
              [
                "openspec archive reconcile-historical-owner-boundaries --yes --skip-specs",
                "Archivage réussi, canons déjà synchronisés",
                "Archive présente avec tâches source complètes"
              ]
            ],
            "title": "Commandes de qualification finales"
          }
        ],
        "5": [],
        "6": [
          {
            "columns": [
              "Session",
              "État observé",
              "Limite"
            ],
            "rows": [
              [
                "PA01",
                "Deux accès libérés, reprise produit et21tests linker PASS après révision10700 correcte",
                "T4 reste décochée ;21tests synthétiques sans liaison réelle"
              ],
              [
                "C12",
                "Cinq séquences natives réelles qualifiées en simulation lecture seule",
                "Aucun retrait ou probe réel avant activation vérifiée"
              ],
              [
                "C12 .03",
                "Timeout unique prouvé et reboot postérieur constaté",
                "Accès/once protégés jusqu’à deux sondes et réconciliation propriétaire"
              ],
              [
                "Livraison CAB2.3.3",
                "Source qualifiée et archivée",
                "DIU puis CABU doivent encore produire leurs preuves propres"
              ]
            ],
            "title": "Remédiations des sessions consommatrices"
          }
        ]
      }
    }
  ]
}
-->
