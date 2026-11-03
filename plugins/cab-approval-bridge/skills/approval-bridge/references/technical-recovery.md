# Précisions recovery — CAB 2.2.11

## Récupération contrôlée de session dans le même RUN

Après un écart refusé sans effet, interrompre l'ancienne session, traiter son
rapport et clôturer le mandat courant avec `/runs/<run_id>/job/progress`. Ne pas réarmer le
job pour remplacer sa session : `/runs/<run_id>/job/arm` reste immuable. Créer la candidate
par l'API native OpenCode dans le même `directory`, avec permissions natives
`ask`, sans lui confier de travail métier.

Utiliser `POST /runs/<run_id>/job/recover` en deux phases. Le corps commun contient `jobId`,
`expectedSessionId` (ancienne session), `sessionId` (candidate), `recoveryId`
inédit et `preflightRequestId` inédit ; ajouter `phase: "prepare"`, puis
`phase: "complete"`. Le contrôleur vérifie par HTTP le contexte, MCP, les
sessions inactives et l'absence de permissions/demandes non résolues. Un mandat
indécis doit recevoir une décision explicite ; une transmission encore en
cours impose une réconciliation avant un nouvel essai.

Après prepare, le job et le superviseur sont gelés. Seul le prévol réservé de
la candidate est admis : `broker_readiness`, `request_validation` pour la
commande exacte `/usr/bin/true`, décision explicite corrélée, permission
native unique, exécution exit 0, puis `broker_readiness = READY` sans demande
en attente. Aucun suffixe ni autre outil natif. Le contrôleur vérifie les
preuves dans les messages OpenCode avant complete ; une déclaration de
réussite ne suffit pas. Aucun appel de récupération ne vaut décision CAB.

Après complete, relire `/job` et `/status` : même job, même change et critères,
dernier jalon conservé, nouvelle session, `strictCommands` préservé et gate
OPEN. Les anciennes autorisations exécutables sont invalidées et l'historique
non secret est conservé. Le superviseur suit désormais la session transférée.
Un échec conserve le gel ; la récupération ordinaire ne purge pas le RUN et
n'invente aucun gate terminal. Un prévol divergent suit la procédure sans
purge décrite dans
« Prévol de récupération divergent dans la même session » ci-dessous.
Un redémarrage conserve ce gel mais ne recrée pas la décision ou la preuve
locale du prévol : si elles sont perdues, le périmètre reste protégé et
l’orchestrateur instruit les voies de réconciliation qualifiées dans son mandat.
Une décision du développeur est demandée seulement si la suite sort du change validé. L'API ne remplace ni une session révoquée ni
un prévol échoué par une nouvelle tentative implicite.


## Prévol de récupération divergent dans la même session

Après un prévol divergent ou incomplet prouvé et refusé avant exécution sans
effet, conserver la session candidate où le prévol a divergé, le même job,
le RUN et le runtime. Ne créer aucune autre session ni aucun job de remplacement,
ne purger aucun état et ne pas revenir à l'ancienne session révoquée.
Le remplacement initial prévu par CISMP reste inchangé ; cette règle concerne
les échecs du prévol dans sa candidate. OpenCode reste ouvert.

Comparer les appels natifs au mandat réellement prescrit, notamment
`requestId`, `approval_id`, `change_id`, `session_id`, `directory`, `files`,
`commands`, `title`, `summary`, `timeout_seconds` et `interval_seconds`.
Un champ omis, `true` au lieu de `/usr/bin/true`, un suffixe ou un change erroné
reste refusé sans normalisation. Un paramètre non prescrit ne devient pas une
divergence inventée. Un HTTP 409 seul ou un texte de l'agent ne prouve pas le
refus sans effet. Après un délai MCP seul, interroger uniquement le même
`approval_id` par `poll_approval` ou `get_approval`, sans nouvelle demande.

Geler le travail, traiter les rapports, refuser les permissions divergentes,
clôturer les demandes restantes sans les approuver et réconcilier les effets.
Exiger santé, contexte, MCP connecté, sessions inactives, aucun mandat actif
ou en attente, aucune permission non résolue et aucun effet inconnu.
Une décision `approved`, consommée ou une preuve incertaine interdit retry.

