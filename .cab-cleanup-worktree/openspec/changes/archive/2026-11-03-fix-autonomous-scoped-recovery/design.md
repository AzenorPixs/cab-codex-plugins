## Autorité et preuves

L’orchestrateur est le décideur déjà délégué, y compris pour la revue du code
et des preuves de récupération dans son périmètre. Le broker ne décide pas.
Une attestation de revue est distinguée d’une preuve de terminaison native.
Elle lie propriétaire, politique, opération et digest du code relu, dépendances
source et références d’audit des refus. Elle ne peut pas s’appliquer à une
once consommée ou à une opération avec accès/native lié.

Le serveur vérifie l’annulation exacte dans deux transcripts stables. Seuls
les calls shell erronés, non exécutés selon le format natif et explicitement
couverts par la revue de lecture et les refus audités peuvent être retirés
du suffixe de validation ; tout autre effet ou divergence reste refusé.
La décision approved historique reste intacte ; CANCELLED concerne la validation
CAB. Le reçu décrit séparément l’exécution UNDETERMINED_READ_ONLY. Aucun exit
ou NO_EFFECT natif n’est fabriqué. Le contexte privé retire la réponse exécutable.

## Reçus de refus

Journal privé par permission, intention fsync avant POST, ACK fsync après 204.
Le snapshot inclut identités natives et digests, pas commandes ou secrets.
Une intention sans ACK reste indéterminée et ne déclenche pas un second POST.
Les receipts historiques non présents ne sont pas recréés comme ACK serveur :
la revue utilise leurs références d’audit sous l’autorité explicite de l’orchestrateur.

## Extension compatible

Une nouvelle route est additive et ne remplace pas extend/reduce historiques.
Elle vérifie owner, génération et digest courant du manifeste. Les ajouts doivent garder le namespace (type/hôte ou répertoire) et les droits
déjà réservés ; un nouvel hôte ou une élévation restent hors de cette route. Les nouveaux
périmètres doivent être disjoints des accès/baux actifs ou en attente et des
effets inconnus, y compris par ancêtre de fichier. Le manifeste seul grandit ;
sa génération, les anciens tokens/fencing et états restent inchangés. Un reçu
privé d’intention et de résultat rend la reprise idempotente ; une divergence
ne réapplique pas la mutation. Une nouvelle ressource n’est pas une nouvelle
autorisation métier : son choix doit rester dans le change déjà mandaté.

## Livraison et repli

Les nouveaux sidecars ne remplacent pas le registre historique. Une ancienne
version peut refuser les nouvelles actions de récupération, sans effacer les
historiques ou protections. CABU conserve le transfert certifié et la sauvegarde.
Les deux propriétaires appliquent leurs actions après activation vérifiée ;
le correcteur ne modifie pas leur ledger manuellement.

## Port long sous quarantaine

Le contrôleur UID1000 ne peut pas lire le namespace du serveur natif UID1002.
La sonde fournie s’exécute via un nouveau mandat de lecture dans le compte
natif ; elle ne lance ni Vite ni commande historique, ne tue rien et n’écrit rien.
Son code exact est porté par la commande approuvée et vérifié depuis le transcript.
Deux opérations de sonde distinctes doivent être COMPLETED/exit0 et avoir libéré
leurs accès. Chacune porte un nonce lié à son operationId, le PID/starttime natif,
les digests cgroup/netns, le port, les répertoires relus, l’absence de listener et
de processus candidats. Un résultat incomplet, positif ou divergent est refusé.
La revue propriétaire borne les descendants possibles du serveur Vite aux
répertoires déclarés, garde le scope et les sources épinglées ; elle n’est pas
une preuve de sortie historique. Après double preuve, seule l’opération/accès
port ciblée est clôturée par réconciliation, sans exit inventé. L’ancienne once
et l’issue HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT sont conservées.
L’accès utilise l’issue RECONCILED déjà supportée dans le schéma 4 ; aucune
ancienne exécution n’est déclarée NO_EFFECT ou réussie.

La couverture de processus prend le projet complet, y compris les anciens
parents shell. Elle exclut uniquement le processus natif, les ancêtres vérifiés
de la sonde et le broker Python identifié par PID/starttime, sans lire cmdline
ou environ. Le périmètre est le même cgroup et compte natifs ; la revue atteste
l’absence d’isolation ou changement de compte dans l’invocation historique.
L’instance est observée durablement avant les nouvelles opérations. Pour le cas
ancien, un reçu CABU COMPLETED de même contexte, PID/version/location antérieur
à l’invocation complète la preuve ; la sonde vérifie l’antériorité du processus
via /proc/stat et getconf CLK_TCK (outil libc-bin déjà fourni par Debian).
Le stream synchronisé ne remplace pas la couverture d’événements. Les probes
restent frais deux minutes et aucun changement de droits n’est réalisé.
