# Frontières propriétaires historiques — CAB 2.3.3

## Diagnostic avant récupération

READY et l’offre d’une action ne prouvent pas son admissibilité. Lire le plan,
les opérations exactes et native-evidence ; séparer décision, accès, once,
résultat natif et preuve courante. Une vue snapshot-only UNVERIFIED ou un journal
MISSING_RELEVANT_CALLS n’invalide pas seul un résultat durable corrélé et vérifié.
La libération normale d’un accès COMPLETED utilise sa policy propriétaire
release-access bornée ; ne rééditer ni rejouer la commande pour tester.

## Retraite d’un rejet historique

withdraw-unissued-validation accepte la préparation PREPARED/REJECTED d’une
ancienne génération ou d’un ancien SID du même RUN/contexte sous propriétaire
et policy courants. L’identité request/approval/opération, sa génération, sa
session et sa décision restent historiques et immuables. Les ressources doivent
rester couvertes. Native, résultat, once ou accès lié interdisent cette admission.
Ne jamais réécrire reservation_version, rétrograder le RUN ou réutiliser les IDs.

Le contrôleur recoupe l’entrée request_validation native avec le propriétaire
persisté et les empreintes. Chaque call environnemental du suffixe reste soit
celui de la cible, soit celui d’un mandat indépendant précisément attribué et
terminalement prouvé. Les reçus de rejet, résultats natifs et réconciliations
conservent leurs identités. Les appels inconnus, ambigus ou encore actifs
restent bloquants ; aucune troncature au prochain message ne les masque.

Une seconde voie couvre les demandes rejetées dont aucun call cible n’a été
émis. Le contrôleur suit la séquence native complète request/get/poll jusqu’au
rejet de même identité, puis la fin stop postérieure à la décision durable et
le message utilisateur suivant. Parentés, sessions, dates et messages doivent
concorder ; aucun call environnemental n’est admis dans cet intervalle. Les
événements natifs vides idle/system sont conservés. Un enfant tardif des mêmes
parents, une fin absente ou une frontière modifiée refuse cette preuve.
Le transcript entier, suffixe compris, reste scellé dans les deux lectures.
Les effets ultérieurs ne deviennent ni sûrs ni terminés par ce retrait ; leurs
protections restent en place. Cette voie ne s’applique jamais à une once émise.

Un call refusé exige son ACK204 de rejet exact. Un ancien reçu de PID différent
peut seulement être examiné avec la frontière noyau postérieure au call et au
rejet, sous son vrai PID/version historiques ; le PID courant n’est jamais
substitué. Un reçu d’un autre call ne compte pas. L’absence de call cible peut
qualifier une retraite de coordination, mais jamais l’absence d’un effet inconnu.
Deux lectures complètes stables, SID cible idle et zéro permission restent requis.
Le résultat est CANCELLED/COORDINATION_WITHDRAWN_BEFORE_ISSUANCE, sans nativeResult.
Les autres opérations, leurs parents et les baux restent inchangés.

## Port timeout et reboot postérieur

Pour un serveur local de développement Vite déjà quarantiné, un reboot du
noyau strictement postérieur à la fin du call timeout fournit une frontière
additive lorsque l’ancienne preuve d’instance manque. Le contrôleur vérifie
la part originale unique, la commande/cible et ses dates ; il expose
nativeInstanceEvidence.kind=kernel-reboot-after-call avec kernelBootMs,
bootIdSha256 et historicalEndedAt. observedAt reste l’heure réelle de première
observation durable et authentifiée par le contrôleur, conservée après restart ;
kernelBootMs est l’événement de reboot, jamais
une observation native antidatée. Une lecture /proc faite par le correcteur
n’est pas une sonde native ni une autorisation. Un changement de PID seul
reste insuffisant et aucun reçu ancien n’est transformé en PID courant.

1. Lire native-evidence et le plan courant ; conserver opération/protection/once.
2. Demander deux descriptions distinctes via GET recovery/port-probe-command,
   operationId historique, nonce égal au nouvel operation_id du probe et
   runtimeDirectory=. obligatoire. Respecter executionSessionId renvoyé.
