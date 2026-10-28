# Mise à jour autonome des briques CAB — CAB 2.1.2

## Association du skill et des commandes

Le manifeste du plugin MUST référencer `./skills/`. Le skill
`skills/approval-bridge/SKILL.md` MUST pointer vers cette référence et décrire
le script `scripts/cgpt-approval-bridge-update.mjs`. `/CAB update` MUST vérifier
ce lien avant mutation. `/CABU` MUST charger le fichier frère `CAB.md` de même
version et lui déléguer exactement `update` ; il ne contient pas de procédure
de maintenance parallèle.

## Processus forcé de `/CAB update` et `/CABU`

`/CABU` sans argument charge le fichier frère `CAB.md` de même version et lui
délègue exactement `update`. La procédure est portée par `CAB.md` et cette
référence ; elle ne se duplique pas dans l'alias.

L'update valide le manifeste, le skill, cette référence, l'updater, les trois
commandes, les versions du paquet, la fermeture des imports, les syntaxes, les
destinations explicites et les sauvegardes. Il ne consulte aucun RUN, job,
permission, gel global ni état de service pour décider de commencer. Il ne
demande pas `SHARED_MAINTENANCE`, ne suspend pas les RUN et ne relit pas le
registre métier avant l'arrêt.

Après validation et staging, l'updater appelle systématiquement, dans l'ordre,
`systemctl --user stop` pour les unités
`cgpt-approval-bridge-controller.service`,
`cgpt-approval-bridge-supervisor.service` et
`cgpt-approval-bridge-monitor.service`.
Il remplace atomiquement tous les fichiers des quatre briques, y compris les
trois fichiers Python broker dans le répertoire explicitement déclaré, conserve
les sauvegardes privées, recharge systemd, puis appelle systématiquement
`systemctl --user start` pour les trois unités. Les unités ne sont jamais
activées au login. Une invocation dont les versions sont déjà égales effectue
tout de même cet arrêt et ce redémarrage.

OpenCode reste ouvert. L'updater détecte sa disponibilité avant la coupure,
sans lire les RUN. Si OpenCode est actif, il déconnecte le broker via la route
native V2 après arrêt des services, installe les fichiers, démarre les trois
services puis reconnecte le broker. Une readiness fraîche doit prouver sa
version cible. Un échec d'authentification, de location, de reconnexion ou de
version sur un OpenCode actif interdit le succès et déclenche le repli.

L'absence prouvée du processus OpenCode autorise l'installation des fichiers
broker sans version chargée ; le rapport indique alors `INDISPONIBLE`. Une
présence incertaine ne vaut pas preuve d'absence. systemd est rechargé si les
unités changent ; les trois services sont toujours arrêtés et redémarrés.

Pour le dépôt CAB, la destination du broker est le répertoire `src/` sous la
racine CAB : BUILD.md y définit le point d'entrée source et les trois modules
importables. Cette destination ne dépend pas d'un processus OpenCode en cours. Utiliser
`--broker-policy cab-source` : cette exception exige exactement src/, le projet
`cab` dans pyproject.toml et un manifeste local identique au paquet installé.
Les liens, caches, autres destinations dans le workspace et le layout
managed-release restent refusés pour cette politique.

Après redémarrage, l'updater vérifie les versions réellement servies par le
contrôleur, le superviseur et le moniteur, et leur workspace. Il produit un
rapport complet des versions publiées, du plugin installé, des fichiers
déployés, des processus observés et du résultat transactionnel. Un échec de
validation de paquet ou de destination survient avant l'arrêt. Un échec après
arrêt restaure les seuls artefacts sauvegardés, recharge systemd et redémarre
les trois unités ; il conserve le journal et signale le repli.

## Profil de récupération gelée

Le profil `frozen-recovery-controller` est une opération distincte de la mise
à jour ordinaire. Son invocation exige l'accord spécifique de maintenance ;
un mandat source SCM, une demande de version ou un statut READY ne l'autorise
pas. Utiliser `--profile frozen-recovery-controller --frozen-proof-file` avec
un fichier JSON privé 0600 contenant transactionId, authorization, target,
originalManifest, expectedBuildDigest et preservedProcesses. Le répertoire
broker n'est pas requis pour ce profil puisqu'il n'y écrit rien.

