# Reprise autonome dans le change — CAB 2.2.21

Le développeur intervient pour une décision hors du périmètre validé du change.
Dans ce périmètre, l’orchestrateur décide des mandats, revoit le code et les
preuves, valide les résultats et organise les reprises. L’agent de codage
produit le travail. Une lacune technique est à instruire par l’orchestrateur ;
elle ne devient pas une demande humaine automatique. Aucune décision ne
remplace une preuve, une permission native ou une garde de ressources.

## Choisir la voie selon la frontière

Lire GET `/runs/<run_id>/recovery`, puis le diagnostic de la seule opération :
GET `/runs/<run_id>/recovery/native-evidence?operationId=<operation_id>`.
Cette consultation ne lance ni commande, prompt ou permission. Elle filtre les
commandes et secrets, expose digests, callIDs, refus journalisés et couverture.
Un journal synchronisé sans événements pertinents est une lacune, pas NO_EFFECT.
`hasUnresolvedValidation` décrit la communication active ;
`unresolvedOperationCount` et `hasUnresolvedOperation` incluent le registre durable.
Un agrégat historique non nul ne gèle pas les ressources prouvées compatibles.

| Frontière | Suite dans le mandat |
|---|---|
| Politique absente | L’orchestrateur qualifie sa délégation et installe une policy neuve liée au RUN/contexte/version et aux ressources ; aucun nouveau consentement humain si le mandat couvre déjà l’action. |
| Shell PREPARED/APPROVED refusé avant once sans accès | [shell approuvé sans accès](approved-shell-retirement.md) ; composition acquisition puis clôture, uniquement si le manifeste reste admissible. |
| PREPARED/APPROVED avec accès HELD, avant émission native | [retrait APPROVED/HELD](approved-held-retirement.md) ; le propriétaire clôt l’accès avec RECONCILED sous les gardes existantes. |
| Validation PREPARED/approved non consommée sans accès lié | Revue de lecture et annulation native exacte selon la section suivante. |
| Port de serveur local sous quarantaine, once consommée | Deux sondes natives indépendantes, puis réconciliation bornée ; aucune once historique rejouée. |
| Preuve encore insuffisante | Continuer le diagnostic ou choisir une ressource disjointe autorisée ; garder l’incertitude et ses protections. |
| Décision hors du change | Présenter au développeur l’extension précise, son impact et les éléments déjà prouvés. |

## Annuler une validation locale après revue

La policy autorise `cancel-reviewed-validation` sur les ressources de l’opération.
POST `/runs/<run_id>/recovery/action` utilise les champs habituels : actionId,
ownerId, policyId, boundaryDigest du plan actuel, action, targetId et input.
L’input contient nativeBoundaryDigest du diagnostic actuel et review :

- ownerId, effect=`READ_ONLY`, commandSha256 exact ;
- sourceFiles : liste des `{path, sha256}` relus, dans les ressources déclarées ;
- evidenceRefs : références de revue, sans texte de commande ou secret ;
- rejectedCalls : `{callId, permissionId, auditExecutionId, ackStatus:204}` ;
- wrapperReviews si nécessaire : `{callId, codeSha256,
  effect:"VALIDATION_TRANSPORT_ONLY", returnsNativeResult:true}`.

La revue est une attestation traçable de l’orchestrateur. Des références d’ACK
historiques auditées ne sont pas recréées comme nouveaux reçus serveur. Le code
et les sources doivent réellement avoir été revus : aucune classification de
lecture par mot-clé ou simple champ déclaré n’est une revue.

Le serveur exige PREPARED/approved, aucune entrée native ou accès lié, aucune
once consommée, une session idle sans permission et deux observations identiques.
Les seuls shells retirés du suffixe sont les calls aborted/non exécutés selon
le format natif, au même digest de commande, explicitement couverts par la
revue. Ce flag seul ne prouve pas l’absence d’exécution. Les wrappers relus
restent limités au transport de validation ; une retry NOT_ADMITTED ne doit
pas être admise localement. Un autre outil, une admission réelle ou un digest
divergent conserve la protection.

