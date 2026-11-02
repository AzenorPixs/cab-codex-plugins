# Reprise des incidents de codage natif — CAB 2.1.75

## Opération approuvée interrompue par un redémarrage

CAB persiste une décision terminale et l’identité de son opération avant toute
réponse de permission native. À la reprise, il ne restaure la décision qu’à
partir d’une demande `request_validation` native terminée et d’une réponse
`APPROVED` exacte, toutes deux liées aux mêmes requestId, approvalId, operationId,
RUN, session, empreintes, manifeste et révisions.

La continuation du `once` existant exige deux observations natives stables : la
permissionId exacte est encore pendante, son callID correspond à l’unique outil
`running` dont `executed` vaut `false`, aucune réponse ou fin native contradictoire
n’est apparue, et l’accès peut être acquis avec les révisions originales. CAB
répond alors à cette permission d’origine ; il ne crée pas de nouvelle demande.
Si la permission a disparu, CAB lit `GET /api/experimental/session/{sessionID}/log`
avec `follow=false`, borne la réponse et exige son watermark `log.synced`.
Une seule entrée `session.tool.success` correspondant exactement au callID,
à l’outil natif, à son entrée, à la cible, au mandat et aux empreintes clôt
`COMPLETED` sans répondre à la permission ni rejouer `once`. Une entrée
`session.tool.failed`, l’absence d’événement, un outil démarré sans résultat,
un accusé `once` ou une identité/historique divergent ne prouvent pas l’absence
d’effet ; CAB ne réémet rien et conserve `UNKNOWN` avec ses ressources
protégées. Le journal durable ne contient pas `permission.replied`. Le délai,
le silence ou `idle` ne prouvent jamais `NO_EFFECT`.

Une opération `UNKNOWN` ne bloque pas les accès d’un autre RUN sur des ressources
sans recouvrement. Toute écriture recouvrante attend la frontière native sûre.

## Prévol avant récupération d'une session adossée à un RUN

Pour un job adossé à un RUN, avant `phase: "prepare"`, vérifier que la candidate est idle, sans permission
native en attente, et que ses règles effectives sont `shell: ask` et
`edit: ask`. Une règle `deny` doit être corrigée sur la seule candidate par
l'API native et revérifiée avant le gel ; conserver les autres règles et ne
pas élargir le périmètre.

Découvrir et vérifier la signature exacte de `request_validation` avant le
gel avec une recherche littérale retournée, par exemple :

```js
return await search({ query: "request_validation", namespace: "cgpt-validation", limit: 20 });
```

La découverte doit être un appel `search` unique, complet et non tronqué. Le
contrôleur scelle cette preuve dans `preparationHistory`. Après un `prepare`
actuel, ne pas lancer de découverte Code Mode : seuls readiness, le prévol
corrélé, l'unique `once`, `/usr/bin/true` et readiness finale sont admis. Pour
le prévol, utiliser le wrapper natif retourné par `request_validation` et
fournir explicitement `timeout_seconds: 120` et `interval_seconds: 3`. À
l'expiration, garder le même approval ID et interroger celui-ci ; ne pas créer
une nouvelle demande. Notification livrée, décision, permission, commande et
readiness restent des preuves distinctes. `complete` n'est permis qu'après
exit 0 et readiness finale `READY` sans pending.

Compatibilité bornée : `complete` peut réconcilier au plus une discovery
native Code Mode exacte, complète, non tronquée, en lecture seule, horodatée
et corrélée à `request_validation` dans le transcript post-prepare d'une
récupération RUN historique sans `requestValidationSignatureHash`. Sa
position dans ce transcript n'est pas limitée. Cela ne crée ni demande,
permission, commande ni retry et ne permet aucun rejeu. Les récupérations
signées rejettent toujours toute discovery post-prepare ; les discoveries
dupliquées ou incomplètes et les autres outils inattendus restent refusés.

Un job historique non adossé à un RUN conserve son chemin de récupération
existant ; ses gardes de permission, corrélation, effets et fin native restent
applicables.

## Payload `request_validation` Code Mode

Pour qu'une demande `request_validation` soit corrélée à l'admission CAB, le
wrapper `execute` doit utiliser un appel terminal natif dont l'objet correspond
exactement aux métadonnées du tool call. Une commande longue peut être écrite
directement comme chaîne littérale, y compris une template sans interpolation,
ou être liée par une seule déclaration `const` à chaîne double-quotée ou
template littérale sans interpolation, utilisée une fois comme seul élément
de `commands`. Aucun préfixe, interpolation `${...}`, expression dynamique,
statement ou tool additionnel n'est admis dans cette forme liée. Le parseur ne
doit pas exécuter ce code pour l'interpréter ; toute ambiguïté reste refusée
avant notification ou permission. Un refus de corrélation ne justifie ni
annulation, ni rejeu, ni nouvelle demande : conserver l'approval ID existant
et ne consulter que `poll_approval` ou `get_approval` lorsque l'appel initial
est terminé.

## Outils natifs et catalogue MCP

