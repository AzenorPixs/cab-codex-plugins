# Administration CAB 3

## Convergence autonome de la finalisation

GET /api/v1/finalization et finalization_status exposent missing, next_actions
et pending_operations. Les actions nomment contrôle, producteur, requête ou
décision manquants ; elles ne lancent rien et ne rejouent aucun travail.
Un CABU incomplet renvoie vers le même reçu system.update.status.

Le codeur propriétaire direct ou piloté utilise finalization_revise_check ou
cab call finalization.revise_check avec project_id, run_id, request_id stable,
expected_policy_digest, check_id, argv et reason (10–4000 caractères).
La correction d'attente, donnée ou périmètre du contrôle doit être démontrée ;
les critères ne sont jamais affaiblis pour obtenir un résultat vert. Seul argv
est révisable. Chaque version et reçu reste conservé. Une exécution du contrôle
corrigé porte un nouveau request_id ; une réponse perdue se relit sur son
identifiant initial. Un succès passé ne prouve jamais une nouvelle version.

La commande refuse effets non terminaux/indécis, baux, maintenance, gel, import,
revue/clôture et contrôle actuellement réussi. La revue finale pilotée reste
celle du parent. finalization-revision-stale impose de relire le contrat ; un
doublon identique restitue son reçu. Les anciens RUN ne sont pas migrés
implicitement. La migration0016 considère les preuves antérieures en révision1
sans réécrire leurs reçus. CAB clôture automatiquement après preuves requises.

Le service système unique `cab.service` utilise les droits root et démarre avec
la machine. PostgreSQL reste indépendant. L’installation neuve expose uniquement
le parcours Web d’initialisation sur le port 8790 ; le démarrage du service ne
crée pas la base CAB. La configuration est `/etc/cab/cab.json`, protégée par les accès de la machine. Les configurations existantes doivent être conservées.

## Journal système

Les composants API, superviseur, workers et Electric émettent dans journald.
Les entrées structurées portent le composant, le niveau et, lorsqu’ils sont
disponibles, `project_id`, `run_id`, `request_id` et un code de diagnostic.
Les priorités journald correspondent aux niveaux de CAB. Les sorties de tests,
corps de requêtes et prompts ne sont pas des messages du journal système.

Dans la configuration existante, ajouter ou modifier seulement la propriété :

```json
{"logging": {"level": "INFO"}}
```

Niveaux acceptés : `DEBUG`, `INFO` (défaut), `WARNING`, `ERROR`, `CRITICAL`.
Après modification atomique du fichier, appliquer avec :

```sh
sudo systemctl reload cab.service
sudo journalctl -u cab.service -b --since '10 minutes ago'
sudo journalctl -u cab.service -f
sudo journalctl -u cab.service -p warning
```

Le rechargement par SIGHUP applique le niveau au superviseur et à l’API sans
redémarrer les processus, RUN ou connexions Electric. Une valeur invalide est
refusée et conserve le niveau précédent. Les secrets configurés, en-têtes
d’authentification et URI avec mot de passe sont expurgés. Même en DEBUG, les
traces SQL et les journaux HTTP contenant les corps ou chaînes de requête restent
désactivés. Les erreurs incluent classe et positions de pile sans variables ni
message SQL. Le stockage et la rétention des journaux suivent la politique
`journald` de la machine ; les reçus durables des opérations restent en base.

## Comptes et reprise historique

Les profils des clients sont séparés par agent dans ~/.config/cab/codex.json
codex-cli.json et opencode.json. CAB utilise les accès effectifs de l’OS sans
contrôler ni normaliser leurs modes POSIX existants. Le compte est résolu par UID, y compris root ;
les identités d’agents ne donnent pas de privilège système. Les intégrations
préparées par CABU sont enrôlées lors du premier parcours Web, après migration,
sans collecte ou RUN avant cette validation. Les intégrations natives se
configurent avec `sudo cab integrate codex --user <compte>` ou opencode.

L’import garde les fichiers historiques intacts et leurs empreintes. Les
registres et snapshots SQLite SGS/CCAB sont conservés chiffrés ; les flux
quantitatifs SGS sont projetés sans addition de snapshots cumulatifs. Les RUN
importés restent IMPORT_PROTECTED avec leurs SID/générations et les baux
incertains. La commande run.adopt permet une reprise explicitement cadrée,
avec empreinte d’import et identités identiques, seulement sans effet ou bail
non résolu. Aucun import ne réarme une ancienne session.

Le superviseur attend mécaniquement les événements. Le parent peut utiliser
wait_for_handoff : le service ne sollicite le LLM que pour exception ou revue
finale. Codex reçoit un délai MCP de86430s pour les attentes jusqu’à24heures.

La sauvegarde administrative `sudo cab backup --destination /chemin/privé`
produit dump logique, configuration et état privé avec empreintes. La restauration
ne se lance jamais implicitement après un effet. Aucun envoi hors machine ni
objectif PITR/RPO/RTO n’est réputé activé sans configuration et qualification
opérationnelles de sa destination ; ces mesures ne sont pas déduites des essais
minimaux de livraison.

## Accès Web distant et CSRF

Les adresses de publication se configurent par hôte dans /etc/cab/cab.json :
`web_allowed_hosts` contient les noms DNS ou adresses IP sans schéma ni port ;
`web_csrf_trusted_origins` contient les origines exactes avec schéma et port
lorsqu’il est non standard. Par exemple, un déploiement sur un nom DNS choisi
peut autoriser ce nom dans les hôtes et son URL HTTP ou HTTPS dans les origines.
Le programme ne dépend ni du nom de machine ni d’un domaine Tailscale particulier.
Ces paramètres prennent effet au redémarrage du service. Le jeton et le cookie
CSRF restent obligatoires ; les origines étrangères restent refusées.

## Administration Web par sections (ajustement local 3.0.0)

Le bandeau relie directement l’accueil vide, Administration et Projets.
L’administration est répartie entre `agents`, `database`, `interface`, `projects`
et `web-server` sous `/administration/`. Les menus latéraux occupent le bord gauche.
Le zoom global est dans Interface ; le thème reste disponible dans le bandeau.

