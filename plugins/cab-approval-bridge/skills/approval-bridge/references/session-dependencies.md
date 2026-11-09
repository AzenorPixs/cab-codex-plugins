# Coordination de dépendances — cab-dependency-mailbox-1

Le contrat du change archivé `coordinate-project-coding-sessions` est réalisé au niveau source. Le raccordement des clients suit l'[adaptateur commun](session-coordination-adapter.md). La présence de la CLI ne prouve pas la santé du runtime, l'adoption d'un prompt ou une notification native ; réservations, OpenSpec et protections restent applicables.

Le script `scripts/cgpt-approval-bridge-dependencies.py` fournit le protocole `cab-dependency-mailbox-1` et les opérations documentées ci-dessous. Chaque appel, sauf `version` et `check-close`, requiert `--project` (racine réelle), `--session` et `--run`. Le magasin par défaut est `cab-approval-bridge/dependencies` sous la racine d'état runtime CAB existante ; `--store` le remplace pour un banc isolé. Ce répertoire doit appartenir à l'utilisateur et être privé, mode 0700. `register` prend `--mode direct|piloted` et éventuellement `--mandate SCM|other|unknown`. `state` prend `--state active|paused`, `--reason explicit|dependency` et `--generation` croissante ; il ne modifie ni ne constate lui-même la pause native. `subscribe` prend `--dependency-id`, `--kind change|task|capability`, `--subject` et `--criterion`, éventuellement `--batch-code` attesté et, pour une capacité, `--batch-change` identifiant le change associé. `publish` prend `--notice-id`, `--kind`, `--subject`, `--proof` (référence relative non sensible). `ack` prend `--dependency-id` et `--notice-id`.

Les identifiants sont limités à des jetons courts ; aucun texte de conversation, secret, URL ou chemin absolu de preuve ne doit être transmis. Un code de lot fourni est accepté uniquement si une ligne non ambiguë du registre `openspec/BATCH_CODES.md` l'associe au change concerné ; pour une capacité, ce change doit être fourni explicitement. Ce contrôle ne remplace pas une revalidation du registre et de ses sources lorsqu'elle est nécessaire. La référence fournie par l'émetteur reste une affirmation : le destinataire consulte les sources applicables et vérifie ses critères. `ack` signifie prise en compte de l'avis, pas validation de la dépendance. Une identité d'avis doit rester stable lors d'un réessai ; un contenu divergent est refusé. Une inscription ultérieure retrouve les avis déjà stockés et nécessite aussi leur revalidation.
Pour `task`, le sujet est exactement `<identifiant-change>/<identifiant-tâche>` ; un numéro isolé est refusé. Pour `change`, il est l'identifiant technique du change ; une capacité utilise un identifiant stable propre au contrat métier.
La publication peut inclure `--proof-sha256` pour transmettre l'empreinte de la
preuve. La boîte vérifie son format et la conserve ; le destinataire doit
calculer et comparer l'empreinte au contenu courant de sa source autorisée.

Pour les adaptateurs de prompts : enregistrer les identités réelles et déclarer
chaque prérequis à sa découverte. Après validation d'un prérequis, publier
l'avis et sa référence non sensible. À chaque frontière de travail où le client
est actif, consulter sa boîte, vérifier les critères dans les sources et
acquitter séparément les avis traités. Une boîte indisponible ou une publication
non confirmée doit être signalée et réconciliée avant réessai ; aucun résultat
incertain ne vaut avis reçu. Une session explicitement en pause ne doit pas être
réveillée pour cette consultation. Cette boucle suit le contrat commun des prompts ; son adoption réelle
reste à vérifier par les traces de chaque session consommatrice.
L'émetteur utilise `outbox --notice-id <id>` pour identifier uniquement les
destinataires de son avis. Pour un destinataire actif, `discover-turn` prend
ses identifiants, l'avis, le contrôleur et le socket ; il retourne uniquement
le tour courant, un identifiant de tentative stable et, en mode piloté, la
génération de réservation. Ces observations sont recontrôlées lors de l'envoi.
Un destinataire en pause reste `waiting` ; un avis déjà acquitté ou une
tentative antérieure ne provoque aucun nouvel envoi.
`notify-all --notice-id <id> --controller-url <URL> --codex-socket <socket>`
enchaîne ces contrôles par destinataire, sans arrêter les autres lorsqu'un
destinataire est indisponible. La sortie fournit l'état de chacun et
`next_offset` ; reprendre les pages tant que ce champ n'est pas nul. Le lot
par défaut porte sur quatre destinataires, avec `--limit` entre 1 et 20 et
`--offset` non négatif. Répéter une page ne rejoue pas une notification déjà
acceptée ni une tentative incertaine. Plusieurs critères d'une même session
pour un même avis partagent une seule notification native ; les acquittements
et vérifications des critères restent distincts.
Si aucun socket natif n'est disponible, `notify-all --notice-id <id>` conserve
les avis et signale `native-transport-unavailable` pour les destinataires
actifs ; cette attente de transport ne met pas la session de codage en pause.