Demander explicitement `POST /runs/<run_id>/job/recover` avec `phase: "retry"`, les mêmes
`jobId`, `expectedSessionId`, `sessionId` candidate et `recoveryId`,
`previousPreflightRequestId` égal à la réservation actuelle et un
`preflightRequestId` inédit. Ne pas réarmer, désarmer ou abandonner le job pendant retry.
Le contrôleur exige un refus natif `REJECTED` corrélé à la décision locale
`rejected` non consommée, ou une erreur native MCP `-32602` avant enregistrement.
Depuis CAB 1.0.2, après timeout de `request_validation`, `poll_approval` ou
`get_approval` sur le même `approval_id` peut prouver ce refus. Vérifier dans
l'ordre natif `requestId`, `approval_id`, `session_id`, `directory`, `change_id`,
`files` et `commands` ; toutes les demandes enregistrées doivent être refusées.
Un `PENDING` corrélé reste non terminal ; aucune nouvelle demande n'est admise
avant retry. Un timeout seul ne prouve ni divergence ni refus et ne déclenche
aucun gel supplémentaire : rechercher la décision sur le même `approval_id`.
Le gel déjà établi par un prévol divergent ou incomplet reste soumis aux
preuves exigées pour retry et complete. Une erreur générique, un polling
divergent, une commande ou un autre outil natif exige la réconciliation ou
l'autorité indispensable, sans lever ce gel existant.

Le contrôleur conserve les identifiants antérieurs et l'empreinte du préfixe
des parties natives, sans contenu de message. Il vérifie ce préfixe à chaque
retry et complete ; une preuve modifiée ou perdue interdit la transition.
Le nouvel essai utilise des `requestId` et `approval_id` neufs ; les anciennes
décisions restent intactes et ne sont jamais réutilisées. Une perte de preuves
locales après redémarrage ne permet pas leur reconstruction implicite.

Dans la même candidate, exiger exactement `/usr/bin/true`, sans suffixe, avec
le `change_id` attendu, une décision explicite, une réponse MCP corrélée, une
permission native unique, exit 0 puis `broker_readiness = READY` sans demande
ni permission parasite. Appeler complete avec la nouvelle réservation et
relire `/job` et `/status` avant tout mandat métier. Le superviseur reste gelé
jusqu'à complete ; il suit ensuite cette candidate devenue session du job.

Un nouvel écart sûr reprend cette procédure dans la même candidate, sans
concurrence ni doublon d'une tentative non réconciliée, jusqu'au prévol exact
ou arrêt explicite. Conserver le RUN en attente non terminale, le checkpoint
métier non secret, numéro, identifiants, horodatages, cause, arguments attendus
et observés et références des preuves natives. Maintenir le suivi à la cadence
existante sans boucle serrée. Reprendre au premier jalon non prouvé, sans
rejouer les écritures validées ni les autorisations consommées.


Cette conservation s'applique à retry et ne retire jamais l'autorité d'un
arrêt ciblé explicitement demandé par le développeur. Un tel arrêt reste
distinct : réconcilier les effets et demandes, obtenir le gate `BLOQUÉ`,
désarmer uniquement le job concerné et libérer sa réservation avec preuves,
sans purge ni suppression des historiques. Une nouvelle session ou un nouveau
job exige une autorisation explicite de reprise ; ne fermer ni redémarrer
OpenCode, le broker ou les services communs des autres RUN.


## Remédiation humaine du prévol exécuté sans once

