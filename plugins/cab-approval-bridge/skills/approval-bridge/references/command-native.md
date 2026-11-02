# Compléments natifs — CAB 2.2.0

## Récupération contrôlée de session dans le même RUN

Après un écart refusé sans effet, interrompre l'ancienne session, traiter son
rapport et clôturer le mandat courant avec `/runs/<run_id>/job/progress`. Ne pas réarmer le
job pour remplacer sa session : `/runs/<run_id>/job/arm` reste immuable. Créer la candidate
par l'API native OpenCode dans le même `directory`, avec permissions natives
`ask`, sans lui confier de travail métier.

Pour une récupération adossée à un RUN, appliquer intégralement
[`native-coding-recovery.md`](native-coding-recovery.md) : candidate idle sans permissions en attente, règles effectives `shell: ask` et `edit: ask`, puis découverte Code Mode littérale et scellée de `request_validation` avant `prepare`. Après le gel, aucune nouvelle discovery n'est admise dans une recovery courante. La complétion d'une recovery RUN historique déjà préparée sans signature scellée peut seulement réconcilier une discovery native unique, exacte, complète et read-only dans son transcript, sans rejouer de permission. Le prévol utilise explicitement `timeout_seconds: 120` et `interval_seconds: 3` ; un timeout conserve le même approval ID pollable.

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
locale du prévol : si elles sont perdues, la récupération reste refusée et
nécessite une décision humaine. L'API ne remplace ni une session révoquée ni
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

## Mandats d’inventaire ou d’analyse en lecture seule — OpenCode V2

Attendre l’inactivité de la seule session ciblée, puis utiliser
`PATCH /api/session/{sessionID}` avec ses règles `permissions`. Interdire les
actions natives `shell` et `edit` (cette dernière protège aussi `write`), ainsi
que les délégations et skills non autorisés. Exemple de règles de refus à
intégrer sans perdre les restrictions existantes :

```json
{"permissions":[{"action":"shell","resource":"*","effect":"deny"},{"action":"edit","resource":"*","effect":"deny"},{"action":"subagent","resource":"*","effect":"deny"},{"action":"skill","resource":"*","effect":"deny"}]}
```

Relire `GET /api/session/{sessionID}` et vérifier les dernières règles
applicables avant le prompt. Conserver uniquement les lectures et recherches
autorisées par le mandat. Le texte « lecture seule » ne remplace pas les
permissions ; ne pas reprendre un exemple V1 `tools`/`noReply` dans un prompt V2.
Aucune configuration persistante OpenCode n’est modifiée.

## Réactivation sûre des outils — OpenCode V2

Avant une opération, attendre l’inactivité puis rétablir par PATCH les seules
actions nécessaires à `ask`, de portée `*`, en conservant les autres refus.
Relire la session et vérifier la dernière règle applicable pour `shell`
(normalisé `bash` par CAB) ou `edit`, y compris les noms à jokers. Une règle
spécifique ultérieure ou une preuve absente suspend le mandat.

Envoyer ensuite le prompt V2 `{text, resume: true}` sans champ `tools` ni
réécriture de permission. L’activation d’un outil ne constitue aucune décision
CAB : chaque opération exige sa demande corrélée, son accès et sa permission
`once`. Le contrôleur recontrôle `ask` avant admission, décision `approved` et
transmission de `once`. Les diagnostics `native-permission-ask-required`,
`native-permission-control-unavailable`, `native-permission-context-divergent`
et `preflight-native-ask-required` restent bloquants. Une modification externe
des règles après contrôle n’est pas atomique avec l’exécution native.

## Édition partielle native OpenCode 2.2

Le banc privé CAB qualifie un outil natif direct `edit`, présenté au modèle
avec cette signature :

```json
{"path":"/chemin/absolu/du/fichier","oldString":"texte exact et unique","newString":"texte de remplacement","replaceAll":false}
```

`path`, `oldString` et `newString` sont requis ; `replaceAll` est facultatif,
faux par défaut. `oldString` et `newString` doivent différer. Si le texte
ancien apparaît plusieurs fois, ajouter le contexte permettant un match unique ;
ne pas activer `replaceAll` sans revue explicite de toutes les occurrences.
Lire le fichier dans le périmètre autorisé et revoir le remplacement exact,
son empreinte avant/après et sa cible unique avant la décision CAB.

