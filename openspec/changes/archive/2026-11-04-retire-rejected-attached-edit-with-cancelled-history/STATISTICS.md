# Statistiques — CAB 2.2.25

## 1. Statistiques générales et décisions
SCM corrective directe du4novembre2026 ; code non attribué.
Temps global, modèle exact, raisonnement, tokens/cache/coût et export
exhaustif : N/A. Aucun agent délégué ni pilotage métier lancé par le correcteur.

## 2. Types de messages et d’outils
Diagnostic GET filtré, revue de deux gardes, implémentation minimale, tests de
régression, documentation et OpenSpec, syntaxe, Git et préparation CABU.
Coordination autorisée avec C12 ; comptages exhaustifs/pourcentages : N/A.

## 3. Approbations, refus et fichiers
Deux gardes du registre/contrôleur, tests, références/skill/commande/cadrages
et versions. Exception limitée à l’historique CANCELLED d’autre SID sans
native/nativeResult/once, dans la même génération. Enfant seul annulable sur
preuve rejet edit/shell existante. Parent, autres opérations, tokens/fencing,
révisions et baux inchangés. Aucun état Pixs muté depuis le correcteur.
Comptages exhaustifs par fichier : N/A.

## 4. Tests et vérifications
| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node contrôleur HTTP, registre, recovery, distribution et CABU | 559 | 0 | 0 |
| Python de référence | 95 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 655 | 0 | 0 |

13nouvelles régressions incluses dans559Node, sans cumul des essais ciblés.
Essais de construction des fixtures initialement échoués puis corrigés ;
voir QUALIFICATION.md pour la portée registre/HTTP, sans garde moteur masquée.
71fichiers syntaxiques,241liens, UTF-8/LF et0775 vérifiés. OpenSpec20/20 avant
archive,19/19 après.55fichiers runtime inchangés hors version, deux modifiés.
Nom publicCAB conservé ; convention générique hyphen-case non revendiquée.

## 5. Commandes et accès web
Node --test/--check, unittest/py_compile de référence, OpenSpec strict,
lectures GET ciblées, Git et préparation publication/CABU. Comptages exhaustifs
par commande/URL : N/A. Aucune once ni commande Pixs lancée par le correcteur.

## 6. Bilan, limites et reproductibilité
655tests uniques finaux réussis ; voir QUALIFICATION.md et logs privés.
Skill3964octets, commande3581octets, commande+status9964octets : budgets respectés.
Aucun gain LLM facturé déduit. Retrait propriétaire seul, APPROVED historique,
protection du parent et garde d’émission crossSID conservés. Une éventuelle
clôture ultérieure du parent est distincte et soumise à ses propres preuves.
Activation et reprise du propriétaire restent distinctes de la source.
