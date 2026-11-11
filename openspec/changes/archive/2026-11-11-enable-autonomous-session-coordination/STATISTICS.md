# Statistiques du change

### Agents de codage — relevé SCM-coordination-20261111-cab

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-6.1-sol | N/A | N/A | medium | N/A | N/A | N/A |

### Agents orchestrateurs — relevé SCM-coordination-20261111-cab

| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens | Temps de service (% total) |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | N/A | N/A |

## 1. Statistiques générales et décisions

### Relevé SCM-coordination-20261111-cab

Change archivé ; mesures limitées aux preuves de ce relevé.

Portée : cumulative.

Agent coder : codex, modèle gpt-6.1-sol, raisonnement medium.

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Durée globale | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Durée hors pauses et attentes | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tokens d’entrée | 50287820 | Annexe native gelée native-sgs.json : metrics.tokens_input ; coverage native |
| Tokens de sortie | 190751 | Annexe native gelée native-sgs.json : metrics.tokens_output ; coverage native |
| Tokens de raisonnement | 112473 | Annexe native gelée native-sgs.json : metrics.tokens_reasoning ; coverage native |
| Tokens de cache lus | 50085632 | Annexe native gelée native-sgs.json : metrics.tokens_cache_read ; coverage native |
| Tokens de cache écrits | 0 | Annexe native gelée native-sgs.json : metrics.tokens_cache_write ; coverage native |
| Total natif des tokens | 50478571 | Annexe native gelée native-sgs.json : metrics.tokens_total ; coverage native |
| Compactions achevées | 1 | Annexe native gelée native-sgs.json : metrics.compactions ; coverage native |
| Demandes d’autorisation distinctes | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Demandes approuvées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Demandes refusées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Demandes expirées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Demandes annulées | N/A | Mesure absente ou périmètre exhaustif non identifiable |

| Élément documenté | Valeur | Preuve |
| --- | --- | --- |
| Mandat | SCM validé ; autonomie codeur et coordination ; CI/CD puis CABU autorisés | Décisions développeur du chat01a1c9e3-bed3-7a52-abca-0ea08eaa71d9 |

## 2. Types de messages et d’outils

### Relevé SCM-coordination-20261111-cab

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Messages des codeurs | 21 | Annexe native gelée native-sgs.json : metrics.messages ; coverage native |
| Messages utilisateur | 4 | Annexe native gelée native-sgs.json : metrics.messages_user ; coverage native |
| Messages assistant | 17 | Annexe native gelée native-sgs.json : metrics.messages_assistant ; coverage native |
| Appels d’outils des codeurs | 150 | Annexe native gelée native-sgs.json : metrics.tools ; coverage native |
| Appels terminés | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Erreurs techniques | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels en cours | N/A | Mesure absente ou périmètre exhaustif non identifiable |

| Élément documenté | Valeur | Preuve |
| --- | --- | --- |
| Rôle | Codex en codage direct ; aucun orchestrateur fictif | Identité native SGS observée |

## 3. Fichiers modifiés

### Relevé SCM-coordination-20261111-cab

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Écritures effectivement exécutées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Fichiers distincts touchés par change | N/A | Mesure absente ou périmètre exhaustif non identifiable |

| Élément documenté | Valeur | Preuve |
| --- | --- | --- |
| Validation | CAB : Python291 ; runtime Node169 ; CABU127 ; SSH réel natif et navigateurs réussis. Prompts : contrôles documentaires et OpenSpec strict réussis. Campagnes recouvrantes, total unique N/A. | VALIDATION.md et journaux output/scm/coordination-20261111 |

## 4. Commandes

### Relevé SCM-coordination-20261111-cab

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Commandes exécutées | 119 | Annexe native gelée native-sgs.json : metrics.commands ; coverage native |
| Commandes réussies | 107 | Annexe native gelée native-sgs.json : metrics.commands_success ; coverage native |
| Commandes en échec | 12 | Annexe native gelée native-sgs.json : metrics.commands_failure ; coverage native |
| Tests exécutés dans le bilan final | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tests finaux réussis | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tests finaux échoués | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Fichiers ayant passé un contrôle syntaxique | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Validations OpenSpec standard réussies | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Validations OpenSpec standard échouées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Validations OpenSpec strictes réussies | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Validations OpenSpec strictes échouées | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Tâches OpenSpec prouvées et terminées | N/A | Mesure absente ou périmètre exhaustif non identifiable |