Le client installé exporte nativeCodingMandate(instruction). Utiliser explicitement ce helper pour préparer le texte d’un nouveau mandat avant client.prompt ; le texte fourni reste conservé intégralement après le préambule. Les prompts historiques ne sont pas modifiés implicitement. Le préambule rappelle que write/edit/shell sont des outils natifs distincts de search/execute MCP ; une recherche MCP vide n’établit pas leur absence. Vérifier le catalogue natif transmis au modèle si l’outil est réellement absent. Ne pas substituer shell à write, changer de cible ou chercher indéfiniment. Garder les schémas natifs observés : write {path,content}, edit {path,oldString,newString}, shell {command}. Ce rappel n’autorise aucune opération.

Le codeur produit un contenu complet, l’orchestrateur le revoit. Si les longs arguments sont instables, préparer un NOUVEAU payload explicitement Bash par la procédure exact-shell-carrier.md : octets scellés revus et invocation courte, décision sur les effets réels, ressources, accès et once. Cette conversion nécessite son propre mandat ; ne pas réinterpréter une ancienne autorisation write en Bash. Le modèle ne complète jamais le fragment d’un fichier refusé pour le faire passer.

En Code Mode, `execute` est l’outil hôte qui exécute les appels MCP dynamiques ;
`request_validation` peut apparaître dans la réponse de `search` sans être une
entrée distincte du catalogue d’outils présenté au modèle. Appeler uniquement le
nom exact découvert dans le résultat complet, par exemple
`tools["cgpt-validation"].request_validation(...)` à l’intérieur du wrapper
Code Mode. Ne pas appeler directement l’entrée native `cgpt-validation_request_validation`.
L’absence d’entrée séparée `request_validation` dans ce catalogue ne justifie
ni un nom deviné, ni un appel shell ou un contournement des gardes RUN,
validation et permission ; si le wrapper `execute` manque, garder le mandat bloqué.

## Erreur fournisseur et diagnostic

Le client exporte diagnoseCodingTurn(messages,{sessionId,promptId,toolInputSha256}). Fournir les messages normalisés issus de client.messages du SID exact, l’identifiant du message UTILISATEUR natif (pas celui de la réponse d’admission), et l’empreinte write/edit attendue si elle existe. Le helper observe seulement les assistants de ce SID rattachés à cette ancre ; une ancre absente/dupliquée ou sans assistant donne available:false. Une réponse de prompt() seule n’atteste pas la fin.

Le résultat contient des codes, compteurs et indicateurs fixes : providerFailure, nativeTurnFailed, discoveryOnly, invalidWriteInputCount et inputMismatchCount (null sans empreinte attendue). Il ne contient ni corps, message d’erreur libre, décision ou once. snapshot_only:true et effectStatus:unverified sont toujours conservés. Les assistants étrangers sont exclus. Un résultat sans anomalie reste une observation, jamais une réussite métier ni une absence d’effet. Les preuves manquantes ou les autres exécutions/continuations hors ancre restent à examiner séparément.

Après provider.internal ou une entrée incomplète/divergente : conserver l’accès et les traces, examiner les permissions, appels natifs, cible et effets ; rejeter explicitement une permission divergente, réconcilier et libérer uniquement sur preuves. Aucun retry de décision/once et aucun complément automatique du fragment. Une fois la frontière sûre prouvée, la procédure PLLM de panne réelle peut effectuer sa réévaluation bornée ; elle ne change pas le choix humain explicite. Si le mode choisi est à nouveau valide, le conserver, avec même compte/modèle/SID. Si indisponible, signaler l’état et respecter la transition et les autorisations existantes. Le helper ne déclenche ni benchmark ni bascule. Une panne externe n’est pas déclarée réparée par CAB.

## Conducteur incomplet et preuves de tests

Refuser avant écriture un conducteur qui ne contient pas l’exécution complète des tests prescrits, ne retourne que READY ou laisse un placeholder. Vérifier le programme entier et ses niveaux imbriqués, sa syntaxe, les commandes réellement exécutées, les codes de sortie et les résultats attendus. Un contrôle syntaxique, une compilation, un nombre annoncé ou une proposition ne prouve pas l’exécution des tests. Les critères exacts appartiennent au projet de la session ; CAB ne les remplace pas par une heuristique de texte ni un compte artificiel. Aucun source ou nom de consommateur n’est incorporé au protocole CAB.

## Registre du moniteur

Le moniteur lit GET /monitor/runs : projection GET non autorisante de 200 réservations au plus, actives d’abord, avec champs runId/changeId/sessionId/version/state/phase, totalRuns, truncated et snapshot_only. Le registre complet GET /runs reste intact et peut dépasser 2 Mio ; le moniteur n’y fait aucun repli et ne charge pas son historique ou ses ressources. Le plafond de collecte reste 2 Mio. Si plus de 200 réservations existent, la troncature est explicite.

Les codes publics source-too-large, source-invalid, source-http-error et source-timeout distinguent les pannes sans exposer de corps ou d’erreur libre. Les dernières observations restent datées et périmées ; une nouvelle réussite rétablit la fraîcheur. Cette projection ne réserve aucune ressource et ne remplace ni admission, décision ni réconciliation.

## Permissions de la session après revue

Appliquer [native-permission-resume.md](native-permission-resume.md) avant nouveau prévol : requiredNativeAsk est une exigence structurée avant prompt, indépendante de nativeCodingMandate et de l’inactivité. Aucun deny n’est levé automatiquement.
