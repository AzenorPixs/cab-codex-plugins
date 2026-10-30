# Changement à chaud du fournisseur et du modèle — CAB2.1.27

Lire aussi [la continuité historique liée au compte](account-bound-history.md). Une adoption completed ne certifie pas cette continuité ; effectuer le contrôle historique sans outil avant RESUME.

## Choix de la session

Le dernier choix explicite autorisé peut remplacer à chaud le fournisseur,
modèle et raisonnement précédents, indépendamment de l’ancienne politique,
source, priorité ou mode PLLM. Ce parcours ne lit pas de catalogue imposé. Sans niveau explicite, préférer medium puis high lorsqu’ils existent ; à défaut, retenir un niveau natif exposé, sans rejeter le modèle à cause de l’ancienne politique.
Sans choix explicite, la session suit la PLLM actuelle ; ne pas transformer
le modèle conservé d’un ancien job en nouveau choix humain. Les capacités
natives et le prévol exact restent vérifiés. Aucun changement ne réarme le
job, ne remplace sa session ou ne rejoue une permission.

La procédure distingue le raccord d’un compte fournisseur partagé et le choix
propre à chaque job. Un fournisseur déjà connecté ne nécessite pas de nouvelle
clé pour changer le modèle d’une session. Un remplacement de compte peut
concerner plusieurs sessions : coordonner leurs propriétaires avant cet effet.
La livraison source et CABU activent les interfaces ; ils n’appliquent aucune
clé ni politique aux jobs réels sans leur mandat opérationnel corrélé.

## Raccord fournisseur V2 et canal secret

Contrat constaté sur le serveur2.2.0 et vérifié sur un banc privé2.2.0 officiel :
POST /api/integration/{integrationID}/connect/key reçoit key et label, répond204
et stocke le credential dans OpenCode. GET /api/integration/{integrationID}
expose les connexions opaques. La génération suivante utilise la connexion
active : aucun location/reload, instance/dispose, arrêt ou redémarrage OpenCode
n’est nécessaire dans le parcours qualifié. Les sessions et leurs historiques
sont conservés. Cette preuve n’est pas déduite du seul CLI2.2.2 installé.

Ne JAMAIS lire GET /api/credential : le schéma natif indique que cette liste
contient les valeurs secrètes. Ne lire ni le stockage privé OpenCode ni une
sauvegarde de credentials. Distinguer la clé du fournisseur du Basic Auth
opencode, déjà traité par le client dans son fichier privé protégé. Le secret
fournisseur traverse uniquement le gestionnaire, un pipe/descripteur privé,
le processus local et l’API native ; jamais un argument, une sortie du modèle,
un journal, une erreur brute, un checkpoint ou le reçu CAB. Le stockage natif
nécessaire est distinct d’une copie supplémentaire dans CAB.

Le script installé cgpt-approval-bridge-provider-connect.mjs exige la même
version du contrôleur, les jobs armés sous PAUSE, zéro demande/effet/accès actif,
une cohorte stable et toutes les sessions natives inactives sans permission.
Le workspace du contrôleur doit correspondre à la location globale native ;
aucun contexte technique étranger n’est initialisé. La version, le PID et le
contrat natif sont vérifiés avant injection. L’opération est sérialisée par un
verrou local commun et écrit un reçu NON SECRET. Ces vérifications ne valent
pas autorisation humaine ni décision métier ; conserver le mandat précis et
la coordination des propriétaires. Aucun propriétaire ne lève sa PAUSE avant
sa propre réconciliation et les prévols requis.

Exemple de structure pour une clé gérée par le gestionnaire habituel PLLM :

```bash
set -o pipefail
secret-tool lookup service pllm policy "$mode_secret" provider "$fournisseur_logique" account "$compte" |
  node "<plugin>/scripts/cgpt-approval-bridge-provider-connect.mjs" \
    --opencode-url "<url-loopback-native>" --controller-url "<url-loopback-CAB>" \
    --directory "<workspace-des-services>" --integration "<integration-native-observee>" \
    --transaction "<identite-neuve>" --authorization-reference "<reference-publique-du-mandat>" \
    --expected-pid "<pid-lu-par-api-info>" --secret-fd 0
```

Les variables du gestionnaire sont des références de recherche, jamais la
valeur de la clé. Ne pas exécuter la première commande seule dans un outil du
modèle, activer une trace shell ou capturer sa sortie avant le pipe. Pour un
choix explicite hors PLLM, utiliser le gestionnaire du compte correspondant
par le même canal ; aucune appartenance à une politique PLLM n’est imposée.
Le client utilise reasoning en entrée ; variant est réservé aux lectures.