| Élément documenté | Valeur | Preuve |
| --- | --- | --- |
| Coûts et tokens absents | N/A pour toute mesure sans couverture native complète ; aucun coût estimé | Annexe native SGS uniquement pour CAB |

## 5. Accès web

### Relevé SCM-coordination-20261111-cab

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Appels aux outils web | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Appels web réussis | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Recherches web | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Consultations web | N/A | Mesure absente ou périmètre exhaustif non identifiable |

| Élément documenté | Valeur | Preuve |
| --- | --- | --- |
| Livraison | Archivage source réussi ; livraison DIU et activation CABU traitées ensuite, résultats dans reçus séparés | openspec/changes/archive/2026-11-11-enable-autonomous-session-coordination/VALIDATION.md |

## 6. Synthèse globale

### Relevé SCM-coordination-20261111-cab

| Mesure | Valeur | Preuve ou limite |
| --- | --- | --- |
| Écritures de fichiers | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Commandes | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Web | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Autres outils | N/A | Mesure absente ou périmètre exhaustif non identifiable |
| Total | N/A | Mesure absente ou périmètre exhaustif non identifiable |

| Élément documenté | Valeur | Preuve |
| --- | --- | --- |
| Limites | Qualification isolée distincte des tests métier Pixs ; SID/RUN/job/mandat/r23 et bail013 conservés en PAUSE | output/scm/coordination-20261111/pixs-before-cabu.json |


### Télémétrie native et chronologie des modèles

| Rôle | Agent | Session | Mode |
| --- | --- | --- | --- |
| coder | codex | 01a1c9e3-bed3-7a52-abca-0ea08eaa71d9 | direct |

| Mesure | Valeur | Couverture |
| --- | --- | --- |
| command_wall_seconds | 378.699 | native |
| commands | 119 | native |
| commands_failure | 12 | native |
| commands_success | 107 | native |
| compactions | 1 | native |
| duration_seconds | 2577.378 | native |
| files_touched | 2 | partial |
| message_span_seconds | 30.272 | native |
| messages | 21 | native |
| messages_assistant | 17 | native |
| messages_llm | 30 | native |
| messages_user | 4 | native |
| reasoning_span_seconds | 4508.312 | native |
| tokens_cache_read | 50085632 | native |
| tokens_cache_write | 0 | native |
| tokens_input | 50287820 | native |
| tokens_output | 190751 | native |
| tokens_reasoning | 112473 | native |
| tokens_total | 50478571 | native |
| tool_wall_seconds | 4.293 | native |
| tools | 150 | native |
| tools_llm | 102 | native |
| writes | 2 | partial |

| Début | Fin | Modèle | Fournisseur | Raisonnement |
| --- | --- | --- | --- | --- |
| 2026-11-11T11:01:58.933000+00:00 | 2026-11-11T12:50:01.885000+00:00 | gpt-6.1-sol | openai | medium |


