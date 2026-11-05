# Qualification SCM — CAB 2.2.38

5 novembre 2026 ; mandat explicite de documentation maximale du skill,
du plugin et de la commande. Code non attribué ; convergence ACL ultérieure.

| Campagne finale ciblée sur code figé | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node distribution du contrat, services et CABU | 129 | 0 | 0 |
| Python de référence | 125 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 255 | 0 | 0 |

Logs privés : /home/ade/.codex/.tmp/cab-2238-{node-final-frozen,python-final-frozen,native-final-frozen}.log.
Commande et reçu Node : cab-2238-work-ywim42da/final-node-{command,result}.json.
70 empreintes de code/tests figées avant/après. Comparaison systématique à2.2.37 :
les seuls changements runtime/tests sont les versions, aucune garde modifiée.
Les997tests de2.2.36 ne sont pas présentés comme une nouvelle campagne2.2.38.
Le routage documentaire a été recontrôlé après les derniers exemples/références
(4tests du sous-ensemble protocol-distribution, non cumulés aux129).

La première campagne avait128PASS/1FAIL : le test de contrat attend la phrase
exacte de non-bootstrap des consultations, qu’une reformulation concise avait
remplacée. Phrase rétablie, test inchangé, dernière campagne129/129. Le premier
log est conservé dans cab-2238-node-before-command-contract.log. Aucun contrôle
ou seuil affaibli pour faire passer la documentation.

Cinq références nouvelles, routage skill/index/commande/triage et cadrages :
- sources courantes et timestamps historiques,monitor stale et401 brut ;
- présence et couverture de policy,authority cible et formes exactes ;
- arguments MCP vs checkpoint/stage,digests programmatiques,erreurs locales ;
- clôture brokerPENDING après retrait local et accès libéré ;
- résultats natifs/once distincts du flag executed et diagnostic UNVERIFIED.
La terminalité du guide run est alignée sur terminal_gate déjà spécifié,
sans confondre un diagnostic technique BLOCKED et une clôture métier validée.
Le guide court renvoie seulement au cas utile ; aucun catalogue intégral à
recharger lors d’une unité saine. Les exemples JSON ont été parsés localement.

70 syntaxes,312liens,UTF-8/LF,0775 et3paires source/distribution broker vérifiés.
Skill3946octets,commande3594,commande+status9977 : budgets tenus. OpenSpec20/20
avant archive et19/19 après. Aucun test nouveau miroir de la prose, pas de
nouveau droit,backend ou actionneur. Le nom publicCAB est conservé.

Preuve opérante distincte reçue de PA01 : le py_compile via stage est
COMPLETED,onceAcknowledged=true,nativeResultcompleted/exit0,source inchangée,
cache absent. Le propriétaire a libéré l’accès RELEASED/COMPLETED,fencing14425,
avec reçu distinct ; bailCT100 conservéHELD13953. Le correcteur n’a émis aucune
permission,annulation ou mutation de ce RUN. executed=false/outcomeUNVERIFIED
étaient des champs diagnostiques distincts du résultat durable et ne permettaient
aucun rejeu. Publication,CABU38 et reprise de la recette suivante sont séparées.
DIU indisponible ; pipeline Git existant, aucune exécution DIU revendiquée.