Le reçu par défaut réside sous ~/.local/state/cab-provider-connect/, répertoire
privé0700, fichiers0600. --state-directory permet une destination privée
explicitement contrôlée. Un reçu COMPLETED contient l’identité opaque de la
connexion et requiresPreflight:true ; il ne prouve aucune génération réelle.
Une erreur après possibilité de POST laisse UNCONFIRMED et conserve le verrou.
Ne pas réinjecter la clé : utiliser la même invocation avec --reconcile et
les mêmes identités, sans canal secret. Cette reprise ne fait que relire la
connexion ; une confirmation impossible reste bloquée. Une interruption après
reçu terminé mais avant libération du verrou est également réconciliée sans
nouvelle injection. Une transaction terminée n’est pas réutilisée pour une
nouvelle clé. Les journaux/erreurs ne reprennent que des codes fermés.

## Transition du même job

L’interface est POST /runs/<run_id>/job/model-transition, protocole
model-transition-v1. Vérifier ce marqueur dans GET /runs/<run_id>/job. Conserver
le RUN, jobId, sessionId, réservations, critères, jalons et écritures connues.
Sous PAUSE, fermer les mandats/effets connus et vérifier l’absence d’inconnu,
permission ou accès actif. Ne pas utiliser /job/arm pour modifier le choix.

1. Lire GET /runs et GET /runs/<run_id>/job : runVersion vient de la réservation,
   expectedModelHash vient de modelContractHash du job. Une absence historique
   de codingModel a une empreinte propre et restera null dans l’historique.
2. Préparer avec phase:prepare, transactionId neuf, developerAuthorization
   (référence publique corrélée), jobId, sessionId, runVersion,
   expectedModelHash et selection. Pour un choix explicite :
   selection={model:"<fournisseur-natif>/<modele>",reasoning:"<niveau>"}.
   Sans choix explicite, omettre selection ou fournir {} : le contrôleur
   résout la PLLM actuelle. providerMaxBytes conserve son contrat par appel ;
   unavailablePreflights conserve ses preuves de raisonnement strictes.
3. La réponse prepared porte transition.candidate. Créer une sonde sans outil
   pour ce fournisseur/modèle/raisonnement exacts APRÈS la préparation. Utiliser
   createProbeSession avec model={providerID,modelID,reasoning}. Attendre un
   assistant terminé avec fin stop, sans outil, puis conserver sessionId et
   messageId de cette preuve. Un benchmark externe ne suffit pas.
4. Envoyer phase:commit avec transactionId, developerAuthorization, jobId,
   sessionId, runVersion identiques et preflight={sessionId,messageId} de la
   sonde. Aucun codingModel fourni par le client n’est accepté. Le contrôleur
   relit la sélection, la preuve postérieure et la connexion opaque, persiste
   sa phase avant effet, change le modèle de la MÊME session et vérifie le
   résultat natif avant adoption atomique du nouveau choix et de l’historique.
5. Vérifier historicalContinuity:not-verified / requiresHistoricalContinuityCheck:true : ces marqueurs distinguent configuration et continuité. Lire le job : codingModel courant, modelTransition:null, historique avant/
   après et modelContractHash. Vérifier les identités et la session native.
   L’ancien source:prompt/mode:null reste historique ; le nouveau choix est
   explicite ou pllm-automatic selon la demande réelle, sans réétiquetage passé.
6. Effectuer/vérifier une preuve de continuité dans la session historique sous deny, distincte de la sonde neuve, selon account-bound-history.md. Seul le propriétaire décide ensuite RESUME et les prévols/permissions neufs
   requis. L’API ne lève aucune PAUSE et ne rejoue aucune once. Conserver les
   sondes et preuves nécessaires jusqu’à résolution, puis appliquer le protocole
   de nettoyage final ; ne pas supprimer la session métier à reprendre.

## Interruption, annulation et réconciliation

PREPARED n’a produit aucun changement natif par cette transition : phase:cancel
peut l’annuler sous frontière sûre, sans restaurer fictivement un autre compte.
Une divergence de sélection ou de connexion avant effet refuse commit. Préparer
ensuite une identité neuve seulement après annulation prouvée.

APPLYING ou NATIVE_UNCONFIRMED conserve la possibilité d’effet : cancel, une
nouvelle préparation, réarmement, désarmement et RESUME sont refusés. Reprendre
avec phase:reconcile sous les mêmes identités ; le contrôleur relit le choix
natif et les preuves, sans nouvelle application. Si le natif correspond à la
cible et que la connexion est cohérente, il termine la persistance sans rejeu.

Si le natif correspond encore exactement à l’observation antérieure et qu’une
nouvelle application est explicitement autorisée, phase:retry exige une nouvelle
retryAuthorization publique, non réutilisée. La frontière et les preuves sont
recontrôlées avant cette seule nouvelle tentative ; aucune permission métier
n’est transmise. Un troisième choix natif, une connexion divergente, une preuve
supprimée ou un stockage non confirmé conserve le blocage et les conditions de
reprise. Ne pas modifier le stockage pour fabriquer un succès.