target désigne exactement runId, jobId, expectedSessionId, candidateSessionId,
recoveryId, preflightRequestId, approvalId, reservationVersion et contextId.
Les identités et empreintes viennent des preuves vivantes et de la notification
originale. La candidate reste ASK ; l'ancienne session révoquée peut rester
DENY. Le fichier d'autorisation doit aussi lier le manifeste et les identités
PID/startTime/uid des processus OpenCode, broker et Web préservés (web=null si
inactif). Aucune valeur inconnue ne doit être inventée pour passer les gardes.

La préparation vérifie fermeture d'imports, syntaxe, fichiers installés et
sauvegardes, puis demande SHARED_MAINTENANCE. Le refus HELD de l'original
reste enregistré. BOOTSTRAP_HELD est un reçu privé, sous verrou update,
scellé par empreintes et limité à 60 secondes ; ce n'est jamais un faux HELD.
Le profil vérifie tous les pairs et les préfixes, arrête seulement superviseur
et contrôleur gérés, puis charge le nouveau contrôleur. OpenCode, broker et
Web restent ouverts ; aucun connect/disconnect ni instance/dispose n'est permis.

Les pairs doivent conserver une PAUSE explicitement autorisée. Après complete,
la récupération ne vaut pas autorisation métier dans l'état mixte : une
maintenance ordinaire distinctement autorisée doit aligner réellement les
quatre briques en 2.1.2, puis chaque reprise est validée. Cette seconde étape
peut reconnecter le broker et relancer le Web, sans fermer OpenCode.
Un autre PENDING ou un écart entre compteurs global/RUN/session bloque le
profil ; aucune demande inconnue n'est annulée ou attribuée par déduction.

Le contrôleur nouveau vérifie le journal privé par la route
POST /coordination/maintenance/adopt avant son véritable HELD. Le recontrôle
précède la libération commune et conserve job.recovery. Le JSON de résultat
distingue packageVersion, buildDigest et runtimeVersions : la transition
qualifiée est contrôleur 1.10.5 avec broker/superviseur/Web 1.7.1 conservés.
Elle ne constitue pas un déploiement global aligné 1.10.5. Une autre version
préservée est refusée. La qualification isolée inclut rejet, polling, retry,
nouveau prévol once/exit 0 et complete via le broker original conservé.

OC_Codex_MAINTENANCE_STATE_DIR sélectionne la racine privée contrôlée du
journal ; défaut ~/.local/state/cab-approval-bridge-update/frozen-controller.
Une dérive de stage, sauvegarde, processus, génération, job ou historique
suspend la transaction. Reprendre le même journal ; ne pas fabriquer une
nouvelle transaction pour contourner une preuve expirée ou incohérente.

Le rollback automatique ne restaure que le code compatible et peut laisser
ROLLED_BACK_FROZEN sans libération de maintenance. Après REJECTION_ONLY, un
ancien lecteur incompatible ne doit plus être réinstallé ni un ancien état
restauré. --rollback manuel est refusé pour ce profil. La réconciliation L1,
la décision rejected et le nouveau prévol restent des opérations distinctes.

## Installations par releases à liens relatifs

Le mode explicite `managed-release` prend en charge les liens relatifs vers
`releases/<identifiant>/{scripts,broker,web-monitor}` sous une racine possédée
par le compte de maintenance et non modifiable par un tiers. Les liens absolus,
les traversées, les liens internes et les changements de pointeur inattendus
sont refusés. Les fichiers de l'ancienne release restent intacts.

Pour le profil gelé, inscrire `layout: "managed-release"` dans le fichier
de preuve privé. La nouvelle fermeture du contrôleur est préparée dans une
release immuable ; seul son lien d'entrée est basculé. Les autres liens et
processus gardent leur ancienne version. Le repli restaure ce seul pointeur.

