# Administration CAB 3

Le service système unique `cab.service` utilise les droits root et démarre avec
la machine. PostgreSQL reste indépendant. L’installation neuve expose uniquement
le parcours Web d’initialisation sur le port 8790 ; le démarrage du service ne
crée pas la base CAB. La configuration privée est `/etc/cab/cab.json` (root, 0600,
répertoire 0700). Les configurations existantes doivent être conservées.

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
et opencode.json, privés0600. Le compte est résolu par UID, y compris root ;
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

Le propriétaire déclare l’étape1–11 et sa phase via `cab call run.progress`
(project_id,run_id,stage,phase) ou run_progress. Les positions peuvent reculer.
Le tableau temps réel porte étape et tâches réalisées ; le RUN ouvre
/projects/<project_id>/runs/<run_id>. Les inconnues restent explicites.
Les tâches proviennent du tasks.md unique actif ou archivé ; change_tasks
mémorise les libellés, cases, ordre, lignes et empreinte, y compris les anciennes
lignes retirées sous état inactif. Une source indisponible conserve le dernier
instantané et le signale. Les cases ne valident ni le RUN ni le gate terminal.

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