Appeler `edit` directement comme outil natif exposé au modèle. `search` dans
Code Mode explore le catalogue Code Mode (MCP et helpers internes annoncés) ; son résultat, même vide, ne démontre pas
l’absence d’un outil natif. Ne pas inventer `tools.edit` ou un outil `apply_patch`
non exposé. Distinguer catalogue natif réellement transmis au modèle, catalogue
MCP, règles de permissions et texte du prompt. Si le modèle n’appelle pas
l’outil exposé, corriger le mandat ou qualifier le modèle avant de conclure à
une absence runtime ; un repli shell exige sa propre commande et décision CAB.

La preuve positive qualifiée lie demande CAB d’un fichier, décision explicite,
accès d’écriture, permission native `edit` de source vérifiée, `once`, fin native
et contenu exact. Le refus natif et le remplacement ambigu sont qualifiés sans
écriture. Cette qualification utilise OpenCode privé et fournisseur synthétique ;
elle ne prouve pas le choix d’outil d’un modèle réel ni une activation CABU.

## Supervision entre deux mandats

Pour un RUN piloté sans `currentCabMandate`, le superviseur publie `WAITING`
avec `orchestrator-mandate-required`. L’orchestrateur examine cet état puis
prépare le mandat suivant ; aucun prompt automatique n’est envoyé au codeur.
Un gate `OPEN`, une récupération achevée ou une échéance de 60 secondes
n’autorisent ni commande, ni lecture, ni édition. Un mandat déjà déclaré et
les gardes de pause, récupération, permissions et accès restent prioritaires.


## Environnements de test et rafraîchissement — 2.1.32

Pour les RUN coordonnés, consulter le protocole `test-resources-v1` et la référence concurrent-runs avant tout usage Docker/LXC. Acquérir l'environnement avant préparation et le conserver entre commandes jusqu'aux preuves de fin, nettoyage et restitution. Le moniteur affiche les attentes de test et propose une cadence locale Manuel/1s/3s/7s/30s/1m/5m/10m/30m avec Actualiser ; sa carte Web conserve Disponible pendant 30 minutes après un rafraîchissement réussi. Ces fonctions ne déclenchent aucune mise à jour de service par leur présence dans les sources.

Les navigateurs externes de test déclarés dans DEVOPS.md, actuellement Chromium et Firefox, suivent aussi ce cycle avec les clés `browser:<hôte>/<navigateur>`. La réservation reste détenue jusqu'à fermeture des sessions WebDriver/BiDi et processus, libération des ports et profils temporaires du change, nettoyage puis vérification distincts. Les sessions utilisateur préexistantes sont préservées. Les ensembles navigateur/conteneur sont acquis atomiquement ; des mécanismes indépendants peuvent avancer.

## Modèle du prompt et PLLM automatique

Avant un nouveau job piloté 2.1.32, appliquer intégralement references/model-policy.md après le bootstrap du monitoring. Un modèle concret explicite reste prioritaire. Sinon, utiliser la PLLM automatique actuelle ; sans raisonnement explicite, demander medium. Si medium est indisponible, demander high sur le même modèle ; examiner la politique PLLM suivante seulement si les deux niveaux sont indisponibles. Un modèle explicite incompatible bloque. Résoudre OC_Codex_PLLM_CATALOG depuis le skill actif et négocier pllm-auto-v1 ; armer avec modelSelection et la preuve native modelPreflight du prévol exact. Vérifier codingModel dans le job. Une reprise conserve le contexte et réexamine la priorité medium puis high selon la section de convergence ; aucun changement actif implicite n’est autorisé. Les anciens jobs non négociés restent historiques. Le broker et le moniteur ne choisissent pas de LLM.

La session de pilotage définit explicitement providerMaxBytes pour la lecture /provider dans /model-policy/resolve et le répète dans modelSelection à l'armement, selon references/model-policy.md du skill installé. Ce budget local en octets n'élargit ni les autres observations ni le catalogue PLLM.

## Préparation du catalogue avant démarrage et nouvel armement

