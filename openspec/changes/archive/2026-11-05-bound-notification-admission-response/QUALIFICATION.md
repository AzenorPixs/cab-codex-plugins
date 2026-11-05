# Qualification SCM — CAB 2.2.36

5 novembre2026, Europe/Paris ; code non attribué, ACL ultérieure.

| Campagne finale unique sur code figé | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node campagne complète finale, concurrence2 | 871 | 0 | 0 |
| Python de référence | 125 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique final | 997 | 0 | 0 |

Logs privés : /home/ade/.codex/.tmp/cab-2236-{node-final-frozen,python-final-frozen,native-final-frozen,spec-before}.log.
Commande et reçu Node : cab-2236-work-wnygld8l/final-node-command.json et
final-node-result.json.71empreintes de code/tests figées, vérifiées après
campagnes ; aucun changement de code après gel. Les5nouveaux tests Python
sont inclus dans125 ; les essais ciblés ne sont pas cumulés.

Transport HTTP réel isolé : ancien timeout2s reproduitFAILED/PENDING face à
réponse202 retardée2,25s (cab-2236-former-timeout-reproduction.log, essai non
cumulé) ; avec10s, ACK202 reçu et DELIVERED persisté ; refus503
retardé reconnu/filtré sans livraison ; expiration simulée sans décision,
IDs conservés, délai10s inférieur à lease15s et lecture de décision2s.
Trois campagnes Node précédentes avaient chacune870PASS/1FAIL : timeout10s au
setup, avant exercice du scénario (Code Mode disjoint, migration HTTP, puis
clôture de rejet natif). Chacun réussit isolément sans modification. La dernière
campagne complète concurrence2 réussit871/871 sur les mêmes empreintes. Les
3incidents restent dans cab-2236-node-{first,second,third}-frozen.log ; ils ne
sont ni cachés ni cumulés aux totaux finaux. Aucun correctif du banc revendiqué.
Les premiers essais ciblés Python ont corrigé deux attentes de fixture avant
gel (signature controller_decision et statut d’un refus déterministe), sans
modifier les gardes ou comportements de refus du produit.

Seule modification sémantique de runtime : timeout dédié10s à notify_controller,
dans broker source/copie. Aucun délai de lecture, lease, budget, cooldown,
ordonnanceur, décision ou once changé.71syntaxes,286liens,UTF-8/LF,0775 et copies
broker vérifiés ; skill3921octets,commande3600,commande+status9983. Le nom public
CAB est conservé. OpenSpec20/20 avant archive et19/19 après archive.

Diagnostic PA01 : ancienne503 broker-coordination-not-ready avant retour du
protocole, puis tentativeFAILED sans diagnosticHTTP ; corrélation MATCHED
04:51:15.326Z→04:51:17.890Z (2,564s), admission absente. Le dépassement du délai
broker2s est un défaut de transport reproduit isolément ; il ne prouve pas la
cause de toute absence d’admission. Après activation, le propriétaire doit
réobserver la même approval et la réponse réelle, sans nouvelle identité ni
rejeu métier. Aucune remédiation/décision/permission métier par le correcteur.
Publication, activation et reprise PA01 exigent leurs preuves distinctes.
DIU indisponible sur cet hôte ; pipeline Git de publication existant utilisé,
sans prétendre à une exécution DIU ni dupliquer la livraison.