Le résultat annule la validation CAB, conserve la décision historique approved
et retire sa réponse exécutable. Il expose `UNDETERMINED_READ_ONLY` et
`ORCHESTRATOR_AUDIT_REVIEW` : aucun exit ou NO_EFFECT natif inventé.
Relire le même actionId après réponse perdue ; ne pas rejouer la commande.
L’orchestrateur réconcilie aussi son suivi de mandat courant via job/progress
avant de préparer le prochain mandat.

## Réconcilier un port ancien dont la sortie est perdue

Cette voie vise un serveur Vite local sous timeoutQuarantine, un seul port write,
une once déjà acquittée et aucun résultat natif. Elle ne s’applique pas aux
opérations de fichiers, LXC ou aux shells background disposant de leur suivi natif.
L’instance OpenCode doit être prouvée antérieure à l’invocation : observation
privée du contrôleur ou reçu CABU antérieur de même contexte/PID/version/location.
La sonde confirme aussi le starttime du processus ; une divergence reste refusée.

Pour chaque nouveau probeOperationId inédit, lire :
`GET /runs/<run_id>/recovery/port-probe-command?operationId=<original>&nonce=<probeOperationId>&runtimeDirectory=.`
La réponse fournit la commande exacte et son digest. Elle n’exécute rien.
L’orchestrateur doit revoir puis mandater cette nouvelle lecture, lui attribuer
le port en read, obtenir sa décision et sa propre permission once, puis vérifier
exit0 et libérer cet accès de sonde. Les deux operationIds sont distincts.
Utiliser la commande sans reconstruction manuelle ; l’indication native donne
workdir, timeout positif et background=false. L’ancienne once n’est pas réutilisée.

La sonde tourne dans le compte natif, sans sudo. Elle lit /proc et getconf
CLK_TCK (libc-bin de Debian), n’écrit rien et ne tue aucun processus. Elle
vérifie les namespaces, le projet complet et les processus de ce compte/cgroup ;
seuls OpenCode, le broker identifié et les ancêtres vérifiés du diagnostic sont
exclus. Elle ne lit ni cmdline ni environ. Un listener, un processus candidat,
un accès refusé ou une couverture incomplète ne qualifie pas la quiescence.
Les deux captures doivent être fraîches (deux minutes) et cohérentes. Elles ne
bloquent pas les autres RUN : attendre une fenêtre naturelle ou travailler sur
une ressource compatible, sans arrêter les pairs.

La policy autorise `reconcile-quarantined-port`. L’input de recovery/action
contient nativeBoundaryDigest frais, probeOperationIds (les deux lectures) et
review : ownerId, serverKind=`VITE_LOCAL_DEV_SERVER`, commandSha256 de l’ancien
lancement, runtimeDirectories=["."], sourceFiles relus/épinglés (dont le
package.json pertinent), noDetachedWorkOutsideDirectories=true,
noProcessIsolationOrCredentialChange=true et evidenceRefs.
La revue doit s’appliquer à l’invocation historique, pas seulement à une version
ultérieure du code ; sinon conserver la quarantaine.

Le contrôleur relit les deux résultats depuis l’API native, vérifie leur code
exact, nonce, once, exit0, accès libéré et identité. Il journalise les captures
avant de clôturer seulement la coordination ciblée : opération CANCELLED,
ancienne once conservée, accès RELEASED/outcome=RECONCILED. L’issue publique est
`HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT` ; nativeResult reste absent.
Ce n’est ni un exit0 historique ni NO_EFFECT. Un nouveau serveur exige son
nouveau mandat et sa nouvelle once ; le lancer avec background explicite et
shellID suivi selon [shell-background](shell-background.md) pour éviter cette ancienne frontière.

## Ajouter une ressource de remplacement disjointe

POST `/runs/<run_id>/extend-compatible` avec le header de continuité habituel.
Corps : extensionId inédit, ownerId, version actuelle, expectedManifestDigest
issu du plan, resources (ajouts seulement), authorization (référence du mandat)
et evidence (références de revue).