La commande directe `start` et `track` pour un rôle orchestrateur tentent
l'inscription de la session après son rattachement SGS ; `track` pour un
codeur sans mode établi signale cette incertitude. Le résultat `dependencies.status` distingue
`registered` d'`unavailable` sans remplacer le statut SGS. Le mandat n'est
pas déduit : l'appelant doit déclarer `--mandate SCM` lorsqu'il est attesté.
Un mandat SCM ou inconnu refuse l'enregistrement d'une pause motivée par une
dépendance ; une pause explicitement demandée reste possible. L'état déclaré
n'est pas une preuve de l'état natif. Lorsque `CODEX_THREAD_ID` est présent,
la CLI refuse une identité de session différente avant tout accès au magasin.
Cette comparaison d'environnement ne constitue pas une authentification
cryptographique et ne couvre pas les clients dépourvus de cette variable.
Un résultat `coordination-session-busy` indique une frontière en cours ; il ne
prouve pas l'enregistrement de la pause. Le propriétaire réessaie cette seule
écriture après la libération du verrou et conserve la demande explicite.
Pour passer de l'état de coordination `paused` à `active`, `state` exige une
nouvelle génération et `--resume-evidence` identifiant la demande explicite de
reprise ; seule l'empreinte de cette référence est conservée. Cette commande
ne reprend aucun travail natif. Le client vérifie la provenance de la demande.

Pour les mandats autres que SCM qui prévoient un choix en cas de dépendance,
`decide --decision-id <id> --choice pause|stop --decision-evidence <référence>`
enregistre le choix explicite et l'empreinte de sa preuve sans exécuter de
pause, d'arrêt ni de désarmement ; `decisions` relit les identifiants, choix et
empreintes du seul propriétaire. Une pause déclarée avec `--reason dependency`
exige ensuite `--decision-evidence <id>` correspondant à un choix `pause`.
L'arrêt utilise les gates et le désarmement du protocole du RUN. Les deux choix
sont refusés pour SCM, qui poursuit le traitement des dépendances.

SGS expose `POST /purge/verify-released` avec exactement `scope` et
`receipt_id` ; il réutilise le contrôle du reçu direct et retourne
`RELEASE_VERIFIED` avec l'empreinte de portée seulement si la liaison ciblée
est absente. Cette preuve est ponctuelle : elle ne verrouille pas une nouvelle
inscription concurrente. `close-direct` la contrôle sous le verrou du RUN,
après vérification de l'absence d'effet incertain ; le démarrage direct utilise
le même verrou lors de son rattachement SGS. Les avis encore nécessaires aux
pairs sont conservés et donnent `retained-for-peers` ; le nettoyage reste alors
incomplet. Après libération des pairs, reprendre le même reçu : les seules
données propres à la cible sont retirées et le journal SQLite est vidé avant
`disk_verified`. Un lecteur concurrent peut produire `cleanup-pending`, à
reprendre sans supprimer les données des pairs. Une reprise directe
explicite peut réouvrir la liaison après vérification SGS de la nouvelle liaison
et de sa source native ; elle conserve le reçu historique et ne réactive pas implicitement
l'état actif.