Cette exception exige l'accord spécifique du développeur ; elle ne découle
jamais du feu vert initial. Si `/usr/bin/true` a été approuvé puis exécuté sous
`tools.bash=true` sans permission native `once`, conserver la candidate et les
preuves. Après rétablissement natif de `bash: ask`, demander explicitement
`POST /runs/<run_id>/job/recover` avec `phase: "reconcile"`, les mêmes job,
ancienne session, candidate et recoveryId, `previousPreflightRequestId`, un
`preflightRequestId` inédit et `developerAuthorization` (référence non secrète
de l'accord humain). Aucun autre outil ou commande exécuté n'est admissible.
Le contrôleur vérifie les preuves natives, conserve l'ancien essai invalide
et son empreinte, puis réserve le nouveau. Après redémarrage coordonné, cette
phase ne reconstruit aucune décision locale perdue. `complete` exige encore
un nouveau prévol intégral avec décision et permission `once` propres.
Le retry ordinaire d'une décision approved reste interdit.

OpenCode V2 n'accepte pas le champ V1 `tools` dans le corps d'un prompt. CAB
vérifie donc les règles natives V2 de la session et n'envoie jamais d'instruction
V1. Si une reprise héritée exige une preuve du champ `tools` que le transcript
V2 n'expose pas, CAB conserve le job et refuse la réconciliation sans inférer
une autorisation ou une exécution.


## Réconciliation humaine du rejet après redémarrage — 2.1.32

Après accord humain spécifique, utiliser la phase `reconcile-rejected` de
`POST /runs/<run_id>/job/recover` avec les mêmes jobId, expectedSessionId,
sessionId et recoveryId, previousPreflightRequestId courant, un
preflightRequestId inédit, developerAuthorization et rejectedPreflightProof
(nativeToolCount et nativeToolHash SHA-256 du JSON canonique des outils
natifs complets). Le contrôleur n'accepte qu'un rejet natif corrélé sans
effet et scelle un reçu non exécutable. Ne reconstruire aucune décision.

Sous gel GLOBAL_RECONCILIATION, joindre globalTransactionId exact. Après
réconciliation, confirmer puis libérer cette transaction avec authorization,
evidence et rejectedRecovery : runId, jobId, recoveryId, prochain
preflightRequestId et nativeToolHash retourné dans la dernière tentative.
Le contrôleur recontrôle le reçu, l'historique inchangé et la cohorte.
Aucun outil ne doit être envoyé entre le sceau et la libération. Toute autre
récupération non réconciliée ou effet inconnu interdit la levée. Le nouveau
prévol normal exige ensuite ask, décision, once, exit 0 et READY avant
complete. Cette voie ne remplace ni retry ni la procédure CABU.


## Récupération directe et pagination — source 2.1.32

Le retry historique du refus `access_id` vide reconnaît aussi les erreurs MCP
natives directes qualifiées, en plus de Code Mode : partie assistant tool pour
request_validation/get_approval, executed faux, error de type tool.execution,
itemId natif fc_ lié exactement au call_, et temps created/ran/completed
entiers positifs ordonnés. Le client dérive la provenance et l’empreinte de
la partie complète ; une marque libre ne suffit pas. Le refus déterministe,
les identités/génération exactes, `/usr/bin/true` unique, le lookup natif inconnu
corrélé, la quiescence et l’absence d’effet restent requis. Le prévol suivant
a une identité neuve dans la même candidate. Aucun -32602 n’est fabriqué et
aucun once n’est rejoué. Les autres formes restent refusées.

Pour les historiques volumineux, le client conserve le plafond de 2 Mio et
réduit par moitié la limite de la même page seulement après
`opencode-response-too-large`, de 200 jusqu’à un minimum de un. Il n’avance pas
le curseur et ne conserve aucune réponse partielle lors de cette réduction.
Les pages complètes, l’ordre, les curseurs et la borne de 100 pages restent
contrôlés ; un message unique trop volumineux échoue explicitement. Les autres
erreurs ne sont pas masquées ni réessayées par ce mécanisme. Ne pas purger
ni tronquer le transcript pour franchir cette limite.

Les tests et lectures filtrées qualifient les sources. L’activation CABU et
la récupération réelle du RUN restent des étapes distinctes, coordonnées
séparément ; les services actifs ne sont pas modifiés par cette préparation.


## Diagnostics de notification et refus avant admission — source 2.1.32

Une approbation peut rester `PENDING` alors que sa notification au contrôleur
est `FAILED`. Le champ optionnel `notification_diagnostic` expose le dernier
échec HTTP sous la forme `{http_status, error_code}`. Le code est reconnu dans
une liste fermée pour son statut ; `null` signifie inconnu. Le corps est lu
sous une limite de1024 octets, sans recopier message distant, ressources,
commande ou champ arbitraire. Le diagnostic existant `command-too-long` reste
filtré comme auparavant. La lease exacte conditionne la persistance ; un
résultat périmé n’écrase rien et une livraison réussie retire l’ancien diagnostic.
Les anciennes approbations restent compatibles sans ce champ.

Les refus de validation corrélés au RUN connu sont comptés dans
`GET /runs/<runId>/statistics`, section `contexts[].httpFailures`, y compris
lorsqu’ils surviennent localement avant admission. Chaque requête HTTP compte
au plus une fois ; les réessais sont des tentatives distinctes. Ce compteur
ne représente ni des demandes uniques, ni des décisions `REJECTED`. Une demande
non admise ne doit pas apparaître comme validation indécise. Les compteurs ne
contiennent aucun corps ou contenu métier.

Lire le diagnostic et les révisions réellement observées ; ne pas inventer
une révision0 pour une ressource non listée. Réconcilier l’ancienne demande
sans effet puis préparer une demande exacte neuve selon les règles applicables.
`FAILED` ne donne aucune décision, attribution, admission, permission ou retry
exécutable ; les corrélations, révisions, accès et `ask/once` restent inchangés.
La préparation source n’active rien. L’activation CABU coordonnée est rapportée
avec les versions des processus réels avant notification aux sessions.


## Refus déterministe avant admission — complément 2.1.60

Si la notification de `request_validation` reçoit un HTTP 400/409 et un
`error_code` appartenant à la liste filtrée connue, le broker clôt la même
approval en `NOT_ADMITTED`, événement `APPROVAL_NOT_ADMITTED`. Cela signifie
qu’aucune validation n’a été admise. Ce n’est ni `REJECTED`, ni une décision
Codex ; `decision_id` reste vide, aucun accès/permission/once n’est créé et le
même requestId n’est pas renvoyé. `request_validation`, `get_approval` et
`poll_approval` retournent alors cet état terminal, ce qui arrête le poll.

Après `resource-revision-stale`, l’orchestrateur relit les révisions actuelles
et requalifie exactement le mandat. Toute nouvelle demande utilise un nouvel
identifiant et repasse par une décision CAB indépendante. Les timeouts, 5xx,
diagnostics absents, malformés ou inconnus restent `PENDING` avec le retry
borné existant ; ils ne deviennent jamais automatiquement NOT_ADMITTED.



## Refus de décision HTTP explicites — CAB2.1.32

Appliquer [les diagnostics de décision](decision-http-diagnostics.md).
Les anciens400 vides deviennent JSON {error,message,decision_recorded}, avec
codes fermés et messages filtrés. Conserver statut et corps avant parsing ;
GETdecision404 peut coexister avec une demande indécise. decision_recorded
reflète la table locale, pas une décision native ni une persistance durable.
Aucun diagnostic ne valide, ne rejoue ou ne reconstruit une décision/once.



## Reprise des incidents natifs — CAB 2.1.32

Appliquer [la procédure de diagnostic et reprise](native-coding-recovery.md) : préparer les nouveaux mandats avec nativeCodingMandate, distinguer catalogue MCP et outils natifs et utiliser diagnoseCodingTurn sur le SID et l’ancre utilisateur exacts. Erreur fournisseur ou entrée incomplète/divergente impose examen des effets et réconciliation, sans retry, once rejouée ou bascule spontanée. Conserver le choix LLM explicite. Vérifier le conducteur entier : READY, compilation ou proposition ne prouvent pas les tests. Le moniteur utilise GET /monitor/runs, projection compacte non autorisante ; le plafond 2 Mio reste inchangé et les causes de panne sont distinctes.



## MCP pending et récupération CABU — 2.1.32

Appliquer [la procédure MCP pending](mcp-pending-recovery.md). Attendre la transition dans le budget existant sans réémettre connect/disconnect. MCP_RECOVERY_REQUIRED reste nonterminal dans le même reçu ; aucune nouvelle installation ou boucle de repli implicite. Le flag updater --recover-mcp <transactionId> signifie rechargement GLOBAL des locations et exige un accord humain explicite pour ce reçu, jamais l’accord d’un ancien incident. Il peut récupérer un statut `failed` uniquement après ce consentement et une snapshot idle sans permission ; `needs_auth`, profil gelé/reuse-readonly et reçu divergent restent refusés. Intention durable avant POST, jamais rejouée ; PID/location/sessions et frontière native vérifiés. Si le source CAB a ensuite avancé, la reprise peut clore `SUPERSEDED` seulement selon les empreintes strictes documentées ; le CABU suivant installe le jeu complet dans un nouvel identifiant. Après récupération : versions et readiness prouvées, puis information des sessions ; aucune once ou demande métier rejouée.
