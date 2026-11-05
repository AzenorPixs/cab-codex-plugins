# Qualification SCM — CAB 2.1.26

30 octobre 2026. Change unique, code non attribué ; attribution ACL ultérieure.

## Incidents et corrections

1. Le moniteur ne lisait pas le registre : GET /runs observé à 13 451 428 octets pour 51 RUN, au-delà du plafond de collecte 2 Mio ; le catch masquait la taille par source-unavailable. GET /monitor/runs projette les seuls six champs de navigation, au plus 200 RUN, actives d’abord, total et troncature explicites. Le moniteur utilise cette projection sans repli ; le registre complet reste intact. Les diagnostics distinguent taille/format/HTTP/délai et ne montrent aucun corps libre.
2. La recherche de write dans le catalogue MCP ne prouvait pas son absence native. nativeCodingMandate ajoute un rappel fixe explicite, conserve le mandat exact et laisse les prompts historiques inchangés. diagnoseCodingTurn observe le SID et l’ancre utilisateur, conserve la découverte comme diagnostic et non comme preuve d’absence ou de permission.
3. L’erreur fournisseur provider.internal et la continuation fragmentaire avaient été bloquées avant once par CAB. Le diagnostic repère l’erreur, l’entrée incomplète et l’empreinte divergente, sans corps ni erreur libre ; le protocole exige effets examinés, réconciliation et nouveau mandat approprié, pas de retry ou bascule spontanée. Le transport scellé précédent reste qualifié pour les longs payloads.
4. Le conducteur de tests incomplet avait été refusé à la revue. La procédure exige code complet, syntaxe et preuves des tests réellement exécutés ; READY et compilation ne remplacent pas les résultats. Aucun test métier d’un autre projet n’est exécuté par cette SCM.

## Preuves

Node global : 656 cas, 626 réussis, 30 ignorés conditionnels, zéro échec ; concurrence 136/136 en35,019452s et autres490/520 en56,934612s. Python81/81 en5,295s. Campagne native privée exacte OpenCode2.2.0 :3/3 en17,371378s. Total réussi exécuté710, sans addition des ciblés. Syntaxes69JavaScript/16Python ; trois copies broker identiques. OpenSpec standard/strict17/17 avant archive.

Les tests de projection utilisent un registre dépassant2Mio, excluent historique/ressources et interdisent l’appel au snapshot complet. La collecte demande seulement la projection ; positifs, 503, taille, JSON/forme invalides et timeout sont qualifiés, anciennes valeurs datées conservées puis retour frais. HTTP réel de fixture confirme six champs identiques sans mutation, décision ni once. Les diagnostics testent provider.internal+write{}+fragment, empreinte exacte, ancre absente/dupliquée, assistant étranger et absence de divulgation.

Le banc natif observe une erreur HTTP400 synthétique fournisseur sans retry ni permission, et une découverte MCP vide sans absence native inférée. Il conserve les preuves write/edit exactes et de refus d’arguments divergents avant once ; le payload scellé9 860octets exact et l’altération de même longueur refusée restent vérifiés. L’erreur500 historique n’est pas présentée comme reproduite nativement par le scénario400 ; son diagnostic provider.internal est qualifié séparément par les données normalisées isolées. Aucune garantie de disponibilité ou réparation du fournisseur externe n’est revendiquée.

Les helpers sont explicites : leur présence ne modifie pas les anciens pilotes et les orchestrateurs doivent adopter le nouveau protocole après activation. Le diagnostic ne prouve jamais les effets et ne donne aucun droit. AGENTS,DEVOPS,ORCHESTRATED_CODING et concurrent-runs conservés par SHA256. OpenCode et travaux actifs préservés. Publication puis CABU et information nécessitent leurs reçus distincts après clôture source. Preuves locales non versionnées : output/coding-incidents26/.
