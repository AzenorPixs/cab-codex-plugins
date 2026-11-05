# Qualification SCM — CAB 2.2.18

4 novembre 2026, Europe/Paris ; code non attribué.

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node client V2, distribution, services, recovery et CABU | 238 | 0 | 0 |
| Python de référence | 94 | 0 | 0 |
| OpenCode 2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 333 | 0 | 0 |

Régression ciblée : l’assertion de chemin laisse execute opaque avant le
patch, puis la projection running et completed concordante passe. Les quotes
simples sans échappements et les chaînes JSON sont vérifiées. Variable/index
étrangers, chemin dynamique ou autre MCP, constructeur/message dynamiques,
ombrage de Error et code supplémentaire restent opaques. Metadata divergente
refusée. La relance ciblée du dernier garde est incluse, non additionnée.

Le wrapper PA01 exact a été reconnu par GET avec le prototype, même call et
requestId existants, sans nouvelle validation ni effet. La fixture native
ajoute la même assertion de chemin de catalogue avec quotes simples au seul
mandat normal post-recovery. Avant décision, part running scellé et validation
admise ; awaitedSearchEarlyAdmission/literalPathAssertion passent sans timeout
ni poll manuel. La suite conserve ensuite once, refus et protections.

Logs /tmp/cab-2218-{reproduction,regression,negative-final,node,python,native,
spec-before}.log. Aucun test n’est affaibli ; OpenSpec strict 20/20 avant
archive. Syntaxe et UTF-8/LF vérifiés avant publication. Aucun accès ou fichier
Pixs n’a été manipulé par le correcteur.

17 reste une correction qualifiée de await seul, mais ne couvrait pas
l’assertion supplémentaire du wrapper réel. La présente correction couvre
cette forme exacte, pas du JavaScript arbitraire. Les acquisitions partagées
et coordinations REJECTED historiques restent distinctes. Activation et
résultat métier ne sont pas déduits des seuls tests ; publication/CABU séparés.
