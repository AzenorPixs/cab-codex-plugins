# Qualification SCM — CAB 2.2.19

4 novembre 2026, Europe/Paris ; code non attribué.

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node registre, contrôleur HTTP, recovery, client, distribution et CABU | 643 | 0 | 0 |
| Python de référence | 94 | 0 | 0 |
| OpenCode 2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 738 | 0 | 0 |

Les 37 tests de distribution ont été revérifiés après actualisation des seules
expressions de version et empreintes du manifeste ; ils sont inclus dans643,
pas additionnés. La première campagne globale avait6 contrôles de distribution
périmés ; aucun échec fonctionnel résiduel. La fixture initiale a été corrigée
pour émettre réellement action shell et ressources fragmentées, puis publier
la readiness fraîche après son redémarrage ; aucune garde produit affaiblie.

27 tests ciblés shell : preuve exacte et19 négatifs, HTTP de retrait et6
refus. Le registre qualifie12 frontières parentales supplémentaires : propriétaire,
contexte, version, SID, lien multiple/absent, état, native/result/once et dérive.
Le test HTTP prouve parent HELD identique (jeton/fencing inclus localement),
APPROVED conservé, CANCELLED sans native/result, staging à nouveau admissible,
reçu identique avant/après redémarrage et aucune once tardive. Un nouveau
requestId est admis/approuvé suivant le cycle ordinaire, sans effet exécuté.
La commande réelle refusée et son parent C12 ont été reconnus en lecture seule
par les nouveaux vérificateurs ; aucune mutation du RUN par le correcteur.

La régression native réelle qualifie ask/once, refus multipart sans effet,
empreintes natives, handoff et continuité. Elle reste distincte du test HTTP
simulant le retrait attaché et de toute qualification métier Pixs.

Syntaxe :62 fichiers Node et11 Python (py_compile avec cache privé),73 uniques.
UTF-8/LF contrôlés ; noyaux skill et commande inférieurs à4000octets.
OpenSpec strict20/20 avant archive. Les sources broker dupliquées concordent.
Logs privés : /home/ade/.codex/.tmp/cab-2219-{node-final,distribution-final,python,native,openspec-before}.log.
Publication, CABU, continuité et reprise réelle appartiennent au bilan suivant.
