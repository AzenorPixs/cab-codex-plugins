# Mise à jour des briques actives — CAB 1.10.0

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
quatre briques en 1.10.0, puis chaque reprise est validée. Cette seconde étape
peut reconnecter le broker et relancer le Web, sans fermer OpenCode.
Un autre PENDING ou un écart entre compteurs global/RUN/session bloque le
profil ; aucune demande inconnue n'est annulée ou attribuée par déduction.

Le contrôleur nouveau vérifie le journal privé par la route
POST /coordination/maintenance/adopt avant son véritable HELD. Le recontrôle
précède la libération commune et conserve job.recovery. Le JSON de résultat
distingue packageVersion, buildDigest et runtimeVersions : la transition
qualifiée est contrôleur 1.10.0 avec broker/superviseur/Web 1.7.1 conservés.
Elle ne constitue pas un déploiement global aligné 1.10.0. Une autre version
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

`/cab update` utilise `scripts/cgpt-approval-bridge-update.mjs` depuis le plugin
installé. Son invocation explicite autorise le cycle de maintenance des briques
CAB ; l'exécution d'une session SCM ne déclenche pas cette procédure réelle.

## Cibles et prérequis

La politique ordinaire explicite `--broker-policy reuse-readonly` exige
`--layout managed-release` et `--broker-proof-file` privé 0600, propriétaire
de l'acteur. Le JSON contient exactement authorization, entry, expectedUid,
expectedGid, manifest des trois modules, loadedVersion, instanceId,
opencodeProcess et brokerProcess (pid/startTime/uid). La version des fichiers
doit être la cible 1.10.0 ; la version chargée est vérifiée indépendamment.
Les trois fichiers sont seulement lus et comparés au paquet. Aucun stage,
backup restaurable, remplacement, nouveau lien ou compilation sur place du
broker n'est effectué. Les droits et propriétaires restent conservés.

Tous les RUN doivent être sous PAUSE explicite. Les services sont gérés par
leur compte et OpenCode relance son propre enfant MCP, sans changement de
configuration. L'intention est persistée avant la première déconnexion.
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

Résoudre les seuls chemins et paramètres non secrets : plugin installé,
workspace canonique, home du compte systemd, URLs contrôleur/superviseur/Web/
OpenCode, et répertoire réellement lancé du broker. Les chemins sont absolus,
les URLs HTTP sont loopback sans identifiants. Ne pas exposer un environnement
complet ou lire un fichier sensible pour cette résolution. Une cible inconnue,
un processus manuel non géré ou une installation dans le workspace reste un
blocage explicite ; ne pas déplacer son code ou modifier sa configuration.

L'outil installe seulement les scripts nommés dans
`~/.local/share/cab-approval-bridge/`, le jeu indépendant Web dans
`~/.local/share/cab-approval-bridge-monitor/{scripts,web-monitor}/`, les modules
broker dans son répertoire désigné et les trois unités systemd utilisateur.
Le broker peut partager le répertoire des scripts, les fichiers restent
distincts. Les variables, configurations env, drop-ins, sources et données du
projet piloté restent conservés. Aucun script n'est exécuté depuis le paquet
pour valider son contenu : Node vérifie la syntaxe et Python compile dans un
cache temporaire privé. src/ reste l'autorité des copies broker distribuées.

OpenCode doit être accessible pour prouver la connexion MCP. Si le broker ou
le superviseur fonctionne, le contrôleur doit être accessible. Une instance
active doit appartenir à l'unité attendue, avec le chemin ExecStart attendu,
et le registre doit confirmer son workspace et le protocole resource-scoped-v1
avec schéma 4. Une incompatibilité de runtime exige une maintenance distincte.

## Transaction et reprise

Le journal privé se trouve sous
`~/.local/state/cab-approval-bridge-update/`. Un verrou exclusif couvre les
briques partagées du profil. L’autorité utilise un
verrou flock tenu par le helper Python déjà distribué. Sa fermeture libère
l'autorité, même après interruption ; l'inode reste en place et n'est jamais
supprimé pour forcer une opération concurrente. Le journal doit être valide
avant toute récupération.

Le paquet complet est vérifié puis sauvegardé. Les empreintes des fichiers
installés sont recontrôlées avant remplacement. Une dérive externe bloque la
transaction sans écraser cette modification. L'intention de gel est persistée
avant la requête de maintenance. DRAINING ferme les nouvelles admissions ;
l'outil ne décide aucune permission et attend que les mandats, effets et
permissions en cours soient réconciliés. HELD est confirmé par le contrôleur.
Une attente bornée retourne code 2 et conserve les processus et le gel.
Relancer la même commande pour reprendre cette transaction.

Sous HELD, l'outil arrête les briques actives, déconnecte le broker par le MCP
natif, remplace atomiquement les seuls artefacts, recharge systemd et rétablit
les états actif/inactif initiaux. Il ne démarre pas OpenCode, ne crée aucune
session et n'active aucune unité au login. Les pauses déjà demandées ne sont
pas levées. Les schémas métier ne sont pas migrés.

Le succès exige les versions propres aux composants relancés et les mêmes
identités, générations, réservations et propriétaires de demandes. Une version
broker doit provenir d'une readiness reçue après reconnexion. Le gel est levé
seulement après ces preuves. Une transaction déjà conforme ne redémarre rien.

## Retour arrière

Une erreur après le début des arrêts déclenche le retour aux seuls artefacts
sauvegardés, puis aux états initiaux. Les fichiers runtime, décisions consommées,
RUN et archives ne sont jamais restaurés depuis une ancienne copie. Un échec
de repli conserve le gel et la phase ROLLBACK_FAILED ; ne pas annoncer un succès.

Une nouvelle invocation récupère d'abord la transaction interrompue. L'option
`--rollback`, avec les mêmes cibles et URLs, permet un repli explicite. Pour une
transaction restée WAITING, cette option attend une frontière sûre puis lève
seulement son gel : aucune modification externe survenue pendant l'attente
n'est écrasée. Une libération de maintenance ambiguë est réconciliée avant toute
autre action ; si le gel est déjà levé, aucun repli automatique n'interrompt
des RUN susceptibles d'avoir repris.

Les sauvegardes et reçus restent privés et ne sont pas purgés automatiquement.
Le bilan sépare fichiers déployés, versions actives, inactivité, attente,
retour arrière confirmé et récupération nécessaire. Un service réel n'est pas
présenté comme vérifié sur la seule base d'un test simulé.
