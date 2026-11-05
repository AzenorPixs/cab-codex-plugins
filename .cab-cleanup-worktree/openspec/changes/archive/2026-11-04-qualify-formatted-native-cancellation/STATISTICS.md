# Statistiques — CAB 2.2.27

## 1. Statistiques générales et décisions
SCM corrective directe du4novembre2026 ; code non attribué.
Temps global, modèle exact, raisonnement, tokens/cache/coût et export
exhaustif : N/A. Aucun agent délégué ni pilotage métier lancé par le correcteur.

## 2. Types de messages et d’outils
Diagnostic API/transcript filtré, matcher fermé et classification, tests HTTP,
OpenSpec/documentation, syntaxe, Git et préparation CABU. Comptages exhaustifs
et pourcentages : N/A. Diagnostic C12 distinct non inclus dans cette correction.

## 3. Approbations, refus et fichiers
Contrôleur, régressions, contrat distribué et versions. Chaînes/identités et
appels restent exacts ; blancs légaux seulement. Diagnostics purement MCP
restent sans autorité. Aucune annulation native rejouée, décision, permission,
accès ou once fabriqué. Aucun état RUN Pixs muté manuellement par le correcteur.
Comptages exhaustifs des éditions par fichier : N/A.

## 4. Tests et vérifications
| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node contrôleur HTTP, registre, client V2, ports, recovery, distribution et CABU | 673 | 0 | 0 |
| Python de référence | 95 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 769 | 0 | 0 |

24nouvelles régressions incluses dans673Node, sans cumul des essais ciblés.
Première campagne671/0 remplacée après deux tests de compatibilité get/poll.
Un test ciblé a révélé un wrapper vide non qualifié silencieusement ignoré :
garde renforcée ; aucun rejet d’effet ou d’identité assoupli. Voir QUALIFICATION.md.
70fichiers syntaxiques,244liens, UTF-8/LF et0775 vérifiés. OpenSpec20/20 avant
archive,19/19 après.56runtime inchangés hors version ; contrôleur seul modifié.
Nom publicCAB conservé, sans conformité générique hyphen-case revendiquée.

## 5. Commandes et accès web
Node --test/--check, unittest/py_compile de référence, OpenSpec strict,
GET/transcripts filtrés, Git et préparation publication/CABU. Comptages exhaustifs
par commande/URL : N/A. Aucun secret affiché ni effet métier déclenché.

## 6. Bilan, limites et reproductibilité
769tests finaux uniques réussis ; voir QUALIFICATION.md et logs privés.
Skill3964octets, commande3581octets, commande+status9964octets : budgets respectés.
Aucun gain facturé déduit. Tokenizer fermé16384caractères sans eval ; données
inchangées, ASI return/throw et cas inconnus refusés. La convergence native
requiert toujours deux preuves stables et une frontière sans effet/permission/accès.
Publication, activation et convergence réelle restent distinctes de la source.