Agents affiche les versions des exécutables sous leur identité POSIX et les
configurations MCP des comptes CAB. Les chemins facultatifs `opencode_binary`,
`codex_binary`, `opencode_mcp_config`, `codex_mcp_config` sont absolus ou vides pour
la découverte automatique. Un MCP déclaré n’est pas une preuve de connexion ;
aucun serveur ni session n’est démarré par l’inventaire. Les secrets sont exclus.

Serveur Web conserve les origines exactes dans `web_public_urls`, les noms
additionnels dans `web_allowed_hosts`, et les origines CSRF explicitement approuvées
dans `web_csrf_trusted_origins`. Déclarer une URL ne crée aucun proxy ni certificat.
Les changements techniques attendent un redémarrage contrôlé de `cab.service`.

## Parents des ateliers directs et umask du service

Les parents `.cab-tests/<change>` créés par le service portent le groupe du
projet et les permissions 0770, avec héritage setgid si applicable. La préparation
vérifie aussi les parents d’un atelier déjà enregistré et répare les seuls parents
appartenant au service. Les dossiers RUN et reçus existants restent inchangés.
Un parent inattendu, un lien ou un groupe incompatible provoque un refus explicite.
Après un échec terminal non dispatché, conserver ce reçu ; une nouvelle exécution
utilise une nouvelle identité de requête après vérification du mandat.

## Réconcilier le mandat direct après archivage

Le propriétaire du RUN relève son `mandate.framing_digest` via `run_status`,
puis transmet sur stdin à la commande publique `cab call run.reconcile_archive` :

```json
{"project_id":"<projet>","run_id":"<RUN>","archive_path":"openspec/changes/archive/AAAA-MM-JJ-<change>","expected_framing_digest":"<digest courant>"}
```

Le MCP `run_reconcile_archive` porte le même contrat. Seul le change du RUN
est relocalisable ; la source doit avoir disparu et l’archive doit être canonique
avec proposal.md et tasks.md. Toute opération non terminale, bail détenu, cadrage
périmé ou mauvais propriétaire provoque un refus. Aucune écriture SQL manuelle,
recréation du change actif ou utilisation de run.adopt n’est nécessaire.
Le retour RECONCILED (ou ALREADY_RECONCILED pour le même appel) inclut les
empreintes et chemins, avec un événement durable. Le gel natif et les anciens
reçus ne changent pas. Un nouveau test reste une requête distincte du propriétaire.

ADMISSION_UNCONFIRMED signale une erreur client sans prouver l’absence d’effet.
Lire le même reçu ; NOT_FOUND signifie seulement son absence au moment de la
lecture. Ne jamais relancer automatiquement un effet à partir de ces diagnostics.

## Droits des runtimes publics Debian

Les archives embarquées sont vérifiées puis normalisées dans leur staging :
dossiers0755, fichiers0644 ou0755 s’ils sont exécutables. L’installation ne suit
pas leurs liens symboliques et ne touche ni /etc/cab ni les états privés par ce
parcours. Une dépendance publique ne doit pas devenir illisible pour un client
non root du seul fait des modes de l’atelier de build ou de l’umask de l’installation.

## Finalisation automatique du paquet3.0.3

Après installation des runtimes, migrations, démarrage et contrôle du service,
postinst exécute `cab finalize`. Ce parcours local ne lance ni APT, ni dpkg,
ni téléchargement. Il lit les intégrations déclarées dans cab.json, met à jour
leurs extensions et conserve un reçu privé dans last-finalization.json.
last-update.json conserve le résumé CABU compatible. `cab update` réutilise cette
finalisation après l’unique appel APT et ajoute l’empreinte du paquet.

Le paquet fournit un exemplaire commun des plugins/skills/commandes sous
/usr/lib/cab ; l’activation et les caches appartiennent à chaque UID configuré,
root compris. Aucun parcours de tous les profils n’est effectué. Les marqueurs
par compte vérifient aussi les contenus copiés : les étapes complètes restent
sans effet ; un cache manquant peut être rétabli. Les éléments tiers restent
intacts. L’installation des extensions ne crée ni rôle CAB ni autorisation projet.
Avant le premier parcours Web validé, la finalisation est différée ; le service
peut la reprendre après initialisation pour les comptes préconfigurés.

## Versions et transports des agents

La page Agents distingue fichier exécutable, processus et transport MCP local.
Les pipes MCP peuvent être conservés sur des descripteurs privés par le SDK ;
le contrôle examine les deux extrémités et leurs directions, pas seulement fd0/1.
Le transport connecté ne constitue pas une validation de test ou de mandat.

Les dépôts GitHub par défaut sont anomalyco/opencode et openai/codex. Les clés
opencode_release_repository et codex_release_repository peuvent indiquer un
owner/repo adapté à la distribution utilisée. Une seule lecture par dépôt et
jour UTC est planifiée aléatoirement ; le premier contrôle attend0à60secondes.
Le cache est indépendant des requêtes de page et conservé en cas d’échec.
La version affichée est la dernière release stable observée, pas une consigne
de mise à jour automatique ou une preuve de compatibilité d’un fork.

## Cycle et tâches des changes

Le propriétaire déclare l’étape et sa phase via `cab call run.progress`
ou `run_progress`. Le cycle courant compte douze étapes et insère la lecture
de Version après Spécification. Les anciens RUN gardent leur cycle de onze
étapes. Les positions peuvent reculer.
Le tableau temps réel porte étape et tâches réalisées ; le RUN ouvre
/projects/<project_id>/runs/<run_id>. Les inconnues restent explicites.
Les tâches proviennent du tasks.md unique actif ou archivé ; change_tasks
mémorise les libellés, cases, ordre, lignes et empreinte, y compris les anciennes
lignes retirées sous état inactif. Une source indisponible conserve le dernier
instantané et le signale. Les cases ne valident ni le RUN ni le gate terminal.

CAB ouvre et ferme les passages d’étape observés avec son horloge serveur.
Le change conserve ses passages lors d’une reprise sous un autre RUN.
Overview donne les dates, le détail des passages et la somme des durées
mesurées. Les durées de passages simultanés s’additionnent.

## Politique de version d’un projet