<!-- CAB_SGS_SESSIONS_V1
{
  "format": "cab-sgs-1",
  "sessions": [
    {
      "contribution": {
        "agents": [
          {
            "agent": "codex",
            "model": "gpt-6.1-sol",
            "reasoning": "medium",
            "role": "coder"
          }
        ],
        "bounds": {
          "end": "1794401401.885",
          "start": "1794394918.721"
        },
        "breakdowns": {},
        "costs": {},
        "metrics": {
          "commands": {
            "evidence": [
              {
                "line": 1,
                "note": "Annexe native gelée native-sgs.json : metrics.commands ; coverage native"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "119"
          },
          "commands_failure": {
            "evidence": [
              {
                "line": 1,
                "note": "Annexe native gelée native-sgs.json : metrics.commands_failure ; coverage native"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "12"
          },
          "commands_success": {
            "evidence": [
              {
                "line": 1,
                "note": "Annexe native gelée native-sgs.json : metrics.commands_success ; coverage native"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "107"
          },
          "compactions": {
            "evidence": [
              {
                "line": 1,
                "note": "Annexe native gelée native-sgs.json : metrics.compactions ; coverage native"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "1"
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
            "evidence": [
              {
                "line": 1,
                "note": "Annexe native gelée native-sgs.json : metrics.messages ; coverage native"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "21"
          },
          "messages_assistant": {
            "evidence": [
              {
                "line": 1,
                "note": "Annexe native gelée native-sgs.json : metrics.messages_assistant ; coverage native"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "17"
          },
          "messages_user": {
            "evidence": [
              {
                "line": 1,
                "note": "Annexe native gelée native-sgs.json : metrics.messages_user ; coverage native"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "4"
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
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tasks": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tests": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tests_failure": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tests_success": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "tokens_cache_read": {
            "evidence": [
              {
                "line": 1,
                "note": "Annexe native gelée native-sgs.json : metrics.tokens_cache_read ; coverage native"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "50085632"
          },
          "tokens_cache_write": {
            "evidence": [
              {
                "line": 1,
                "note": "Annexe native gelée native-sgs.json : metrics.tokens_cache_write ; coverage native"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "0"
          },
          "tokens_input": {
            "evidence": [
              {
                "line": 1,
                "note": "Annexe native gelée native-sgs.json : metrics.tokens_input ; coverage native"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "50287820"
          },
          "tokens_output": {
            "evidence": [
              {
                "line": 1,
                "note": "Annexe native gelée native-sgs.json : metrics.tokens_output ; coverage native"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "190751"
          },
          "tokens_reasoning": {
            "evidence": [
              {
                "line": 1,
                "note": "Annexe native gelée native-sgs.json : metrics.tokens_reasoning ; coverage native"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "112473"
          },
          "tokens_total": {
            "evidence": [
              {
                "line": 1,
                "note": "Annexe native gelée native-sgs.json : metrics.tokens_total ; coverage native"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "50478571"
          },
          "tools": {
            "evidence": [
              {
                "line": 1,
                "note": "Annexe native gelée native-sgs.json : metrics.tools ; coverage native"
              }
            ],
            "reason": null,
            "state": "known",
            "value": "150"
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
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "web_open": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
          },
          "web_search": {
            "evidence": [],
            "reason": "Mesure absente ou périmètre exhaustif non identifiable",
            "state": "unavailable",
            "value": null
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
          "scm-coordination-20261111-cab"
        ],
        "sessions": [
          "01a1c9e3-bed3-7a52-abca-0ea08eaa71d9"
        ],
        "web_calls": []
      },
      "details": {
        "1": [
          {
            "label": "Mandat",
            "proof": "Décisions développeur du chat01a1c9e3-bed3-7a52-abca-0ea08eaa71d9",
            "value": "SCM validé ; autonomie codeur et coordination ; CI/CD puis CABU autorisés"
          }
        ],
        "2": [
          {
            "label": "Rôle",
            "proof": "Identité native SGS observée",
            "value": "Codex en codage direct ; aucun orchestrateur fictif"
          }
        ],
        "3": [
          {
            "label": "Validation",
            "proof": "VALIDATION.md et journaux output/scm/coordination-20261111",
            "value": "CAB : Python291 ; runtime Node169 ; CABU127 ; SSH réel natif et navigateurs réussis. Prompts : contrôles documentaires et OpenSpec strict réussis. Campagnes recouvrantes, total unique N/A."
          }
        ],
        "4": [
          {
            "label": "Coûts et tokens absents",
            "proof": "Annexe native SGS uniquement pour CAB",
            "value": "N/A pour toute mesure sans couverture native complète ; aucun coût estimé"
          }
        ],
        "5": [
          {
            "label": "Livraison",
            "proof": "openspec/changes/archive/2026-11-11-enable-autonomous-session-coordination/VALIDATION.md",
            "value": "Archivage source réussi ; livraison DIU et activation CABU traitées ensuite, résultats dans reçus séparés"
          }
        ],
        "6": [
          {
            "label": "Limites",
            "proof": "output/scm/coordination-20261111/pixs-before-cabu.json",
            "value": "Qualification isolée distincte des tests métier Pixs ; SID/RUN/job/mandat/r23 et bail013 conservés en PAUSE"
          }
        ]
      },
      "id": "SCM-coordination-20261111-cab",
      "input_sha256": "730fcc9a65e4585f0761b3ca21351351d5e92ca6ea338372303bb021f393f4c3",
      "native_telemetry": {
        "format": "cab-native-sgs-1",
        "sessions": [
          {
            "agent": "codex",
            "binding": "codex-53ade71cfb935ce3521f14b0a555d9ddb53af33437ae743a9b600b78cd8be54f",
            "cab_direct": true,
            "change": "enable-autonomous-session-coordination",
            "collector": {
              "source": "codex-native",
              "status": "collecting"
            },
            "coverage": {
              "ccab_claimed": "unavailable",
              "ccab_open": "unavailable",
              "ccab_resolved_retained": "unavailable",
              "ccab_total_retained": "unavailable",
              "command_wall_seconds": "native",
              "commands": "native",
              "commands_api": "unavailable",
              "commands_failure": "native",
              "commands_success": "native",
              "compactions": "native",
              "cost_usd": "unavailable",
              "duration_seconds": "native",
              "files_touched": "partial",
              "generation_seconds": "unavailable",
              "message_span_seconds": "native",
              "messages": "native",
              "messages_assistant": "native",
              "messages_llm": "native",
              "messages_user": "native",
              "permissions": "unavailable",
              "preparation_seconds": "unavailable",
              "reasoning_span_seconds": "native",
              "tests": "unavailable",
              "tokens_cache_read": "native",
              "tokens_cache_write": "native",
              "tokens_input": "native",
              "tokens_output": "native",
              "tokens_reasoning": "native",
              "tokens_total": "native",
              "tool_wall_seconds": "native",
              "tools": "native",
              "tools_llm": "native",
              "ttft_seconds": "unavailable",
              "update_cutover_seconds": "unavailable",
              "update_preparation_seconds": "unavailable",
              "wait_seconds": "unavailable",
              "web": "unavailable",
              "web_open": "unavailable",
              "web_search": "unavailable",
              "writes": "partial"
            },
            "ended_at": "2026-11-11T12:50:01.885000+00:00",
            "events": 690,
            "host": "hvp1",
            "instance": "codex-01a1c9e3-bed3-7a52-abca-0ea08eaa71d9-uid1000",
            "metrics": {
              "command_wall_seconds": "378.699",
              "commands": "119",
              "commands_failure": "12",
              "commands_success": "107",
              "compactions": "1",
              "duration_seconds": "2577.378",
              "files_touched": "2",
              "message_span_seconds": "30.272",
              "messages": "21",
              "messages_assistant": "17",
              "messages_llm": "30",
              "messages_user": "4",
              "reasoning_span_seconds": "4508.312",
              "tokens_cache_read": "50085632",
              "tokens_cache_write": "0",
              "tokens_input": "50287820",
              "tokens_output": "190751",
              "tokens_reasoning": "112473",
              "tokens_total": "50478571",
              "tool_wall_seconds": "4.293",
              "tools": "150",
              "tools_llm": "102",
              "writes": "2"
            },
            "mode": "direct",
            "models": [
              {
                "from": "2026-11-11T11:01:58.933000+00:00",
                "model": {
                  "name": "gpt-6.1-sol",
                  "provider": "openai",
                  "reasoning": "medium"
                },
                "source": "codex-native",
                "until": "2026-11-11T12:50:01.885000+00:00"
              }
            ],
            "project": "/home/devops/datas/cab",
            "role": "coder",
            "run": "SCM-coordination-20261111",
            "session": "01a1c9e3-bed3-7a52-abca-0ea08eaa71d9",
            "started_at": "2026-11-11T11:01:58.721Z"
          }
        ]
      },
      "scope": "cumulative",
      "state": "archived"
    }
  ]
}
-->
