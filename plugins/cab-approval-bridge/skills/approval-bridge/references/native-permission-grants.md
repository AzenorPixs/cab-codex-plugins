# ASK effectif et permissions sauvegardées — CAB 2.2.28

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

La portée des grants est le projet natif, potentiellement commun à plusieurs
RUN. Un mandat d’un seul enfant ne vaut pas maintenance de ce projet partagé.
Utiliser l’autorité de maintenance applicable et coordonner les sessions ;
attendre leur inactivité naturelle sans permission pendante. Ne pas arrêter
un pair ni redémarrer OpenCode pour obtenir cette frontière.

1. Préparer `nativePermissionRepairPlan(sessionId,{planId,requiredNativeAsk})`.
   Relire directory, projectID, PID/version, politique, planDigest, targets et
   retained : IDs et empreintes uniquement. La préparation est sans mutation.
2. Appliquer `revokeSavedNativePermissions(plan,authorization)` avec
   `authorization={kind:"shared-project-maintenance",projectID,directory,
   planDigest,reference}` ; reference désigne l’autorisation réellement acquise.
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