`PROJECT_VERSION_POLICY` fixe de une à sept composantes. CAB complète la
variable absente à partir de la version courante ou choisit 3 en l’absence
de version. Le fichier `project.env` fait autorité. Le champ d’Overview ouvre
un aperçu de la version et des renommages de tags avant la confirmation.
Une migration change les références du dépôt local et conserve leurs objets,
y compris les tags annotés. Un aperçu périmé ou une collision bloque
l’application. Une interruption se traite sur le même identifiant d’aperçu.

Une version de politique supérieure est toujours ordonnée après une version
de politique inférieure. Par exemple, `0.3.8.0` vient après `4.0.0`. Une
réduction locale laisse les tags distants en place. Une livraison ultérieure
reste bloquée si un tag distant est classé au-dessus du numéro proposé.

La migration normalise les tables projects, runs, sessions, changes et
change_tasks sans modifier SID, générations, mandats ou reçus. Le service est
arrêté à frontière sûre pendant le changement de schéma. Une sauvegarde logique
et privée précède l’activation ; un retour à un ancien serveur exige une stratégie
explicite de restauration/migration, jamais une restauration automatique.

Les comptes configurés incluent aussi les agents enrôlés dans CAB dont le profil
privé local correspond à l’acteur et à son jeton, sans parcourir les HOME non
enrôlés. Cela couvre les comptes installés auparavant par cab enroll/integrate.
Les plans préconfigurés avant bootstrap conservent leur champ role explicite.

## Agents et adresses 3.0.4

Agents est disponible à /agents dans le bandeau après Administration ; l’ancien
lien /administration/agents redirige vers cette adresse. Administration ouvre
la section Base de données. Les trois blocs distinguent OpenCode, Codex CLI et
le moteur Codex intégré au bureau, dont le chemin peut être configuré par
codex_desktop_binary. Le connecteur des deux Codex reste --agent codex et leurs
profils restent partagés ; les activités et versions installées sont distinctes.

L’ascendance des processus rattache les connecteurs à leur client. Pour les
sockets Unix, le noyau fournit les inodes pairs via UNIX_DIAG_PEER ; les flux
ne sont pas lus et les clients ne sont pas reconnectés par le moniteur. Un
contrôle inaccessible reste non vérifié. Le rafraîchissement visible reste
périodique pendant l’ouverture de la page, sans sollicitation du LLM.

Le cache GitHub OpenCode sélectionne le canal stable 2.x dans les releases,
sans prendre Latest 1.x. Son cache ancien est invalidé par changement de canal ;
le contrôle quotidien aléatoire et la conservation en cas d’erreur restent actifs.

Les projets disposent d’un identifier métier unique. PROJECT_ID est lu localement
comme affectation littérale unique, sans exécuter project.env ; une absence de
fichier permet le nom de dossier initial des nouveaux projets. Les valeurs
ambiguës, collisions ou noms réservés restent sans alias attribué automatiquement.
Les liens lisibles ne changent pas les PK ou identifiants project_id des API,
mandats, sessions et reçus. Les anciens liens par PK sont toujours résolus puis
remplacés par l’adresse lisible lorsqu’elle est connue.

La page Agents réinterroge les états visibles toutes les deux secondes. Les
versions installées sont mises en cache selon l’identité et les dates du fichier
binaire ; ce rythme ne relance pas les programmes à chaque interrogation.

### Résoudre une source Codex sans connaître son chemin —3.0.5

Le prévol public ne crée aucun RUN :

```sh
cab native-source --project-id '<ID interne CAB du projet>' --session-id '<SID Codex>'
```

Le SID peut être omis si CODEX_THREAD_ID est fourni par le client. CODEX_HOME,
si défini, indique le stockage du compte ; --codex-home permet sa transmission
explicite. Le MCP native_locate propose le même prévol. Le résultat ne contient
que le chemin et les métadonnées de liaison, jamais les messages.

Le service utilise le jour UTC encodé dans le SID UUIDv7 et le suffixe exact du
nom de fichier sous sessions/YYYY/MM/DD. Il examine au plus10000noms dans ce
seul dossier, ouvre uniquement le candidat exact et vérifie propriétaire, type,
liens, SID et cwd. Aucun autre contenu de conversation n’est parcouru. Une
absence, ambiguïté ou divergence est refusée ; aucun fallback global n’existe.
Un SID d’un autre format garde le parcours par source_file explicite.

Après run_begin, native_bind peut omettre source_file. Les clients déjà chargés
peuvent passer source_file vide ou utiliser, sans redémarrage :

```sh
printf '%s\n' '{"project_id":"<ID interne CAB>","run_id":"<RUN existant>"}' | cab call native.bind
```

Un stockage personnalisé peut fournir codex_home dans ce JSON. Répéter la même
liaison ne crée pas de nouvel événement ; une source différente est refusée.
La résolution ne crée pas de session et ne rejoue aucun test.

Un JSONL correspond à une session native, qui peut participer à plusieurs RUN
et changes. Les totaux collectés sont ceux de cette session : ils ne prouvent
pas une ventilation par RUN/change et ne doivent pas être additionnés comme
des populations disjointes. Cette correction ne change pas le collecteur.

### Statistiques propres au change —3.0.6

Une période appartient au triplet change/RUN/session. Un même change peut avoir
plusieurs RUN et SID, y compris simultanés ; chaque SID n’a qu’une période
ouverte. La bascule est opérée par le codeur, sans validation de l’orchestrateur.

Après liaison native et avant la première tâche :

```sh
printf '%s\n' '{"project_id":"<ID interne>","run_id":"<RUN>","request_id":"MESURE-DEBUT-1","from_coding_start":true}' | cab call statistics.begin
```

Ce booléen atteste le début réel du codage. Pour une session déjà engagée avant
l’installation, utiliser false : aucune borne rétroactive. Pour une pause/fin :

```sh
printf '%s\n' '{"project_id":"<ID interne>","run_id":"<RUN>","request_id":"MESURE-FIN-1"}' | cab call statistics.end
```

Reprendre avec un nouveau request_id de début. Même requête = même reçu, même
si la période est ensuite fermée ; un autre contenu avec cet ID est refusé.
Commencer un autre contexte du même SID ferme le précédent et ouvre le suivant
sur le même instantané. Gel et clôture ferment uniquement la période de leur RUN.
Les clients MCP disposent de statistics_begin, statistics_end, statistics_change.
Les clients déjà chargés gardent le CLI public sans redémarrage.