Les ajouts doivent rester dans le namespace et les droits déjà réservés
(type/hôte ou répertoire), être disjoints des protections et ne créer aucun
conflit. Une route ne décide pas si un objectif différent est autorisé :
l’orchestrateur confronte son choix au périmètre validé du change.
Le manifeste grandit sans changer version, anciens tokens/fencing ou états.
Cette route ne remplace pas les gardes historiques de extend/reduce. Relire le
même extensionId après réponse perdue ; un digest périmé ou reçu réutilisé
avec un autre contenu est refusé. Les opérations sur le nouveau périmètre
restent soumises à leur revue, demande, accès et permission propres.

## Conserver les prochains refus natifs

Le client journalise reject par permission dans le sous-répertoire privé
`permission-replies` du runtime CAB du workspace. L’option API
permissionReceiptDirectory permet un stockage privé explicite (notamment en
fixture), sans changer la location HTTP. Il écrit l’intention avant POST et
ACKNOWLEDGED après HTTP204 avec replyOrigin=`CAB_CLIENT_PROGRAMMATIC`.
Une intention sans ACK reste indéterminée et ne renvoie aucun second POST.
Le diagnostic distingue ces reçus des attestations de revue historiques.

## Restaurer une notification PENDING perdue par le contexte

La policy propriétaire autorise restore-pending-validation. L’opération doit
être PREPARED sans décision, native, résultat ou accès ; le job courant et la
session doivent être exacts, idle et sans permission. Faire un get_approval
natif sur l’approval existante, puis relire la part outil réelle : PENDING,
identité exacte et non expirée. Cette lecture doit dater de moins de cinq
minutes au moment de l’action. Le diagnostic native-evidence et le plan
recovery fournissent leurs digests frais.

POST recovery/action avec action restore-pending-validation, targetId de
l’opération et input={nativeBoundaryDigest}. Le serveur restaure seulement
la communication de cette même identité. Une décision propriétaire distincte
reste obligatoire ; aucune request_validation neuve ou permission n’est créée.
Une fois la décision prise, relire son reçu puis demander au même SID de lire
cette approval avant toute suite. Une demande expirée ou un effet correspondant
observé n’est pas réactivé par cette voie.

## Clôturer un terminal de lecture sans reçu once local

La policy autorise reconcile-reviewed-terminal. Le candidat est PREPARED avec
décision approved durable, sans native, nativeResult ou accès. Une seule commande
shell de même identité doit être terminée dans le transcript V2, sans background
ni troncature, avec exit entier. Les autres effets ou admissions sont refusés.
L’orchestrateur revoit réellement la lecture, la commande complète, l’environnement
pertinent et les sources historiques avant de déclarer effect READ_ONLY.

L’input de recovery/action contient nativeBoundaryDigest et review : ownerId,
effect="READ_ONLY", commandSha256, callId et partDigest du terminal fournis par
le diagnostic, sourceFiles=[{path,sha256}] épinglés dans les ressources de
l’opération et evidenceRefs. Cette déclaration ne remplace pas la revue.
Les deux observations natives, le contexte et les sources doivent concorder.

Seule la coordination devient COMPLETED. Le reçu porte
NATIVE_TERMINAL_OBSERVED_PERMISSION_UNVERIFIED / ORCHESTRATOR_AUDIT_REVIEW.
Le nativeResult et la native once demeurent absents ; aucun NO_EFFECT n’est
inventé. La réponse exécutable locale est invalidée sans rejouer la commande.
Ce terminal relu ne qualifie pas rétroactivement le fonctionnement des permissions.
Le mandat suivant exige sa propre demande, sa revue, son accès et sa once.

Pour ces deux actions, relire le même actionId après réponse perdue. Une
intention préparée peut reprendre les écritures techniques manquantes après
relecture des gardes ; une preuve périmée exige un diagnostic frais, sans purge
ou répétition native. Les erreurs conservent leur reçu et leurs protections.

## Historique long et anciennes revues closes