Cette préparation est requise pour PLLM automatique. Un modèle concrètement imposé conserve la voie explicite existante du contrôleur ; ne pas lui imposer une nouvelle dépendance de publication PLLM.

Résoudre la racine du skill PLLM effectivement actif depuis le catalogue de skills de cette session ; ne pas rechercher dans des configurations privées. Exécuter le script du paquet installé `scripts/cgpt-approval-bridge-prepare-model-policy.mjs --pllm-skill-root <racine-absolue-active>`. Si un chemin de catalogue explicite est déjà fourni, le transmettre avec `--catalog-path <chemin-public>` ; les options de configuration explicites et leur alias historique restent prioritaires sur la découverte du skill.

Le script valide le fichier public régulier et borné ainsi que la publication, sans benchmark ni écriture. Sa sortie contient uniquement catalogPath, source et environment={OC_Codex_PLLM_CATALOG:...}. Pendant le démarrage ou la maintenance expressément autorisés, fusionner ce seul patch dans la configuration du contrôleur en conservant toutes les autres options. Préserver l'échappement littéral EnvironmentFile ; ne jamais utiliser source ou eval ni afficher un environnement complet. La préparation seule ne configure ni ne redémarre le service.

Après démarrage ou rechargement coordonné, appeler /model-policy/resolve avec les exigences du prompt et providerMaxBytes choisi par la session. Exiger une résolution réussie du contrôleur avant prévol et nouvel armement ; la simple réussite du CLI ne prouve pas la transmission au service. pllm-catalog-unconfigured indique un raccord absent dans le processus chargé ; les autres diagnostics de catalogue, fournisseur ou prévol restent distincts. Ne pas contourner par un modèle manuel. Une erreur conserve le job non armé et exige la récupération autorisée.

Pour le raccord 2.1.32, utiliser la préparation sans effet du catalogue dans references/model-policy.md avant le démarrage autorisé, transmettre son patch au contrôleur puis vérifier /model-policy/resolve avant nouvel armement. Conserver la provenance logique et employer le fournisseur natif vérifié. Les variantes parent imbriquée/historique et assistant présent doivent rester cohérentes. Aucune activation n’est déduite de cette préparation source.

Pour `cab-source`, si les services sont configurés pour un autre projet, fournir
`--service-workspace <workspace-absolu-observé>` : les contrôles de version et
les appels MCP ciblent ce workspace réel sans modifier les configurations.
La récupération conserve le même journal et les mêmes destinations. Le jeu Web
indépendant inclut aussi cgpt-approval-bridge-opencode-client.mjs,
cgpt-approval-bridge-permission-policy.mjs et cgpt-approval-bridge-process-lifecycle.mjs.

Contrat courant CABU 2.1.81 : les tolérances historiques de broker non vérifiable
ne permettent plus le succès si OpenCode est actif. Une absence prouvée est
requise pour la seule exception broker. Appliquer le contrat de coupure courte
de component-update.md ; ne prévenir ni modifier les RUN pour cet update.


### Permissions réappliquées par DIU

DIU peut remettre le répertoire `~/.config/cab-approval-bridge/` en `0770`. Dans CAB 2.1.32, la lecture du credential existant reste possible si `opencode.password` est un fichier ordinaire, sans lien, détenu par l’utilisateur du service et protégé en `0600`. Le passage du répertoire à `0770` ne prouve donc pas une panne de l’API OpenCode.

Le provisionnement d’un credential absent exige en revanche un répertoire détenu par l’utilisateur et non modifiable par le groupe ou les autres. Si DIU a remis `0770` et que le fichier manque, rétablir les permissions sûres du seul répertoire CAB, par exemple `0700`, avant le raccord explicitement autorisé à OPENCODE_PASSWORD. Préserver le credential et son mode lors des mises à jour DIU ; ne jamais afficher sa valeur. La variable reste facultative pour les projets qui n’utilisent pas OpenCode.

### Fermeture liée au serveur OpenCode — 2.1.32

Les trois services se ferment après disparition locale prouvée du serveur OpenCode auquel ils se sont rattachés. Une panne HTTP/SSE, la fermeture d’un simple client ou une identité non vérifiable ne suffisent pas. Le démarrage sans OpenCode attend le premier rattachement. Cet arrêt technique conserve RUN, jobs, réservations et gels ; il ne constitue ni gate terminal ni purge. La remise en service est explicite et la reprise suit la réconciliation normale. Le statut 78 signale un nettoyage incomplet sans relance automatique. Aucune installation ni activation n’est déduite du seul changement de version source.

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