Pour la maintenance ordinaire, fournir `--layout managed-release` avec les
mêmes cibles explicites. Le journal distingue liens de fichiers et liens de
répertoires, prépare la nouvelle release puis bascule les pointeurs sous HELD.
Le retour arrière restaure les pointeurs et fichiers précédents, sans réécrire
les anciennes releases. Le bilan distingue versions déployées et versions
réellement actives ; un composant inactif reste indiqué comme tel. Sans ce mode
explicite, la protection historique qui refuse les liens reste applicable.

## Diagnostic filtré d'une demande non attribuée

`scripts/cgpt-approval-bridge-approval-metadata.mjs` accepte `--opencode-url`,
`--directory`, `--session-id`, `--approval-id` et, pour lever une ambiguïté,
`--part-id`. Il effectue seulement des GET sur une session technique existante
et ses messages, puis projette une observation native `broker_health` déjà
achevée. Il ne crée pas de session, ne sollicite pas d'outil et ne lit pas le
magasin privé du broker. Commandes, contenus métier et secrets sont exclus
du résultat.

Une identité absente reste `null`, avec `attribution_complete=false` ;
`observation_is_current=false` signale que la source est historique. Le
diagnostic ne constitue ni une attribution actuelle, ni une preuve d'absence
d'effet, ni une autorisation d'annulation. Une demande non attribuée reste
bloquante : son propriétaire doit fournir des preuves actuelles et une décision
autorisée distincte avant toute maintenance gelée.

`/CAB update` utilise `scripts/cgpt-approval-bridge-update.mjs` depuis le plugin
installé. Son invocation explicite autorise le cycle de maintenance des briques
CAB ; l'exécution d'une session SCM ne déclenche pas cette procédure réelle.

## Cibles et prérequis

En 1.10.7, `expectedUid` désigne les processus OpenCode/broker. Les champs privés optionnels `artifactOwnerUid` et `directoryOwnerUid` lient les propriétaires des modules et du répertoire. Ils doivent être l'acteur de maintenance ou expectedUid ; leur omission conserve le contrat ancien. La maintenance conserve ces propriétaires et les recontrôle avec groupe, modes et empreintes. Un broker exécuté sous devops peut ainsi charger des modules détenus par l'acteur ADE, sans changement de droits.

Une demande orpheline du job courant en PAUSE utilise `recoveryId: null` dans `/runs/<run_id>/validation/reconcile`. Seule la décision rejected devient possible après preuve native de non-exécution ; la même approbation doit confirmer REJECTED avant clôture du mandat. Si l'ancien contrôleur ne connaît pas le propriétaire, l'orchestrateur peut transmettre sa décision explicite par l'outil manuel reject du broker existant, puis observer REJECTED sans réémettre la demande ou exécuter le métier.

La politique ordinaire explicite `--broker-policy reuse-readonly` exige
`--layout managed-release` et `--broker-proof-file` privé 0600, propriétaire
de l'acteur. Le JSON contient exactement authorization, entry, expectedUid,
expectedGid, manifest des trois modules, loadedVersion, instanceId,
opencodeProcess et brokerProcess (pid/startTime/uid). La version des fichiers
doit être la cible 2.1.2 ; la version chargée est vérifiée indépendamment.
Les trois fichiers sont seulement lus et comparés au paquet. Aucun stage,
backup restaurable, remplacement, nouveau lien ou compilation sur place du
broker n'est effectué. Les droits et propriétaires restent conservés.

Dans la seule politique explicite `reuse-readonly`, tous les RUN doivent être
sous PAUSE explicite. Les services sont gérés par leur compte et OpenCode
relance son propre enfant MCP, sans changement de configuration. L'intention
est persistée avant la première déconnexion.
Une erreur après cette intention conserve HELD sous READONLY_RECOVERY_REQUIRED ;
--rollback ne peut pas recréer l'ancien processus depuis les sources cibles.
Relancer la même commande avec la même preuve pour réconcilier puis poursuivre
vers le jeu autorisé. Une dérive de source, identité ou génération reste
bloquante. Aucun ancien registre ni décision n'est restauré.

