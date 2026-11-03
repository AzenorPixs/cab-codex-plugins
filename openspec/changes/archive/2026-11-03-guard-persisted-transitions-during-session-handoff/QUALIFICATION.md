# Qualification SCM — CAB 2.2.14

2026-11-03 ; code non attribué. Correctif du périmètre handoff autorisé.

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node handoff, ressources, modèle, reprise, continuité et distribution | 164 | 0 | 0 |
| Node compatibilité CABU, ports et permissions | 108 | 0 | 0 |
| Python de référence | 94 | 0 | 0 |
| OpenCode 2.2.5 réel | 1 | 0 | 0 |
| Total unique | 367 | 0 | 0 |

Cinq nouveaux cas : recovery restaurée ; modèle PREPARED, APPLYING et
NATIVE_UNCONFIRMED restaurés hors appel actif ; readiness readonly actualisée
dans la même candidate. Le refus conserve le checkpoint et le SID, sans
permission ni modification des états persistés. Les cas natifs qualifient
handoff, protections historiques, rejeu et redémarrage certifié avec reçu.
Logs /tmp/cab-2214-{core,compat,python,native,spec-before}.log.
Syntaxe60Node et11Python ; broker source/copie identiques ; UTF-8/LF et
Git diff --check. OpenSpec strict20/20 avant archivage.
Un précontrôle de copie utilisait deux noms de modules inexistants : corrigé
vers server/router/journal, puis comparaison réussie ; aucun source modifié
pour masquer ce défaut de commande. Publication/CABU distincts ; aucun POST
métier C12 par le correcteur. Le cas write rejeté reste séparé.