Après redémarrage, réconcilier la même validation annulée par OpenCode si
`request_validation` et `cancel_approval` sont tous deux visibles dans des
wrappers Code Mode complets, non tronqués et `executed=false`. Le wrapper
d’annulation doit contenir le code littéral exact qui découvre
`cancel_approval`, puis son appel unique avec l’`approval_id` exact ; la sortie
doit confirmer `CANCELLED`, `cancelled_by=OC` et les identités complètes de la
demande. Exiger deux lectures identiques du transcript, une session inactive,
et l’absence de permission et d’accès. Toute divergence, troncature ou appel
supplémentaire conserve l’opération `PREPARED`, sans décision ni `once`.

## Raccord Code Mode OpenCode 2.2 — 2.1.32

Le client reconnaît seulement le retour direct d'un appel MCP cgpt-validation
avec objet de données littérales. Les clés peuvent être des identifiants
statiques non cités ; les valeurs restent des données JSON. Les métadonnées
toolCalls doivent concorder et la sortie ne doit pas être tronquée. CAB
n'évalue aucun programme. La découverte search reconnue reste diagnostique.
Une transformation de résultat, une variable, un calcul, un appel caché ou
une provenance fabriquée conserve une enveloppe execute bloquante. Le sceau
couvre l'enveloppe native complète et les anciens outils directs restent
stables. Les clés de provenance internes reçues dans les métadonnées sont
écartées puis produites seulement par la projection vérifiée.

OpenCode 2.2 nomme sa commande native shell. Le client conserve sa source
native et la rattache au contrat interne bash. Il vérifie l'appel source,
la commande, l'absence de background et le workdir courant avant once. Les
permissions d'écriture relatives sont rapprochées du fichier du contexte
et de l'appel natif. Les règles shell: ask doivent couvrir le nouvel appel ;
une seule règle historique bash: ask ne suffit pas pour transmettre once.
Le drapeau executed ne prouve pas l'effet : OpenCode 2.2 termine réellement
shell et write avec ce drapeau faux. CAB exige permission once acquittée,
identité d'appel, cible, dates et résultat ; shell exige sa fin et son exit
natifs. Une fin non corrélée garde ses protections.

Le rejet réconcilié accepte les découvertes reconnues, un polling interrompu
en lecture seule et le relais natif du rejected décidé par CGPT, avec rejet
terminal exact obligatoire. Aucun ancien accord n'est restauré comme
exécutable. Qualifier avec CAB_TEST_OPENCODE=/chemin/vers/opencode-2.2
et le banc tests/native-opencode-codemode.test.mjs : serveur privé, fournisseur
synthétique loopback, broker réel, prévol et écriture sous once, puis contrôle
de disparition du broker et nettoyage. Aucune configuration ou credential
réel n'est copié. Après archive et publication, CABU précède le recovery réel.

## Découverte non autorisante — complément 2.1.32

Le diagnostic Code Mode admet aussi un unique search à données littérales
suivi du retour d'une chaîne littérale fixe. La liste toolCalls doit être
exacte, terminée, concordante et non tronquée. La projection reste
cab_codemode_discovery ; le texte, même APPROVED, n'a aucune autorité.
Une variable, un appel ajouté ou une expression inconnue conserve le refus.
Ce complément ne change ni admission MCP, ni permissions, ni once, ni fin.
La distribution commune est 2.1.81 ; les preuves 2.1.8 restent historiques.

## Priorité medium puis high — nouvelles sessions et reprises

Pour une nouvelle session ou une reprise autorisée, converger vers `medium`
lorsqu’il est réellement publié et disponible sur le modèle retenu. Se
replier sur `high` seulement si `medium` est absent, désactivé ou rejeté par
une preuve native d’incompatibilité. Une erreur réseau, de quota ou
d’authentification ne prouve pas cette indisponibilité. Un niveau explicitement
imposé par le développeur reste prioritaire. Prévoler exactement le choix
avant de générer un mandat.