L’API metrics/statistics expose les périodes du RUN, sans anciens totaux de
session. statistics.change fournit l’agrégat de tous les RUN/SID de ce change,
les périodes (pages de50, after/next_after), leur empreinte et sgs_evidence pour
le moteur SGS. Un maximum explicite de1000périodes protège cette réponse ; au-delà,
la lecture refuse avec statistics-period-limit, sans fournir un total tronqué.

Les compteurs natifs sont pris au début et à la fin ; leur différence seule est
admissible. Ils restent des observations natives : timestamps natifs et serveur
sont conservés, sans interpolation à l’intérieur d’un événement natif ni
attribution certaine d’un événement tardif. Source remplacée, compteur réinitialisé,
champ absent ou données OpenCode encore en cours donnent des valeurs indisponibles.
Les métriques que le natif ne fournit pas ne sont pas fabriquées.

Une couverture du change exige des périodes fermées et une attestation de début
pour chaque RUN lié. Sinon les écarts observés restent visibles comme partiels,
mais les totaux SGS restent N/A. Les anciens RUN n’obtiennent aucune période
rétroactive et les anciens Metric sont conservés comme diagnostics session-wide.
Durée globale : première borne à dernière borne. Durée active : union temporelle
des périodes, sans addition des temps simultanés entre codeurs.

Tables PostgreSQL measurement_periods et measurement_actions : bornes, instantanés
numériques, affiliations et reçus ; aucune conversation n’est copiée en base.

### Journal actif après reprise Codex —3.0.7

Codex peut reprendre un SID dans un fichier suffixé. CAB consulte d’abord l’index
natif state_*.sqlite compatible, avec une requête paramétrée sur le seul SID :
SELECT rollout_path FROM threads WHERE id=?. Aucune conversation d’un autre SID
n’est lue. L’index est ouvert en lecture seule sous l’UID du codeur, y compris
lorsque le service est root ; les credentials du service ne sont pas transmis.
La racine du compte ou CODEX_HOME reste agnostique. L’absence d’index conserve
le repli borné au jour UUIDv7 ; un index présent mais incohérent ne sélectionne
pas silencieusement l’ancien journal. Le chemin trouvé est vérifié par UID/SID/cwd.

Si un RUN est déjà lié à l’ancien fichier : fermer sa mesure ouverte, puis :

```sh
printf '%s\n' '{"project_id":"<ID interne>","run_id":"<RUN>","resume":true}' | cab call native.bind
```

MCP : native_bind(..., resume=true). Le RUN doit être en travail, non gelé,
sans effet en cours ni mesure ouverte sur son SID. Seule la source actuellement
indexée est admissible, avec vérification de l’ancienne liaison. L’historique
précédent/courant est conservé (128reprises maximum), sans changer SID, RUN,
génération ou reçus. Les RUN clos/gelés ne sont pas réécrits. Ouvrir ensuite une
nouvelle période ; ne jamais soustraire les compteurs de deux fichiers différents.

Un compteur dont le dernier événement natif précède le début de période reste
indisponible : ce n’est pas une consommation nulle. Ce garde est également appliqué
à la lecture des périodes anciennes. Des bornes absentes ou une horloge native
future ne produisent pas de total connu.

Le même protocole statistique s’applique aux codeurs pilotés : ils ouvrent,
ferment et basculent leurs périodes sans approbation d’orchestrateur. Pour les
clients OpenCode déjà chargés, le CLI utilise CAB_AGENT=opencode et le profil
privé du codeur ; aucun jeton root ni identité fictive n’est nécessaire.
## Régularisation historique de RUN archivés

Un RUN direct ancien peut avoir une archive complète sans reçus de tests CAB.
Sur autorisation explicite du développeur, le propriétaire ou l'administrateur
utilise `cab call run.inspect_historical`, puis `cab call run.close_historical`.
Les corps JSON contiennent project_id, run_id et archive_path canonique ; la
confirmation ajoute evidence_digest retourné, receipt_id stable, authorization
(référence de la demande), reason et developer_authorized=true.

CAB vérifie archive unique, source active absente, proposal/tasks/review non
vides, tâches toutes cochées et rapport local lisible. Il refuse maintenance,
effets non terminaux/inconnus, bail détenu, période ouverte, liens non sûrs et
preuve modifiée. Une réponse perdue se récupère avec la même confirmation.
Le reçu `kind=historical`, `branch=HISTORIQUE`, `normal_acceptance=false` porte
les empreintes documentaires et l'autorité ; CLOSED à l'étape11 ferme seulement
le cycle historique. Ni qualification actuelle des tests/livraison, ni reçu
d'exécution n'est reconstruit. SID, RUN, génération, mandat, gel et reçus restent
inchangés. Le service conserve la gestion statistique ; aucune opération DIU
historique n'est rejouée. MCP expose les deux mêmes commandes sans autre logique.
## Clôture automatique et archives des sessions

Le worker CAB réévalue les RUN par lots bornés dès le démarrage puis toutes
les cinq secondes, après les observations locales. Aucun tour LLM n'est requis.
Une revue acceptée et encore valide, un change archivé avec toutes ses tâches
et l'absence de période ouverte, effet indécis, exception ou bail permettent la
clôture normale. Le service produit les statistiques et le reçu, sans rejeu.
Un déplacement du dossier vers son archive conserve la validation si les
contenus et modes restent identiques ; toute autre divergence bloque.

`cab call run.reevaluate` prend project_id/run_id. La lecture GET /closures
retourne action, motifs et admissibilité d'archivage. Les icônes de la liste
utilisent ce diagnostic, puis le serveur revérifie les conditions au clic.
Un historique sans acceptation suit la confirmation explicite3.1.3, avec
justification et consentement ; les cases seules ne le ferment jamais.

Les services sans tâches affichent « Sans objet » et exigent une preuve
terminale. Un import est vérifié dans le snapshot SQLite chiffré authentifié,
avec hash, identité exacte et enregistrement de clôture. Une preuve manquante
ou un format inconnu reste protégé. L'état CLOSED et étape11 peuvent être
réconciliés sans retirer IMPORT_PROTECTED, ni toucher aux anciens reçus.