3. Pour la frontière de reboot, les probes utilisent le SID courant du RUN,
   même si le SID source est historique/révoqué. La description prépare une
   compatibilité de lecture de120s liée à la commande exacte, au nonce, à la
   session, au port et à l’empreinte de la cible. Toute modification impose
   une nouvelle préparation ; ne pas fabriquer quarantineProbeFor dans un payload.
4. Le codeur exécute chaque commande inchangée sous son nouveau mandat approuvé,
   ressources limitées au port en read, avec son propre accès et sa nouvelle once.
   Une description n’est ni une réservation ni une approbation. Les sondes
   lisent les métadonnées, le port et les processus ; aucun serveur n’est relancé.
5. Vérifier les deux opérations COMPLETED/exit0 et leurs accès RELEASED. Les
   captures doivent être complètes, quiescentes, fraîches (120s), de mêmes
   noyau/cgroup/netns et identité OpenCode. Un listener, processus du périmètre,
   changement de frontière ou ancien boot conserve le refus.
6. Vérifier les comptes rendus et terminer le mandat de probe dans le suivi du
   job : currentCabMandate doit être vide avant les retraits ultérieurs. Cette
   mise à jour ne remplace pas une fin native ou une libération d’accès.
   Reprendre le plan et nativeBoundaryDigest après les probes. L’orchestrateur
   applique reconcile-quarantined-port sous policy couvrante, deux probeOperationIds
   distincts et revue VITE_LOCAL_DEV_SERVER : commande exacte, package.json
   et empreintes de sources, répertoires complets, absence de travail détaché
   hors scope ou de changement d’isolement/identifiants, références de preuve.

Le reçu indique HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT et autorité
VERIFIED_NATIVE_PORT_PROBES ; l’opération devient CANCELLED, l’accès RELEASED/
RECONCILED. Aucun exit ni succès métier historique n’est inventé. Une réponse
perdue se réconcilie avec le même reçu, sans rejouer la once originale.
Seulement ensuite, les retraits dépendants et la clôture peuvent continuer.

## Livraison et fin de session

Ne pas utiliser ces nouvelles voies avant activation réelle du paquet qualifié.
SCM/incrément/CI-CD puis CABU restent distincts des actions propriétaires sur
le RUN. Aucun cleanup OC/CAB avant le gate sûr et les réconciliations requises.
Le suivi et les rapports utilisent SGS installé : initialisation dès reprise,
CHANGE via stdin sous REPORT (rapport+candidat), DELTA séparé par l’orchestrateur.
Les compteurs absents restent inconnus ; le global incompatible ne déclenche
ni REBUILD automatique ni blocage artificiel de la clôture individuelle.

## Attribution native des candidats — CAB2.3.4

Une sonde non quiescente ne justifie ni kill ni libération. Examiner les
candidats PID/startTime/PPID/comm/cwd relatif. Le nom seul ne prouve rien.
La sonde distingue les ancêtres attestés du serveur et son client interactif
uniquement par parent commun, exécutable dev/inode, terminal et connexion TCP
loopback appariée au serveur API courant. Les identités sont relues ; tout
autre processus reste candidat et toute couverture incertaine reste refusée.
Après CABU vérifié, préparer deux nouvelles sondes mandatées ; conserver
nonce, timeout exact, accès read, once et fraîcheur120s. Les captures d’une
ancienne commande ne sont jamais recyclées. La revue et la réconciliation
restent décidées par le propriétaire ; le correcteur ne touche pas son RUN.

## Sockets API tiers — CAB2.3.5

La capture2.3.4 peut signaler infrastructure-identity-changed en scellant tous
les sockets, même tiers.2.3.5 garde PID/startTime/PPID/UID/cgroup/netns, même
exécutable et terminal ; elle exige au moins une paire TCP réciproque présente
et possédée aux deux observations, sans sceller les autres connexions. Un
changement d’identité ou l’absence de paire stable reste refusé. Après CABU,
préparer deux nouvelles descriptions/mandats ; ne pas recycler une capture
non qualifiée et ne pas libérer la ressource historique avant revue et preuve.