Une reprise historique en `high` réexamine donc `medium`, sans conserver
`high` par simple habitude. Préserver fournisseur/modèle, RUN, job, réservations,
mandats et preuves ; préparer la transition à une frontière autorisée, vérifier
la variante native et réconcilier le choix durable du contrat. Ne pas réarmer
un job ni écrire manuellement son état pour forcer la convergence. Si le contrat
courant ne permet pas une transition sûre ou si son prévol manque, signaler
la limite et conserver le contexte sans annoncer `medium` appliqué.

Cette règle de protocole ne déclenche ni benchmark PLLM de reprise, ni
changement des sessions actives lors d’une mise à jour des sources. La sélection
par défaut essaie `medium`, puis `high` sur la même candidate ; seulement en
cas d’indisponibilité des deux, la sélection automatique examine la politique
PLLM suivante. Un modèle imposé reste conservé si les niveaux admissibles ne
sont pas disponibles.

## Adaptations natives V2 — source 2.1.32

Le retry historique après `access_id` vide exige l’enveloppe native exacte
Code Mode, un seul appel et ses arguments concordants, `metadata.error=true`,
`truncated=false`, le refus de validation déterministe, puis un `get_approval`
natif corrélé prouvant l’absence de cette approbation. Session, RUN, génération,
commande `/usr/bin/true`, absence d’effet et nouvelle identité de prévol restent
contrôlés. Le texte libre ou le timeout seuls restent insuffisants. Le schéma
MCP refuse désormais `access_id` vide : omettre cette clé si aucun accès
existant n’est référencé. Le banc reproduit explicitement l’ancien schéma
2.1.9 pour qualifier cette récupération, avec le validateur réel inchangé.

Les vérifications d’un RUN filtrent les permissions par leurs identités de
session avant de valider leurs cibles. Une permission étrangère n’est ni
répondue ni autorisée ; une identité manquante ou une cible propre invalide
reste bloquante. Les contrôles globaux conservent leur validation stricte.

Le client expose les `tokens` et le `cost` natifs valides dans `info`, avec
`usageSource=opencode-v2`. Absence reste inconnue, zéro reste zéro ; les
métadonnées libres ne fabriquent pas ces mesures. Les événements SSE V2
`data` et `location` sont normalisés avec vérification des identités et
répertoires. Les débuts/fins d’exécution et permissions corrélés invalident
les observations de génération ; les états statistiques suivent l’activité
sans créer de décision CAB. Les mesures historiques manquantes ne sont pas
reconstruites.

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


## Restitution sans effet — source 2.1.32

Pour une réservation de test HELD acquise mais jamais utilisée pour une
mutation, appliquer [la procédure spécifique](unused-test-reservations.md)
avant POST /runs/<runId>/test-resources/release-unused. Elle exige autorisation
humaine ciblée, attestation exhaustive de l’orchestrateur, relecture native
complète et frontière inchangée. Aucun délai, échec SSH ou booléen isolé ne
libère l’environnement. Après mutation ou incertitude, conserver la restitution
ordinaire avec nettoyage et vérification ; aucune once n’est rejouée.


## Isolation de la location MCP et sondes — source 2.1.32

Appliquer [la référence d’isolation MCP](mcp-location-isolation.md).
La découverte serveur est globale ; les contrôles MCP visent la location
partagée et refusent un répertoire explicite divergent. Pour les sondes,
utiliser createProbeSession avec le modèle exact et deny global, puis cibler
le directory retourné jusqu’à la suppression de cette seule session.
Aucun contexte technique étranger n’est initialisé pour sonder le modèle.
Une panne reste INCOMPLETE sans réparation MCP automatique ; la récupération
d’un contexte concurrent est distincte, explicitement autorisée et prouvée.


## Attente du contrôleur et échec de récupération — CAB2.1.32

L’attente de la version réelle du contrôleur utilise le budget --wait-ms
existant (120000ms par défaut, borne maximale900000ms), y compris au rollback.
Un service déclaré active par systemd ne suffit pas. Un dépassement conserve
update-controller-start-unconfirmed, distinct du rechargement du broker.
Aucun délai ne remplace la vérification des versions et de la readiness.

