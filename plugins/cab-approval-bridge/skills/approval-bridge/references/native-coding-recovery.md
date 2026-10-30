# Reprise des incidents de codage natif — CAB 2.1.26

## Outils natifs et catalogue MCP

Le client installé exporte nativeCodingMandate(instruction). Utiliser explicitement ce helper pour préparer le texte d’un nouveau mandat avant client.prompt ; le texte fourni reste conservé intégralement après le préambule. Les prompts historiques ne sont pas modifiés implicitement. Le préambule rappelle que write/edit/shell sont des outils natifs distincts de search/execute MCP ; une recherche MCP vide n’établit pas leur absence. Vérifier le catalogue natif transmis au modèle si l’outil est réellement absent. Ne pas substituer shell à write, changer de cible ou chercher indéfiniment. Garder les schémas natifs observés : write {path,content}, edit {path,oldString,newString}, shell {command}. Ce rappel n’autorise aucune opération.

Le codeur produit un contenu complet, l’orchestrateur le revoit. Si les longs arguments sont instables, préparer un NOUVEAU payload explicitement Bash par la procédure exact-shell-carrier.md : octets scellés revus et invocation courte, décision sur les effets réels, ressources, accès et once. Cette conversion nécessite son propre mandat ; ne pas réinterpréter une ancienne autorisation write en Bash. Le modèle ne complète jamais le fragment d’un fichier refusé pour le faire passer.

## Erreur fournisseur et diagnostic

Le client exporte diagnoseCodingTurn(messages,{sessionId,promptId,toolInputSha256}). Fournir les messages normalisés issus de client.messages du SID exact, l’identifiant du message UTILISATEUR natif (pas celui de la réponse d’admission), et l’empreinte write/edit attendue si elle existe. Le helper observe seulement les assistants de ce SID rattachés à cette ancre ; une ancre absente/dupliquée ou sans assistant donne available:false. Une réponse de prompt() seule n’atteste pas la fin.

Le résultat contient des codes, compteurs et indicateurs fixes : providerFailure, nativeTurnFailed, discoveryOnly, invalidWriteInputCount et inputMismatchCount (null sans empreinte attendue). Il ne contient ni corps, message d’erreur libre, décision ou once. snapshot_only:true et effectStatus:unverified sont toujours conservés. Les assistants étrangers sont exclus. Un résultat sans anomalie reste une observation, jamais une réussite métier ni une absence d’effet. Les preuves manquantes ou les autres exécutions/continuations hors ancre restent à examiner séparément.

Après provider.internal ou une entrée incomplète/divergente : conserver l’accès et les traces, examiner les permissions, appels natifs, cible et effets ; rejeter explicitement une permission divergente, réconcilier et libérer uniquement sur preuves. Aucun retry de décision/once et aucun complément automatique du fragment. Une fois la frontière sûre prouvée, la procédure PLLM de panne réelle peut effectuer sa réévaluation bornée ; elle ne change pas le choix humain explicite. Si le mode choisi est à nouveau valide, le conserver, avec même compte/modèle/SID. Si indisponible, signaler l’état et respecter la transition et les autorisations existantes. Le helper ne déclenche ni benchmark ni bascule. Une panne externe n’est pas déclarée réparée par CAB.

## Conducteur incomplet et preuves de tests

Refuser avant écriture un conducteur qui ne contient pas l’exécution complète des tests prescrits, ne retourne que READY ou laisse un placeholder. Vérifier le programme entier et ses niveaux imbriqués, sa syntaxe, les commandes réellement exécutées, les codes de sortie et les résultats attendus. Un contrôle syntaxique, une compilation, un nombre annoncé ou une proposition ne prouve pas l’exécution des tests. Les critères exacts appartiennent au projet de la session ; CAB ne les remplace pas par une heuristique de texte ni un compte artificiel. Aucun source ou nom de consommateur n’est incorporé au protocole CAB.

## Registre du moniteur

Le moniteur lit GET /monitor/runs : projection GET non autorisante de 200 réservations au plus, actives d’abord, avec champs runId/changeId/sessionId/version/state/phase, totalRuns, truncated et snapshot_only. Le registre complet GET /runs reste intact et peut dépasser 2 Mio ; le moniteur n’y fait aucun repli et ne charge pas son historique ou ses ressources. Le plafond de collecte reste 2 Mio. Si plus de 200 réservations existent, la troncature est explicite.

Les codes publics source-too-large, source-invalid, source-http-error et source-timeout distinguent les pannes sans exposer de corps ou d’erreur libre. Les dernières observations restent datées et périmées ; une nouvelle réussite rétablit la fraîcheur. Cette projection ne réserve aucune ressource et ne remplace ni admission, décision ni réconciliation.