Le bouton Archiver appelle `session.archive` avec project_id, run_id,
evaluation_digest et request_id stable. SessionArchive conserve une référence
unique au RUN, l'identité, les preuves et le reçu ; aucune relation n'est
supprimée. GET /session-archives et /projects/<ID>/archives présentent les
sessions archivées du seul projet autorisé. Electric les retire de la liste
courante grâce à la projection archived. L'archivage d'une session ne déplace
pas le change OpenSpec et ne clôture aucun pair.

## Accueil des projets et project.env

La sélection d’un projet et la maison ouvrent `/projects/<ID>`. Sessions ouvre
`/projects/<ID>/sessions`. L’accueil affiche immédiatement l’instantané public
stocké dans projects ; une relecture authentifiée s’effectue en arrière-plan.
Electric répercute ensuite les changements externes, sans rechargement.

Les métadonnées publiques sont validées par liste fermée. Dans la carte
Configuration, `PROJECT_LANGUAGES` et `PROJECT_FRAMEWORKS` contiennent des
listes ordonnées séparées par des virgules. CAB renomme automatiquement
`PROJECT_TYPE` en `PROJECT_LANGUAGES` lors de la lecture. Si les valeurs
des deux noms diffèrent ou sont ambiguës, CAB signale le conflit et conserve
le fichier. Le changement est atomique et protège les autres lignes.

L’éditeur affiche immédiatement la projection PostgreSQL. Suite à la
vérification de `project.env` en arrière-plan, la révision de la source et
des champs projetés autorise l’enregistrement. Electric actualise les champs
et CAB protège une saisie en conflit avec une modification externe.
Le chemin `PROJECT_PATH` est conservé dans PostgreSQL.

Les cartes de forge utilisent les valeurs publiques validées de la famille
correspondante. Les URL authentifiées ou porteuses de requête ou fragment
sont refusées et les secrets sont exclus de la projection. Le watcher suit
les éditions, remplacements atomiques, suppressions et créations. La
projection Electric reste limitée au projet autorisé.

## Rechargement MCP natif (3.2.6)

Les profils Codex et Codex CLI sont distincts, y compris lorsque les comptes
sont différents : `/usr/bin/cab mcp --agent codex` et
`/usr/bin/cab mcp --agent codex-cli`. OpenCode utilise `--agent opencode`.
Le service admet un contrôle technique par instance/version/configuration.
`native.control.configure`, `native.control.reload` et `native.control.status`
sont accessibles par `cab call`; seuls le propriétaire et l'administrateur local
peuvent agir. Les credentials restent dans le profil local.