Après la coupure, un rollback non confirmé reste ROLLBACK_FAILED, non terminal.
La reprise doit traiter le même journal avant une nouvelle transaction ;
elle ne peut pas le reclasser PREPARATION_FAILED. Ne jamais modifier le
journal pour fabriquer un succès. Les anciens journaux déjà classés à tort
par une version antérieure restent conservés comme preuves ; observer les
artefacts et processus effectivement restaurés séparément, sans réécrire
leur historique. Les RUN, demandes et once ne sont pas restaurés depuis
une sauvegarde. Seul un retour réellement vérifié peut être annoncé.


## Refus de décision HTTP explicites — CAB2.1.32

Appliquer [les diagnostics de décision](decision-http-diagnostics.md).
Les anciens400 vides deviennent JSON {error,message,decision_recorded}, avec
codes fermés et messages filtrés. Conserver statut et corps avant parsing ;
GETdecision404 peut coexister avec une demande indécise. decision_recorded
reflète la table locale, pas une décision native ni une persistance durable.
Aucun diagnostic ne valide, ne rejoue ou ne reconstruit une décision/once.


## Modèle du client : reasoning en entrée

Lire references/model-policy.md avant création de session ou sonde, changement
de modèle ou prompt avec modèle explicite. Le client attend model.reasoning ;
les lectures exposent model.variant. En2.1.32, réinjecter ce champ natif est
refusé avant HTTP avec opencode-model-variant-unsupported, même si reasoning
est aussi présent. Convertir explicitement le modèle relu en un nouvel objet
{providerID,modelID,reasoning}, sans alias ni repli silencieux vers default.
Conserver le choix du codeur et les permissions existantes.


## Fournisseur et modèle à chaud — CAB2.1.32

Appliquer [la procédure de changement à chaud](hot-model-switch.md).
Le dernier choix explicite peut remplacer fournisseur/modèle/raisonnement dans
le même job sans contrainte de l’ancienne politique ; sans choix explicite,
suivre la PLLM actuelle. POST /runs/<run_id>/job/model-transition conserve
RUN/job/session et historique, avec prepare/commit/cancel et reprise prouvée.
Le raccord confidentiel utilise l’API V2 native et le helper provider-connect,
sans reload/dispose. Aucun SCM CAB réussi ne se termine sans CABU ensuite ;
annoncer l’activation seulement sur versions réellement observées, puis avertir
les sessions. Ni CABU ni la livraison source ne modifient implicitement leur
clé, leur choix ou leurs décisions.


## Contrôle de continuité historique — CAB2.1.32

Lire [account-bound-history.md](account-bound-history.md). Un choix
completed et une sonde fraîche ne certifient pas l’histoire existante. Les
réponses portent historicalContinuity:not-verified et
requiresHistoricalContinuityCheck:true. Sous PAUSE/deny, vérifier un échange
natif sans outil dans le SID historique avant RESUME. Une erreur de contexte
Responses liée au compte ne déclenche ni nouvelle PLLM ni repli de raisonnement.
La limite2.2.0 et le parcours distinct d’un autre choix explicite restent
prouvés/documentés ; ne pas promettre une réparation à même modèle ou appliquer
resume:false, dispose, nouveau SID, compactage ou édition de stockage.


## Projection du contexte après transition PLLM/compte — CAB2.1.32

Appliquer la référence references/portable-context.md du skill installé : ne plus rejouer les anciens blocs de raisonnement et métadonnées fournisseur après transition. Projeter seulement les messages anciens de la session/connexion/cible autorisées, sans changer histoire, modèle ou permissions. Hook natif chargé à chaud puis preuve historique sans outil avant prévol CAB/RESUME. Le mode2 demandé conserve Muse/medium et le compte2 ; une connexion différente bloque sans repli.


## Entrée native exacte avant once — CAB2.1.32

Appliquer references/native-input-guard.md du skill installé : pour tout nouveau mandat write/edit, calculer tool_input_sha256 sur les arguments natifs exacts avec nativeToolInputDigest, vérifier ce champ avant APPROVED puis comparer la preuve native avant once. Une divergence bloque et invalide l’exécution sans permission consommée ; réconcilier sans effet et rejeter la permission avant nouvelle identité. Les anciens mandats sans empreinte ne sont pas annoncés protégés. Conserver la vérification du fichier après effet et le choix PLLM.