La clôture reconcile-reviewed-terminal réutilise uniquement les revues
cancel-reviewed-validation DONE/HTTP200 du même owner/RUN/contexte/version,
si l’ancienne opération reste CANCELLED sans native et avec completionDigest
concordant. La demande native exacte, les calls aborted et les wrappers déjà
revus sont revérifiés : mêmes identités, commande/code, format natif, antériorité.
Le nouveau reçu conserve actionId/proofDigest/partDigest de ces anciennes
parties ; le diagnostic complet reste visible. Aucune liste fournie par
l’appelant ne peut rendre un call ignorable. Les parties inconnues, dupliquées,
modifiées ou portant un effet non couvert restent refusées.

Les diagnostics MCP connus sans capacité d’exécution dans le projet restent
consultables, même quand leur retour est transformé. Un tel retour n’est pas
une preuve d’approbation. Un request_validation MCP échoué sans propriétaire
local n’est pas déclaré NOT_ADMITTED par supposition : sa seule observation
de transport ne constitue pas un effet natif et reste dans le transcript.
Les snapshots complets restent indépendants ; l’indexation des identités
évite les reparcours du transcript pour chaque call déjà revu.

## Retirer une validation approuvée jamais émise

Pour un shell refusé sans accès que la branche edit ne couvre pas, consulter
[shell approuvé sans accès](approved-shell-retirement.md) ; ne pas forcer une preuve d’annulation broker.

Si un accès est déjà HELD, suivre [retrait APPROVED/HELD](approved-held-retirement.md) ; la voie ci-dessous
exige l’absence d’accès lié. Ne pas demander au correcteur d’effectuer
une clôture ordinaire déjà couverte par le mandat propriétaire.


La policy propriétaire autorise withdraw-unissued-validation sur les ressources
exactes de l’opération. Faire les lectures fraîches du plan et du diagnostic,
puis POST recovery/action avec cette action, targetId=operationId,
input={nativeBoundaryDigest,evidence:[référence de revue et de retrait]}.
Aucun rejectedCalls ou refus natif n’est à fabriquer : la route est distincte
de cancel-reviewed-validation, dont les gardes restent inchangées.

Le serveur exige PREPARED/approved, aucun native/nativeResult/accès lié,
session idle, zéro permission, aucun appel à effet après la demande native
exacte, job/contexte/version exacts et deux observations stables. Il retire
la réponse exécutable locale et clôt seulement la coordination CANCELLED,
avec COORDINATION_WITHDRAWN_BEFORE_ISSUANCE / OWNER_NATIVE_BOUNDARY_REVIEW.
L’approved historique reste conservé. Ni once, nativeResult, annulation native
ou NO_EFFECT n’est fabriqué ; les autres accès/leases restent protégés.
La commande de remplacement exige une nouvelle identité et son cycle normal.
Relire le même actionId après réponse perdue.

## once : responsabilité du contrôleur

L’orchestrateur décide via CAB puis laisse le contrôleur acquérir/lier l’accès,
écrire l’intention, répondre once et journaliser l’ACK. Il ne répond pas
once directement par client.replyPermission. Un HTTP204 externe ne prouve
pas un reçu CAB, l’accès ou son fencing ; ne pas les reconstruire après coup.
La clôture revue d’une lecture conserve explicitement la permission non
qualifiée ; les autres effets restent protégés.

## Port sans listener avec processus candidats

listening=false ne suffit pas si quiescent=false ou matchingProcessCount>0.
Des candidats changeants ne prouvent ni un lien à l’ancien Vite ni sa fin ;
cgroup/netns stables indiquent un contexte commun. Deux captures espacées de
plus de120s sont aussi hors fenêtre. Augmenter la borne seule ne rend pas
une capture non quiescente valide. Conserver once, port et issue incertaine.