Préparer un socket avec `sudo cab native-prepare --agent codex-cli --user <compte>
--binary <chemin-absolu-codex>` (ou agent codex pour l'application). Le fournisseur
supervise son daemon ; CAB configure son endpoint et, pour Codex, le lanceur
utilisateur avec CODEX_APP_SERVER_USE_LOCAL_DAEMON=1. La préparation n'atteste
pas le rattachement : les clients déjà ouverts en stdio exigent une première
reprise native. Codex se relance via le lanceur ; la CLI reprend son même SID
avec `codex resume <SID> --remote unix://<socket>`, sans nouveau prompt.
CAB ne tue pas les applications pour fabriquer ce raccordement.

La vérification du pair Unix et de la liaison IPC avec le frontend interdit
qu'un second backend isolé serve de preuve. CAB écrit un marqueur de génération
non secret dans mcp_servers.cab.env.CAB_MCP_RELOAD_ID avant l'appel officiel
config/mcpServer/reload : une configuration inchangée conserverait l'ancien MCP.
OpenCode V2 utilise disconnect/connect sur l'instance et le répertoire vérifiés.
Le reçu natif COMPLETED atteste l'appel confirmé ; la reprise complète exige en
plus un heartbeat frais et un vrai tools/list du moteur et du catalogue cible.
L'indisponibilité explicite autorise le repli existant du seul worker possédé ;
QUEUED/DISPATCHED/UNKNOWN attendent et interdisent rejeu et escalade.
Une erreur après émission reste UNKNOWN et peut être réconciliée uniquement par
une nouvelle génération/catalogue réellement observés. SID/RUN et reçus restent.

Les anciennes empreintes de sources contenant les modes ne sont pas réécrites.
Les qualifications antérieures qui ne correspondent plus à une révision courante
exigent une qualification nouvelle ; chmod n'est plus une modification de source.
Les contrôles d'identité de processus, d'authentification, de fichier régulier,
liens et canonicalisation ne constituent pas une politique de droits POSIX.

Le pavé Codex CLI utilise les releases stables openai/codex (tag rust-v).
Le pavé Codex utilise la version dpkg du paquet chatgpt et le dépôt APT officiel
ChatGPT ; aucun moteur DIU n'est invoqué à l'exécution. Les caches sont séparés,
avec une vérification quotidienne à instant aléatoire. Le dépôt peut être adapté
par codex_desktop_release_url (HTTPS sans credentials).

## Livraison corrective après CABU FAILED

Après échec avéré, finalization.retarget_release est une commande CAB bornée
(sans téléchargement, APT ni rejeu). L'autorité directe, l'orchestrateur piloté ou
l'administrateur transmet project_id, run_id, request_id, expected_policy_digest,
target_version, update_request_id et reason. Seul le patch immédiatement suivant
est admissible, avec nouvel identifiant CABU, aucune preuve d'installation déjà
acceptée, aucun effet/bail/gel/import/revue. UNKNOWN ne peut pas être converti.
Le service conserve intégralement l'ancien mandat, contrat et reçu d'échec dans
l'événement. Seule la version littérale des critères change ; contrôles, critères
métier, producteurs et revue restent identiques. La nouvelle livraison autorisée
s'exécute ensuite normalement et doit produire ses propres preuves.

## Services historiques et corbeille

Le moteur réévalue les composants internes importés service-ccab/service-sgs.
Il peut constater leur retrait actuel si le snapshot est intègre, l'ancien acteur
inactif, les processus/unités historiques absents et cab.service READY, sans
opération, bail ou mesure ouverts. Le reçu legacy-service-retirement garde une
date d'observation courante, historical_end_unknown=true et l'import protégé.
Il ne constitue ni une date de fin passée, ni une acceptation normale reconstruite.

session.delete_preview retourne l'admissibilité, les motifs, les liens partagés
et deletion_digest. session.delete exige project_id, run_id, request_id,
expected_deletion_digest, confirm_irreversible=true et confirm_shared=true si
l'aperçu indique des ressources partagées. La corbeille est à droite de la ligne,
y compris dans les archives. La fenêtre demande les deux confirmations utiles.
Une référence de coordination encore utilisée ou un état protégé bloque l'action.

Seul le RUN sélectionné et ses données propres sont supprimés ; une CodingSession
orpheline peut l'être aussi. Les changes, imports historiques partagés, autres RUN,
ressources globales et fichiers locaux demeurent. Un événement minimal sans lien
au RUN supprimé conserve le reçu et l'idempotence de la demande.

## Retrait administratif d'une ancienne session technique

Sur classification explicitement validée par le développeur, l'administrateur
utilise session.retire_technical avec project_id, run_id, request_id stable,
expected_import_sha256, developer_authorized=true, authorization et reason.
Le snapshot doit être intact, l'acteur importé inactif, sans opération, bail,
mesure ouverte ni autre session active liée. Le reçu legacy-technical-retirement
porte le constat actuel, historical_end_unknown=true et normal_acceptance=false.
Il conserve IMPORT_PROTECTED, SID et génération ; le RUN CLOSED11 devient
archivable sans déclarer un change livré ou inventer une archive OpenSpec.
Une répétition identique rend le même reçu ; une demande divergente est refusée.

## Test sandbox arrêté sans résultat récupérable

operation.reconcile_stopped est réservé à l'administrateur avec une décision
explicite du développeur. Champs : project_id, run_id, operation_request_id,
request_id stable, expected_receipt_digest, developer_authorized=true et reason.
Le parcours est borné aux tests locaux sandbox UNKNOWN/ProcessLookupError ;
il refuse les exécutions host_authorization et les opérations externes.
Le service vérifie l'atelier enregistré (chemin, device/inode), ses processus
par arguments et montage privé /cab-tmp, l'absence de spool et le fencing des
baux de fichiers. Une observation impossible conserve les protections.

L'opération devient CANCELLED au sens opérationnel, mais receipt.state reste
UNKNOWN et receipt_digest ne change pas. operation/status expose reconciliation,
avec classification stopped-result-unavailable et l'audit distinct. Aucun code
de sortie, succès de test ou effet historique n'est reconstruit. Les vérifications
sur des sources modifiées restent à produire ; aucune commande n'est rejouée.
Les opérations WAITING poursuivent leur prévol original et sont refusées avant
émission si leur révision source est devenue obsolète.

## Politique autonome d'arrêt sans résultat

Le superviseur cab.service examine ces opérations en arrière-plan, par lots
bornés et sans tour LLM. Seuls les RUN WORKING/FINALIZATION_PENDING non suspendus,
avec acteur actif et décisions de cadrage résolues, sont admis. Le parcours garde
les mêmes preuves de quiescence, d'intégrité et de fencing que le constat manuel.
L'identité enregistrée d'un exécuteur vivant protège le test même si ses arguments
ne mentionnent plus l'atelier. Les exécutions externes ou host_authorization,
les observations impossibles, ateliers divergents et spools restent protégés.

Le reçu distinct indique automatic=true, authority=cab-policy,
authorization_kind=service-policy et policy=sandbox-test-stopped-v1. Il ne prétend
pas qu'une nouvelle décision du développeur a été prise pour l'opération.
Le reçu UNKNOWN et son hash restent intacts. Aucun résultat de test n'est validé,
aucune commande n'est rejouée ; seuls les baux de l'opération prouvée arrêtée sont
libérés. operation/status expose autonomous_recovery avec le motif si le cas
reste protégé. Les motifs identiques ne produisent pas un événement à chaque tour.
# Contestation d'une preuve de contrôle

Une publication statistique interrompue peut être réconciliée automatiquement
quand l'écrivain est arrêté, l'exécution propriétaire terminée et tous les fichiers et entrées
d'index concernés correspondent encore exactement à l'état avant. Le verrou
de projet et le verrou transactionnel Git protègent le constat jusqu'au commit.
CAB conserve le reçu original et son digest dans l'événement
`statistics-stopped-before-publication`, classe séparément `FAILED_NO_CHANGE`,
puis laisse la finalisation normale poursuivre. Ce constat ne prouve pas une
réussite passée ni l'absence universelle de tout effet transitoire. Une divergence
ou un écrivain vivant conserve UNKNOWN ; le LLM ne force aucun statut ni verrou.
Un propriétaire local de même PID/start hors ACTIVE peut être réconcilié sans
redémarrage ; le constat distingue processus vivant et exécution terminée.
Un propriétaire extérieur vivant ou un job encore ACTIVE reste protégé.

Après une réponse initialize réussie observée, le premier tools/list ou tools/call
du client acquitte aussi la négociation pour le relais, même si la notification
initialized manque. Un fils confirmé arrêté peut être remplacé sans arrêt ni
API du frontend, avec sa seule négociation et sans rejeu métier. Un moteur vivant
conserve le contrôle natif prioritaire et ses protections. Un ancien relais déjà
chargé en mémoire ne reçoit pas ce code par simple remplacement du fichier ;
sa première reprise réelle reste à vérifier séparément.

L'administrateur authentifié utilise `finalization.contest_check` pour un contrôle
courant réussi qui ne mesure pas le critère. Le RUN, le check, l'opération et la
preuve sont désignés explicitement avec les empreintes de politique, de preuve
et de reçu attendues. La demande fournit un request_id stable, un argv corrigé,
une justification et la référence de l'autorisation développeur. CAB conserve
le reçu original et une exclusion durable, augmente la révision du check et
exige une nouvelle preuve. Il ne lance aucune commande et ne modifie pas les
critères, producteurs, exigences, autorités de revue ni protections existantes.
Les preuves contestées restent consultables mais ne sont plus sélectionnables.
Un retour à l'ancien argv exige encore une nouvelle exécution.

Pour diagnostiquer un rattachement, `native.bind` expose `connector_bound` en
complément du journal `bound`. Si le worker ne peut être reconnu, CAB conserve
un événement `native-connector-binding-unavailable` contenant uniquement les
identités publiques du pair et les classifications des processus. Cette trace
ne lit ni mémoire, ni secrets, ni contenu des pipes.


## Reprise nécessaire à CABU

Une demande CABU autorisée couvre aussi la reprise nécessaire de son instance
observée, pour le même demandeur, UID, request_id et version. Ne pas redemander
une confirmation pour cette seule reprise. Lire recovery_authorization dans
le même reçu ; AUTHORIZED est une autorité bornée, pas une preuve de reconnexion.
La préférence native reste prioritaire. Une reprise administrative contrôlée
du frontend n'est admise qu'en dernier recours RELOAD_REQUIRED, avec identité
kernel stable, frontière sûre de tous les acteurs du compte, PIDFD, reçu durable,
supervision indépendante et sortie prouvée avant relance. Aucun arrêt arbitraire
ni injection dans un canal privé. L'absence de mécanisme qualifié est un blocage
technique explicite, pas une raison de redemander l'autorisation déjà donnée.

Le superviseur relance l'instance graphique identifiée avec `runuser` et
le gestionnaire systemd du compte d'origine. Après un SIGTERM sans sortie
au bout de 15 secondes, CAB peut envoyer SIGKILL au même PIDFD. Le reçu
`frontend_recovery` consigne les signaux et la nouvelle instance. CABU reste
en attente jusqu'à ce que les relais rattachés à cette instance observent le
moteur et le catalogue de la version installée.
Une demande native portant sur une version déjà installée via CABU local
réutilise le reçu de cette installation si dpkg et la santé du service
confirment encore la même version. La réconciliation des relais garde son
propre reçu et n’exige pas une seconde installation.

Le propriétaire ou l'administrateur peut révoquer cette autorité par
`native.control.configure` avec `cabu_recovery_authorized=false` ; seule cette
préférence change, sans appel fournisseur ni nouvelle génération. Les reprises
en attente sont revérifiées sous verrou avant dispatch. Un effet UNKNOWN, une
instance divergente ou une révocation bloque sans rejeu. Un ancien reçu sans
observation kernel n'acquiert aucune autorité rétroactive par simple lecture.


## Mandat CCAB et fichiers préexistants autorisés

L’invocation explicite de CCAB porte le mandat développeur des correctifs CAB
nécessaires sous SCM avec CICD : spécifications, réalisation, qualification,
intégrations distribuées et activation requise. Ne pas redemander ce mandat
pour chaque incident ou écriture dans ce périmètre. Une restriction explicite,
une permission technique ou une opération hors du périmètre reste applicable.
Le projet déclarant conserve son mandat métier et l’autorisation de ses fichiers.

Un fichier préexistant explicitement autorisé peut être pris en charge sans
remplacer sa baseline ni utiliser l’adoption legacy :

1. L’administrateur authentifié appelle `session.git.inspect_preexisting` avec
   `project_id`, `run_id` et les `paths` littéraux déjà cadrés. L’inspection
   retourne `expected_state` : contexte et empreintes, aucun contenu de fichier.
2. Il appelle `session.git.authorize_preexisting` avec ces mêmes identités,
   `paths`, `expected_state`, un `request_id` stable et `authorization` contenant
   la référence de l’autorisation développeur applicable. Le reçu conserve
   `grant_id` et `observation_digest`. Une répétition identique lit le même reçu ;
   ne pas changer la requête pour contourner un résultat incertain.
3. Le codeur reprend `session_git_reserve` depuis sa connexion native réelle.
   CAB revérifie fichier, HEAD, cadrage, baseline et index ciblé, puis journalise
   l’autorisation utilisée. Il suit ensuite les validations et la livraison
   normales ; aucune preuve antérieure n’est reconstruite.

L’interface locale commune est `sudo cab call --admin <commande>` avec le JSON
sur stdin ; les credentials restent traités par le Client local. Cette
autorisation n’accorde pas le rôle administrateur au codeur. L’inspection et
l’admission ne changent aucun fichier ou entrée d’index et ne font aucun commit.
Le manifeste est limité à128fichiers et64Mio ; liens, renommages, fichiers
ignorés/protégés, contenu déjà modifié dans l’index partagé, réservations
concurrentes, gel/import/revue/clôture, baux et effets indécis sont refusés.
Une modification du chemin ou du contexte après autorisation empêche sa prise
en charge ; un nouvel état requiert une nouvelle inspection et un autre reçu.

Un statut dirty seulement historique se traite automatiquement si le chemin
actuel correspond aux octets du blob de HEAD et au mode exécutable lorsque
Git le suit. Depuis3.2.23, core.filemode=false conserve les permissions du disque
sans bloquer cette réservation ; les octets restent comparés intégralement et
une configuration invalide ou instable refuse la prise en charge. Le constat est tracé
dans `clean_initial_paths` ; un statut clean masquant d’autres octets ne suffit
pas. La baseline initiale reste inchangée dans les deux parcours.

## Sessions canoniques sans dossier de change

Un RUN de livraison cadré sur un fichier canonique `openspec/specs/<capacité>/spec.md`
peut être finalisé sans créer un faux dossier de change, tâches ou archive. CAB
publie son maître local dans `statistics/runs/<empreinte-identité>/STATISTICS.md`,
où l’empreinte couvre projet, RUN, SID, génération et identifiant logique du change.
Un ancien ChangeSource disparu interdit ce repli.

Le rapport comporte les six sections usuelles et les seules périodes/preuves du
RUN. Les mesures absentes ou les couvertures tronquées restent N/A. PostgreSQL
projette le contenu et ses empreintes dans la configuration interne du RUN ;
les révisions sont auditées par événements. Les blocs manuels restent préservés.
Le global concatène chaque maître une fois, sans addition de compteurs partagés.
Si un vrai maître de change devient disponible, il prend sa place dans le global
sans supprimer le rapport canonique existant.

CAB publie et indexe atomiquement ce rapport, puis le global. Son moteur terminal
accepte seulement le chemin dérivé du RUN, garde les contrôles des réservations
et des destinations, déplace le tag de version sans v sur le commit final vérifié
et ferme le RUN ensuite. Une publication ou un commit UNKNOWN conserve son reçu
et n’est jamais réémis comme nouvelle livraison.

La consultation expose la phase FINALIZING et ses blocages postérieurs au dossier,
notamment un rapport indisponible ou une publication indécise ; elle n’annonce
plus READY sur la seule validité des preuves préalables.

## Reprise administrative avant commit

Une livraison PARTIAL dont le commit a échoué avant déplacement des références
ne se relance pas avec un nouveau start, une nouvelle version ou un autre RUN.
Le moteur expose à l’administrateur système local les actions strictes
`inspect_precommit`, `resume_precommit` et `status_precommit` sous la commande
`session.delivery.policy`. Les champs habituels de politique de publication
restent inchangés quand aucune action de reprise n’est fournie.

L’inspection prend `project_id`, `run_id`, `delivery_id` et éventuellement
`resolutions` ; elle retourne `expected_state` et `effects_issued=false`.
La reprise ajoute un `request_id` stable, cet état exact et une justification.
Le statut relit le même identifiant ; une réponse perdue n’autorise aucun rejeu.
Seul le commit FAILED connu avant références est admissible ; version et
projection doivent déjà être COMPLETED et toute étape aval encore PENDING.
CLOSED/BLOCKED/FINALIZING, effet UNKNOWN, bail, gel ou source divergente protègent
la session. Le worker revérifie le CAS sous le verrou Git avant tout effet.

La résolution automatique traite uniquement les scalaires de version déclarés
si les autres octets et données, ainsi que le mode, sont identiques à HEAD.
Les autres conflits restent refusés. Une résolution manuelle nécessite les
chemins réservés et leurs OID/modes HEAD et staged, le SHA256 de chaque diff,
ainsi que `resolution_approval` avec `paths_digest`, `owner_reference` et
`reviewer_reference`. Le propriétaire et le responsable doivent avoir relu ces
deltas exacts ; une référence libre ne constitue pas une preuve native nouvelle.
L’administrateur porte cette décision explicite et la conserve avec le CAS.
Aucun choix ours implicite ni modification du fichier de travail/index source
n’est effectué pour cette résolution ; seul l’index candidat reçoit les blobs
exactement approuvés. Toute divergence refuse l’admission ou son dispatch.

L’échec original et son reçu restent inchangés ; un événement immuable conserve
le snapshot de l’étape FAILED. La nouvelle tentative de commit est corrélée,
et la continuation reprend les seules étapes aval jamais émises. Le PID encore
vivant d’un service n’est pas une preuve d’activité d’un worker logiquement terminé.
Les opérations Git restent exclusivement exécutées par CAB.


Pour un CICDF dont le commit a échoué avant les références avec
`session-delivery-shared-index-conflict`, `inspect_precommit` accepte aussi
les écarts de rapports attestés dans l’index partagé. Le candidat conserve
l’arbre Git du lot initial. La reprise vérifie les témoins de statistiques,
le code de travail, la version et les empreintes d’index avant le commit.
Une entrée de code modifiée dans l’index partagé ou une preuve manquante
empêche l’admission. Le reçu original et les étapes version et projection
sont conservés.

Quand un change est archivé alors que son ancien rapport reste en attente,
CAB peut classer le reste `FAILED_REMAINDER_NO_CHANGE`. Le chemin retiré,
le blob ancien attesté avant le lot et les rapports achevés sont vérifiés sous
verrou. L’événement conserve le reçu UNKNOWN d’origine et les preuves.


## Effets ponctuels et reprises de session

Les commandes `session.effect.authorize`, `.inspect`, `.request`, `.status` et
`.open_recovery` sont exposées par `session_effect` dans MCP. Les identités du
projet et du RUN restent celles de la connexion. L'autorisation ponctuelle
porte une nature précise et une référence stable ; seul le propriétaire direct,
l'administrateur ou l'orchestrateur désigné peut la porter. Le codeur piloté
peut exécuter une autorisation reçue ou demander la reprise d'une étape FAILED.

Les natures sont `commit` (sans nouveau tag), `build:debian`, `build:docker`,
`publish:FORGEJO`, `publish:GITHUB`, `publish:GITLAB` et `resume` pour la reprise
après commit. Une demande sans expected_state capture le CAS côté service ;
inspect permet de fournir explicitement ce snapshot pour un diagnostic.
Le couple RUN/request_id désigne une seule tentative. L'intention, son dispatch,
les progrès et le résultat sont immuables. Une intention indécise bloque les
effets suivants ; une requête connue ne redispatche rien.

La reprise après commit ouvre une édition sur une livraison PARTIAL arrêtée,
avec commit COMPLETED, échec connu et aucun effet RUNNING/UNKNOWN. Elle conserve
les reçus/plan originaux, rouvre uniquement son index et garde sa version. Sous
mandat CICDF explicite, le CAS capture tous les fichiers admissibles du projet.
Le commit supplémentaire avance la branche et déplace son tag atomiquement,
puis les envois utilisent les références distantes observées comme leases.
Les étapes aval nécessaires reçoivent de nouveaux reçus ; les inconnues restent
protégées. Aucun statut SQL manuel ni appel Git client n'est un parcours de reprise.

`session.version.prepare` (`session_version_prepare`) réserve et aligne les
versions du Python, pyproject, frontend/verrou, manifestes plugins et commandes
CAB. En piloté ces fichiers doivent être dans le cadrage de l'orchestrateur.
L'intention d'écriture est conservée avant mutation. Qualifier les sources après
préparation ; le prévol et la création du commit refusent un désalignement.


### Remédiation avant reprise

Un échec de build suit diagnostic → remédiation → qualification → reprise.
`session_effect(action="diagnose", args={delivery_id})` expose des causes et
remédiations structurées, sans sortie brute du processus. Après open_recovery,
`action="remediate"` prépare les versions publiques nécessaires et retourne
SOURCE_QUALIFICATION_REQUIRED. `request(kind="resume", mode="recovery")` déclenche
aussi cette préparation automatiquement si elle manque ; si elle modifie les
sources, il rend la main pour leur qualification, avant toute nouvelle tentative.
Un manque de dépendance ou un défaut de source non corrigé reste explicitement
à traiter. Le moteur n'installe pas de dépendance nouvelle ni ne rejoue UNKNOWN.
Le suivi natif constate aussi un arrêt du worker, avec reçu conservé.