## Readiness vide et omission native — CAB2.1.32

Appliquer references/empty-readiness-input.md du skill installé : seule l’omission input du broker_readiness({}) littéral unique, achevé sans erreur et non tronqué peut être projetée. Métadonnées/empreinte brute intactes, autres outils et formes ambiguës toujours bloquants ; aucun argument implicite global ou pouvoir de décision/once ajouté.


## Admission observée — CAB2.1.32

Appliquer references/admission-state.md du skill installé : GET /runs/<run>/decision/<request>/admission distingue BUSY/STABLE, propriétaire, validation et décision locale enregistrés. STABLE est seulement un instantané, sans autorisation/réservation ;409 précoce et400 tardif restent bloquants. Lire la décision réelle et conserver les mêmes identités avant poursuite explicite si toujours indécise, sans retry automatique ni once rejouée.


## Longs mandats Bash sans recopie — CAB 2.1.32

Appliquer la [procédure du transport scellé](exact-shell-carrier.md) pour un nouveau payload Bash revu. L’orchestrateur dépose les octets exacts et leur SHA256 via `POST /runs/<run>/shell-stage` ; le codeur transmet seulement `command` retournée, dans `request_validation` puis dans l’appel shell natif. La décision examine également le corps privé scellé, fourni au validateur automatique par CAB. Le staging n’autorise rien : conserver décision corrélée, accès HELD, `once`, fin native et réconciliation. Aucun mandat ancien n’est réinterprété. Un refus du lanceur après `once` ne permet jamais de rejouer cette permission.


## Reprise des incidents natifs — CAB 2.1.32

Appliquer [la procédure de diagnostic et reprise](native-coding-recovery.md) : préparer les nouveaux mandats avec nativeCodingMandate, distinguer catalogue MCP et outils natifs et utiliser diagnoseCodingTurn sur le SID et l’ancre utilisateur exacts. Erreur fournisseur ou entrée incomplète/divergente impose examen des effets et réconciliation, sans retry, once rejouée ou bascule spontanée. Conserver le choix LLM explicite. Vérifier le conducteur entier : READY, compilation ou proposition ne prouvent pas les tests. Le moniteur utilise GET /monitor/runs, projection compacte non autorisante ; le plafond 2 Mio reste inchangé et les causes de panne sont distinctes.


## MCP pending et récupération CABU — 2.1.32

Appliquer [la procédure MCP pending](mcp-pending-recovery.md). Attendre la transition dans le budget existant sans réémettre connect/disconnect. MCP_RECOVERY_REQUIRED reste nonterminal dans le même reçu ; aucune nouvelle installation ou boucle de repli implicite. Le flag updater --recover-mcp <transactionId> signifie rechargement GLOBAL des locations et exige un accord humain explicite pour ce reçu, jamais l’accord d’un ancien incident. Intention durable avant POST, jamais rejouée ; PID/location/sessions et frontière native vérifiés. Profils gelés/reuse-readonly exclus. Un ancien reçu `RESTARTING` peut être clos `SUPERSEDED` seulement si les empreintes hors broker sont intactes, les trois modules broker correspondent exactement au paquet plus récent et la readiness active est cohérente ; l’installation complète vient d’un CABU ultérieur avec un nouvel identifiant. Après récupération : versions et readiness prouvées, puis information des sessions ; aucune once ou demande métier rejouée.


## Permissions avant prévol — CAB2.1.32

Appliquer [la reprise des permissions natives](native-permission-resume.md) : une revue peut laisser shell/edit deny, sans mutation par CABU. Avant tout prompt de prévol ou opération permissionnée, utiliser client.prompt(...,{directory,requiredNativeAsk:['shell']}), ou ['edit'] pour write/edit. Inspection nativePermissionPolicy en lecture seule ; aucun rétablissement automatique. Le propriétaire lève explicitement le seul droit nécessaire après revue terminée et frontière sûre, avec preuve avant/après, autres deny conservés. Les prompts de revue sans outil restent possibles sous deny. Le contrôleur revérifie indépendamment ; allow, règle absente/spécifique, mauvais SID et policy changée ne permettent aucun contournement.
