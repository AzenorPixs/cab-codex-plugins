# ASK effectif et permissions sauvegardées — CAB 2.2.38

Une règle de session `shell ask` ou `edit ask` ne suffit pas à prouver qu’une
permission sera demandée : OpenCode2.2 conserve aussi des grants par projet.
Un ancien `always` peut les faire accepter sans nouvel événement de permission.
Ne pas attribuer leur origine à l’orchestrateur courant sans preuve.

## Audit sans mutation

Le client `nativePermissionPolicy(sessionId,{requiredNativeAsk:["shell","edit"]})`
lie SID, répertoire et projectID puis consulte GET `/api/permission/saved`.
`nominalReady` décrit les règles déclarées ; `ready` exige aussi l’absence de
grant protégé et un audit disponible. Les diagnostics ne livrent que IDs,
actions et empreintes, jamais les ressources brutes. Les actions shell/bash,
edit/write et wildcard correspondantes restent protégées. Avant prompt de
codage, décision positive et once, un audit inconnu ou divergent interdit
l’émission. Le superviseur applique la même garde. Le client CAB refuse always.
Une consultation n’efface rien et ne change pas la politique de session.

## Restaurer ASK dans une maintenance partagée mandatée

Le développeur autorise durablement cette récupération CAB bornée depuis le
4 novembre 2026, jusqu’à révocation. L’orchestrateur de maintenance applique
cet accord permanent aux consommateurs du même projet natif, sans solliciter
le développeur ou chaque session de codage à nouveau. Il coordonne les
propriétaires et documente son autorité dans le plan exact. Ce mandat partagé
vient de l’instruction du développeur ; il n’est pas inféré d’APPROVED ni du
seul mandat métier d’un enfant. Les sessions signalent l’audit au correcteur
CAB désigné, sans nettoyage concurrent ni formulaire d’approbation répété.

La classe autorisée est la restauration de shell/edit ASK déjà déclaré :
uniquement les grants sauvegardés des actions protégées du projet exact, via
l’API officielle et sous toutes les gardes du SDK. read, external_directory,
autres projets, règles de session, PID/version, sessions, RUN, accès et baux
restent conservés. Aucun nouveau droit, changement métier, kill/restart/reload,
purge de fichiers ou rétablissement always n’est autorisé par cette classe.

Attendre l’inactivité native globale naturelle et zéro permission pendante.
Une frontière active ne demande aucun accord supplémentaire : coordonner et
attendre sa fin naturelle sans nouvelle émission. Une identité, une entrée ou
une empreinte divergente arrête le plan avant suppression suivante ; conserver
les reçus, diagnostiquer et préparer un plan actualisé si les mêmes critères
restent satisfaits. Une opération sortant réellement de cette classe nécessite
son autorité distincte, sans transformer un échec de garde en consentement.

1. Préparer `nativePermissionRepairPlan(sessionId,{planId,requiredNativeAsk})`.
   Relire directory, projectID, PID/version, politique, planDigest, targets et
   retained : IDs et empreintes uniquement. La préparation est sans mutation.
2. Appliquer `revokeSavedNativePermissions(plan,authorization)` avec
   `authorization={kind:"shared-project-maintenance",projectID,directory,
   planDigest,reference}` ; reference désigne l’accord permanent du développeur appliqué à ce plan,
   par exemple `cab-native-ask-maintenance-v1/2026-11-04/<planId>`.
   Le SDK exige toujours cette autorité explicite et liée au plan ; aucune
   option de consentement implicite ou nettoyage automatique dans un GET.
   Seuls les grants protégés du plan passent par DELETE officiel
   `/api/permission/saved/:id`. read, external_directory et autres projets
   restent conservés. Une nouvelle entrée, un changement de politique,
   processus ou frontière suspend la suite avant nouvelle suppression.
3. Le reçu privé `permission-grant-repairs` du runtime journalise l’intention
   avant chaque DELETE. Après réponse perdue, relire : l’absence observée
   n’est pas un ACK. La reprise explicite du même plan conserve les IDs et
   deux tentatives maximales par entrée ; un reçu terminal ne rejoue rien.
4. Vérifier absence des cibles, conservation des autres entrées, ASK effectif,
   mêmes PID/sessions/RUN/protections. Ne pas restaurer un ancien always.
   Qualifier ensuite une nouvelle unité anodine sous son propre mandat :
   permission réellement pendante, rattachement réel au parent, puis unique
   once du contrôleur et résultat natif. Aucun ancien shell n’est rejoué.

## Sortie passée sans once CAB : revue propriétaire ciblée

Lire le plan recovery et native-evidence de la seule opération. Une sortie
native terminée sans corrélation CAB reste `UNVERIFIED`, même avec exit0.
L’owner peut utiliser `reconcile-reviewed-terminal` sous policy explicite,
avec revue READ_ONLY de la commande exacte, callId, partDigest,
commandSha256 et evidenceRefs. Une commande entièrement inline relue peut
porter `inlineCommand:true,sourceFiles:[]` ; si elle lit du code exécutable
externe, fournir ses sources épinglées et réellement revues.

Un accessId peut seulement référencer un parent : vérifier operationIds.
L’enfant ne doit être membre d’aucun accès. Le parent référencé doit rester
HELD, même RUN/contexte/version, et couvrir les ressources ; son empreinte
est vérifiée sur deux frontières natives stables, session inactive sans
permission. Un enfant réellement attaché, effet mutateur, autre shell,
source manquante ou parent divergent reste refusé.

La clôture produit `NATIVE_TERMINAL_OBSERVED_PERMISSION_UNVERIFIED` et ne crée
ni native, nativeResult, ACK ou rattachement rétroactif. Le parent et ses baux
restent identiques. Relire le même actionId après réponse perdue ; ne pas
rejouer la commande observée. Seule cette clôture de coordination est prouvée,
jamais une émission historiquement autorisée. Voir [reprise](autonomous-recovery.md).
