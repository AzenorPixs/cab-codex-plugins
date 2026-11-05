# Qualification SCM — CAB2.2.17

4novembre2026 Europe/Paris ; code non attribué.

| Campagne finale unique | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Node client V2, distribution, services, recovery et CABU | 237 | 0 | 0 |
| Python de référence | 94 | 0 | 0 |
| OpenCode2.2.5 réel isolé | 1 | 0 | 0 |
| Total unique | 332 | 0 | 0 |

La nouvelle régression échoue avant correction : le wrapper avec await search
reste execute au lieu d’exposer request_validation pendant running. Après
correction, running sans metadata finale et completed concordant sont projetés.
Entrée requestId divergente, suffixe supplémentaire, variable tools ombragée,
query dynamique et metadata tronquée restent execute. Aucun test ni garde
n’est affaibli. Les exécutions ciblées sont incluses et non additionnées.
Syntaxe60Node et11Python ; UTF-8/LF ; OpenSpec20/20strict avant archive.

La fixture native remplace seulement le wrapper de l’unité partielle normale,
après recovery complete, par const schema = await search(...) suivi du retour
MCP littéral. Avant toute décision, le contrôleur admet la validation alors
que le part est encore running et scellé cabCodeMode. L’assertion
awaitedSearchEarlyAdmission/noTimeoutOrManualPoll passe ; la suite existante
vérifie ensuite l’unique once, les refus, les accès historiques et le restart
certifié. Aucune session ou ressource Pixs n’est utilisée.
Logs /tmp/cab-2217-{reproduction,regression,node,python,native,spec-before}.log.

Le correctif ne change que await optionnel dans le préambule const/search.
Il n’ajoute aucun autre code, endpoint, décision ou permission automatique.
Le fallback des wrappers arbitraires et la clôture des anciens REJECTED sont
distincts ; aucun succès n’est annoncé pour ces périmètres. Les identités déjà
admises restent inchangées ; publication/CABU et application métier séparées.
