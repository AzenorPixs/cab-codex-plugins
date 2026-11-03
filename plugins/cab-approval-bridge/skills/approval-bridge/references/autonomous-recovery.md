# Reprise autonome dans le change — CAB 2.2.4

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
| Validation PREPARED/approved non consommée | Revue de lecture et annulation native exacte selon la section suivante. |
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