`check-close` vérifie sans créer de magasin les tentatives non résolues reçues
ou émises par le RUN, éventuellement limitées à une session directe. Le gel
direct et le désarmement piloté refusent cette frontière tant qu'un effet reste
incertain ; le RUN pair reste indépendant. Un marqueur durable distingue un
magasin jamais utilisé d'un magasin disparu après utilisation.
Après vérification de tous ses critères et acquittement de toutes les entrées
d'un même avis, le destinataire peut appeler `release-notice --notice-id <id>
--release-evidence <référence>` : seule sa copie est libérée. L'empreinte du
reçu empêche qu'une répétition de publication recrée cette copie. Cette
libération ne supprime pas les avis ou ressources d'autres destinataires.

La persistance SQLite et les transactions protègent l'état contre les écritures concurrentes ; une erreur renvoie un échec et ne démontre aucune livraison. Un avis sauvegardé est consultable dans la boîte exacte, y compris après redémarrage. Les avis ne modifient aucune pause, permission ou réservation. Les primitives d'intention refusent une nouvelle préparation en état inconnu ou en pause et conservent un résultat incertain. Le contrôleur source sérialise ses pauses ciblées et globales avec les notifications admises à l'aide des mêmes verrous ; il expose `dependency-pause-gate-v1` pour vérifier le projet, le RUN, sa génération et son admission. Cette protection n'est acquise que si contrôleur et client utilisent le même runtime qualifié.

`notify-piloted` exige l'auteur exact de l'avis, `--recipient-session`, `--recipient-run`, `--dependency-id`, `--notice-id`, `--attempt-id`, `--turn-id`, `--reservation-version`, `--controller-url` loopback et `--codex-socket` privé. Il refuse les magasins distincts du runtime CAB, les pauses, les versions ou projets divergents, et une session native qui n'est pas active ou attend une approbation. `notify-direct` utilise les mêmes identifiants et le contrôleur pour vérifier l'absence de pause globale, sans version de réservation ; il exige aussi la liaison SGS directe vérifiée et l'état direct actif déclaré. Les clients directs doivent consigner leur pause explicite avant de suspendre leur travail. Sans contrôleur vérifiable, la boîte directe reste consultable sans envoi natif. Les deux modes vérifient l'identité et le projet par `thread/read`, puis envoient `turn/steer` conditionné au tour exact. `accepted` atteste une réponse native corrélée, pas la lecture ou la validation de la preuve. Une réponse perdue ou ambiguë reste `unknown` et n'est pas rejouée. Le 9 novembre 2026, le transport source a découvert un tour, transmis puis observé un avis dans un serveur Codex réel isolé en conteneur sans réseau externe, avec fournisseur local synthétique ; les essais du contrôleur et de SGS utilisent des homologues factices. Cela ne prouve pas une activation sur les sessions utilisateur.
Le client WebSocket attend une réponse `initialize` valide avant `initialized` et toute
requête ; les sorties et la durée sont bornées. Une réponse mal formée, trop
volumineuse ou perdue reste non vérifiable, sans exposer son contenu.

Avant un envoi, l'émetteur doit lui aussi être actif et posséder une liaison
SGS native vérifiée. SGS recontrôle l'identité et le projet dans les seules
métadonnées initiales de la source ; ni le transcript ni son chemin ne sont
retournés par la route de vérification. Le contrôleur et la boîte doivent
indiquer la même racine d'état, afin de partager les mêmes verrous.

`reconcile-direct` et `reconcile-piloted` reprennent l'identité de la même
tentative et le socket natif, sans envoi. Ils consultent au plus dix pages du
tour exact et ne retiennent qu'un message unique dont l'identifiant client et
le contenu correspondent. L'observation conserve seulement une empreinte ;
elle n'invente pas l'accusé réseau. Une absence, une page inaccessible ou une
ambiguïté reste inconclusive et ne permet pas de rejouer la tentative.
Une observation positive prouve l'insertion de ce message précis : elle lève le
blocage dû à l'effet inconnu sans transformer l'accusé réseau en succès.
`cancel-prepared` permet à l'auteur d'annuler une intention encore `prepared`,
avant la frontière native ; il refuse une tentative devenue incertaine.

**Limites actuelles :** `native_notification: unavailable` dans l'inscription ou la consultation ne prouve aucun envoi ; un envoi séparé doit retourner son propre résultat. Les permissions du répertoire isolent les comptes système, pas les processus d'un même compte : la liaison SGS vérifie les identités natives, sans authentifier cryptographiquement chaque processus de cet UID. Ne pas déposer de données sensibles dans la boîte ni l'utiliser comme autorité pour une action. L'adoption des prompts et les pauses directes hors de leur protocole nécessitent leurs preuves propres ; les tests de boîte ne les établissent pas. La rétention des avis est conservatrice.

Le magasin par défaut appartient à un seul UID ; il ne démontre pas la
coordination entre comptes système distincts. Une configuration de plusieurs
UID requiert un transport et des droits explicitement qualifiés, sans rendre
le répertoire privé partagé ni présumer des permissions existantes.