Le succès vérifie les quatre versions actives, la readiness postérieure à la
reconnexion, le nouveau broker depuis l'entrée autorisée et le même processus
OpenCode, ainsi que jobs, réservations et PAUSE. Une deuxième invocation
conforme ne redémarre rien. Le profil gelé M2 refuse cette politique. Les
comportements par défaut d'installation restent inchangés.

Résoudre les chemins absolus du plugin, du workspace canonique, du home systemd,
des URLs loopback et de la destination broker déclarée. Pour le dépôt CAB, cette
destination est `<CAB_ROOT>/src`. OpenCode n'est pas une précondition de
l'update ; sa base loopback peut rester indisponible. Ne pas lire de fichier
sensible, déplacer un code broker ou modifier son lancement MCP.

L'outil installe seulement les scripts nommés dans
`~/.local/share/cab-approval-bridge/`, le jeu indépendant Web dans
`~/.local/share/cab-approval-bridge-monitor/{scripts,web-monitor}/`, les modules
broker dans son répertoire désigné et les trois unités systemd utilisateur.
Le broker peut partager le répertoire des scripts, les fichiers restent
distincts. Les variables, configurations env, drop-ins, sources et données du
projet piloté restent conservés. Aucun script n'est exécuté depuis le paquet
pour valider son contenu : Node vérifie la syntaxe et Python compile dans un
cache temporaire privé. src/ reste l'autorité des copies broker distribuées.

Après redémarrage, vérifier les trois unités systemd CAB et les endpoints de
version controller, supervisor et monitor. La readiness broker est vérifiée
si OpenCode répond ; son indisponibilité est rapportée `INDISPONIBLE` et
n'empêche pas la mise à jour des fichiers. Aucune lecture du registre des RUN
ou de la coordination globale n'est requise par la procédure ordinaire.

## Transaction et reprise

Le journal privé se trouve sous
`~/.local/state/cab-approval-bridge-update/`. Un verrou flock tenu par le
helper Python protège l'installation. Sa fermeture libère le verrou, même
après interruption ; l'inode reste en place et n'est jamais supprimé pour
forcer une opération concurrente.

Le paquet complet est vérifié puis sauvegardé. Les empreintes des fichiers
installés sont recontrôlées avant remplacement ; une modification concurrente
des artefacts cibles est préservée et bloque avant arrêt.

L'outil arrête systématiquement les trois unités systemd CAB, tente une
déconnexion native du broker si OpenCode répond, remplace atomiquement les
fichiers des quatre briques, puis exécute `systemctl --user daemon-reload` et
démarre controller, supervisor et monitor. Aucune unité n'est activée au login.
OpenCode n'est ni fermé ni tué. Si son API est absente, le broker reste
`INDISPONIBLE` côté runtime mais ses fichiers sont installés. Aucun état de RUN
ou schéma métier n'est modifié par cette opération.

Le succès exige les versions des trois unités après redémarrage et la version
des fichiers broker. La version runtime broker vient uniquement d'une readiness
postérieure au rechargement ; sans elle, le rapport indique `INDISPONIBLE`.
Chaque invocation redémarre les trois unités, même si le jeu est déjà conforme.

## Retour arrière

Une erreur après le début des arrêts déclenche le retour aux seuls artefacts
sauvegardés, recharge systemd et redémarre les trois unités. Les fichiers runtime,
décisions consommées, RUN et archives ne sont jamais restaurés depuis une
ancienne copie. Un échec de repli conserve la phase ROLLBACK_FAILED et interdit
d'annoncer un succès.

Une invocation suivante réconcilie d'abord un reçu interrompu. L'option
`--rollback`, avec les mêmes cibles, permet un repli explicite sur les seules
sauvegardes correspondantes. Aucune coordination globale n'est créée ou
libérée par le chemin ordinaire forcé.

Les sauvegardes et reçus restent privés et ne sont pas purgés automatiquement.
Le bilan sépare fichiers déployés, versions actives, inactivité, attente,
retour arrière confirmé et récupération nécessaire. Un service réel n'est pas
présenté comme vérifié sur la seule base d'un test simulé.