Continuation : relire plan/manifeste ; utiliser extend-compatible pour un
port disjoint du même hôte et des mêmes droits couverts par le change ;
mandater ensuite un nouveau serveur background explicite avec shellID, accès
et once propres, puis le test. L’extension ne libère pas l’ancien port et ne
vaut pas permission d’exécution. Préparer les sondes/mandats avant une fenêtre
naturellement calme ; vérifier exit0, quiescent=true, identité, fraîcheur et
accès libérés avant reconcile-quarantined-port. Sinon poursuivre les travaux
disjoints, sans arrêter les pairs ni attribuer les candidats à Vite par
supposition. La clôture historique reste non prouvée ; aucune procédure ne
peut effacer cette incertitude sans preuve supplémentaire.

## Permission shell décomposée — CAB2.2.21

Une permission shell peut porter plusieurs ressources ;elle autoriserait
l’appel entier, pas une once par fragment. CAB ne déduit aucune équivalence
par concaténation. Une forme non qualifiée par la garde d’exécution reste
sans once, même si le mandat porte une commande composite.

Le pilote refuse la permission par
`client.replyPermission(sessionId, permissionId, 'reject', workspace)` du
client CAB applicable. Pour une cible shell refusée par le validateur, le
client vérifie séparément workspace, session, permission et source/message/call
natifs, puis le PID/version. Il écrit INTENT avant POST et ACKNOWLEDGED après
HTTP204 et contrôle d’identité, dans permission-replies du runtime privé.
Une réponse incertaine n’est pas rejouée ;un ACK relu est idempotent.

Ce reçu CAB_CLIENT_PROGRAMMATIC de refus natif n’est pas une décision de mandat
REJECTED. La décision historique APPROVED reste distincte de la réconciliation
CANCELLED et de la libération. Le reçu seul ne prouve pas NO_EFFECT. Le
propriétaire examine les preuves et applique la récupération existante ;les
anciennes identités et permissions ne sont pas réutilisées. Aucun reçu absent
ne se fabrique rétroactivement. Des mandats unitaires ou le transport shell
scellé existant permettent d’éviter une décomposition non qualifiée.

## Retirer un edit refusé avant once — CAB2.2.21

Utiliser la policy propriétaire withdraw-unissued-validation et la même route
recovery/action, targetId de l’opération, input={nativeBoundaryDigest,evidence}.
Relire le plan et le diagnostic natif après activation de la version applicable.
Le diagnostic expose désormais edit, inputSha256 et les reçus liés au call.

L’exception accepte un seul edit natif V2, error/aborted et executed=false,
visant le seul fichier de la validation. Elle exige le reçu privé exact
reject/ACKNOWLEDGED/HTTP204 CAB_CLIENT_PROGRAMMATIC, même SID, call, cible et
PID/version, avec chronologie cohérente. L’input réel est haché et conservé
dans le reçu de récupération ;son empreinte peut différer de l’empreinte
approuvée précisément parce que l’exécution a été refusée. L’empreinte
historique n’est jamais remplacée pour rendre l’ancien input exécutable.

Deux observations stables doivent confirmer session idle, zéro permission,
aucun accès/native/nativeResult/once de l’opération, et aucun autre effet
après la demande, y compris dans son wrapper. Un reçu manquant, une erreur
non typée aborted, une cible étrangère ou une histoire divergente refuse le
retrait. Ne pas faire passer cet edit dans une revue de commande READ_ONLY.

Seule la coordination devient CANCELLED ;APPROVED reste historique, avec
COORDINATION_WITHDRAWN_BEFORE_ISSUANCE / OWNER_NATIVE_BOUNDARY_REVIEW. Aucun
NO_EFFECT, résultat natif, once ou reçu de rejet rétroactif n’est créé.
Relire le même actionId après réponse perdue. La nouvelle proposition aura
ses propres identités, révisions et empreinte, après revue du fichier actuel.

Shell refusé avant once attaché à un parent HELD : [retrait ciblé](approved-attached-shell-retirement.md). Conserver le parent et ses autres effets.

NOT_ADMITTED natif et préparation sans décision : [retrait qualifié](not-admitted-retirement.md). Une absence temporaire de readiness donne503, pas une incompatibilité de contrat.