## Transition ordinaire depuis 1.9.0 vers 1.10.5

Le profil reuse-readonly accepte les versions chargées qualifiées 1.7.1, 1.8.0, 1.9.0, 1.10.0, 1.10.1, 1.10.2, 1.10.3, 1.10.4, 1.10.5, 1.10.6, 1.10.7, 1.10.8, 1.10.9, 1.10.10 et la cible 2.1.2. Cette liste reste fermée ; un numéro inconnu ou un cachebuster fourni comme version chargée est refusé. Les artefacts doivent toujours être identiques à la cible 2.1.2, et la preuve doit conserver la version réellement chargée avant reconnexion. Les contrôles de propriétaire, manifeste, processus, PAUSE, HELD et récupération ne sont pas assouplis. Le banc historique à deux UID qualifie le cycle complet 1.10.3 vers 1.10.4, avec succès et réponse de déconnexion perdue ; les comptes et fichiers hôte ne sont pas modifiés. Les qualifications des origines plus anciennes restent identifiées dans leurs archives.

## Registre de maintenance volumineux — 1.10.9

Dans le profil ordinaire, seul GET /runs sans suffixe et le lecteur privé de controller-runs.json acceptent jusqu'à 16 Mio. Les autres réponses HTTP gardent 2 Mio et les autres fichiers 4 Mio. La lecture reste intégrale et bornée ; un dépassement est refusé, sans troncature ni purge. Identités, schéma, permissions, génération, PAUSE, HELD et preuves restent recontrôlés. Le banc grand registre vérifie les deux UID réels, les deux issues et le refus d'écriture au broker.

Une mise à jour locale explicitement demandée utilise le jeu local qualifié et conserve sa provenance et ses sauvegardes. Le plugin est installé par le mécanisme pris en charge ; son cache n'est pas édité manuellement. Une publication distante antérieure ne doit pas remplacer implicitement le jeu local plus récent. Le bilan distingue cet état de la publication GitHub et conserve les informations nécessaires pour rétablir l'origine distante après sa publication autorisée. Aucun commit ou push n'est déduit d'une installation locale.

## Réparation ciblée du lecteur 1.10.5

Ce cas exige une autorisation explicite et un journal READONLY_RECOVERY_REQUIRED après déconnexion native, avec contrôleur et superviseur arrêtés. Il est limité au layout managed-release à liens de fichiers et à la correction exacte du lecteur générique runs.mjs conservant les anciennes clés logiques. Tout autre changement de code est refusé.

Exécuter depuis le paquet corrigé et qualifié, sans éditer de cache installé :

```text
node <plugin>/scripts/cgpt-approval-bridge-forward-repair.mjs
  --home <profil-systemd> --workspace <workspace>
  --plugin-root <plugin-corrigé> --broker-directory <broker-existant>
  --transaction-id <identifiant-du-journal>
  --authorization <référence-non-secrète-de-la-validation-humaine>
  --broker-proof-file <preuve-privée-initiale>
```

Les options --controller-url, --supervisor-url, --monitor-url et --opencode-url acceptent les mêmes URLs locales que la maintenance. Les chemins sont absolus. La preuve broker et le contexte restent ceux de la transaction initiale ; aucun nouveau gel n'est créé.

L'outil vérifie HELD SHARED_MAINTENANCE, génération, PAUSE, jobs, quiescence native, sources broker et identité OpenCode. Il conserve reçu et stages initiaux sous `<transaction>/forward/<réparation>/`, valide une copie privée du registre sans autorité runtime, puis rétablit les seules références de code antérieures sans exécuter ce code. Il révise le stage qualifié et le plan de nouvelle release dans le même reçu. Les données métier et anciennes releases ne sont jamais restaurées ni réécrites. Un plan interrompu est réutilisé ; toute dérive est refusée.

Après prepared ou already-prepared, relancer l'updater ordinaire reuse-readonly avec le même contexte et la même preuve. Lui seul reconnecte le broker, contrôle les quatre versions réellement actives et libère le gel. Les RUN restent en PAUSE jusqu'à leur reprise explicite. Ne pas supprimer le journal, réinstaller l'ancien broker, rejouer once ou fermer OpenCode.

## Broker créé depuis un thread OpenCode

La découverte examine children de chaque TID numérique sous /proc/<OpenCode>/task et déduplique les PID. Elle vérifie ensuite UID, PPID OpenCode, Python avec l'unique argument du point d'entrée déclaré, identité PID/startTime/UID et unicité. L'identité OpenCode est contrôlée avant et après découverte. Une disparition concurrente de thread est tolérée ; les autres erreurs restent bloquantes. Aucune donnée d'environnement ni argv brut n'est restitué. Le même processus OpenCode est préservé. Cette reconnaissance ne vaut ni readiness ni permission : leurs contrôles restent distincts.

Pour `cab-source`, si les services sont configurés pour un autre projet, fournir
`--service-workspace <workspace-absolu-observé>` : les contrôles de version et
les appels MCP ciblent ce workspace réel sans modifier les configurations.
La récupération conserve le même journal et les mêmes destinations. Le jeu Web
indépendant inclut aussi cgpt-approval-bridge-opencode-client.mjs.

### CABU 2.1.2 : coupure courte et reprise

CABU délègue au seul updater de `/CAB update`. La préparation, la compilation
et les sauvegardes précèdent la coupure. Les validations syntaxiques peuvent
être réutilisées uniquement pour le même contenu et le même validateur ; les
empreintes des sources, stages et destinations restent vérifiées à chaque appel.
Les fichiers prêts sont préparés sur le système de fichiers cible ; la coupure
contient principalement les arrêts, renommages et redémarrages. systemd est
rechargé lorsque les unités changent, sans activation au login.

Les RUN ne sont ni avertis, ni placés en PAUSE, ni modifiés. L'absence du
transport bloque leurs nouvelles opérations CAB ; les effets déjà lancés côté
OpenCode peuvent continuer. Au retour, les états durables sont restaurés et les
effets inconnus restent protégés jusqu'à réconciliation, sans rejeu de once.

Les trois services doivent servir 2.1.2 en fin de transaction. OpenCode actif
exige une déconnexion/reconnexion native du broker et une readiness fraîche
portant la version cible. Une API ou une reconnexion non vérifiable interdit
le succès ; seule l'absence prouvée d'OpenCode autorise un broker runtime
INDISPONIBLE. Les durées preparationMs, unavailableMs et totalMs sont publiées ;
la cible est moins de cinq secondes de coupure dans le banc contrôlé.

Contrat courant CABU 2.1.2 : les tolérances historiques de broker non vérifiable
ne permettent plus le succès si OpenCode est actif. Une absence prouvée est
requise pour la seule exception broker. Appliquer le contrat de coupure courte
de component-update.md ; ne prévenir ni modifier les RUN pour cet update.

GitHub `AzenorPixs/cab-codex-plugins`, branche `main`, fournit par défaut les
versions cibles des plugins CAB/CABU, du broker, du contrôleur, du superviseur,
du Web et des commandes. Appliquer la procédure distante de `CAB.md`, même
en présence d'une marketplace locale. Vérifier le jeu publié et sa cohérence
avant la coupure ; une source distante inaccessible ou divergente interdit
un repli local implicite. Préserver une version installée plus récente sans
déployer ses briques au titre d'une mise à jour distante.

Le reçu last-deployment.json privé, produit après succès, fournit seulement
les cibles non secrètes de déploiement ; il ne choisit pas la source des
versions. Une voie locale exige une demande explicite pour cette invocation.
Les contrôles de chemins, versions et empreintes restent obligatoires.

Le broker MCP unique appartient à la location serveur OpenCode, découverte via
GET /api/location sans en-tête de projet. Les requêtes MCP utilisent cette
location ; les requêtes de session gardent le workspace du RUN via
x-opencode-directory. Ne pas créer un deuxième broker dans un projet distinct.
