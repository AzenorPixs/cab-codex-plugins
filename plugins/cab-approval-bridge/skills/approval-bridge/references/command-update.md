# Mise à jour — CAB 2.2.25

## `/CAB update`

Met à jour le plugin, son skill `approval-bridge`, les quatre briques CAB
(broker, contrôleur, superviseur, Web) et les deux commandes du profil.
`/CABU` est l’entrée dédiée sans argument qui charge CAB.md et délègue ici ;
il ne contient aucune logique de maintenance. La procédure utilise la référence
`skills/approval-bridge/references/component-update.md` du plugin installé et
vérifie que le manifeste, le skill, sa référence et le script updater sont bien
associés avant toute mutation.

Les unités du plan sont cgpt-approval-bridge-controller.service,
cgpt-approval-bridge-supervisor.service et cgpt-approval-bridge-monitor.service.

Appliquer la préparation à chaud, l'idempotence et la bascule sélective de
[component-update](component-update.md), puis vérifier la continuité décrite
par [transport-continuity](transport-continuity.md). Aucun arrêt systématique
n'est requis lorsque les artefacts et processus sont conformes. Le bilan
sépare préparation, bascule, indisponibilité observée et vérification.

Si le plan exige un rechargement broker, employer seulement
POST /api/experimental/mcp/cgpt-validation/disconnect puis
POST /api/experimental/mcp/cgpt-validation/connect à sa location native.
Un broker déjà conforme reste connecté. La readiness fraîche reste requise.

### Prévol 2.1.33 du credential et du layout

Avant la coupure, l’updater valide le credential privé systemd. Si le DEVOPS.md du projet désigne OPENCODE_PASSWORD dans project.env et que le développeur autorise ce raccord, passer explicitement `--opencode-password-env-file <workspace>/project.env` (source CAB ou workspace des services). Ne jamais lire ou afficher sa valeur dans les outils du modèle : seul le processus local traite le fichier. Sans cette option, utiliser le credential privé existant ; ne pas exiger de variable des projets sans OpenCode. Un conflit avec un credential existant reste refusé. Un credential nouvellement provisionné est conservé après échec sans copie dans les sauvegardes.

Pour des services installés par liens gérés, combiner `--broker-policy cab-source --layout managed-release` ; seuls les services et le Web utilisent les releases, les trois modules src/ restent ordinaires. Ne pas matérialiser manuellement les anciens liens. Fournir `--service-workspace` si les services suivent un autre projet. Une erreur CLI inclut les diagnostics filtrés par service et le résultat du repli ; conserver ces preuves, sans assimiler systemctl start à une application active.

### GitHub comme référence de version par défaut

Pour `/CAB update` et `$CABU`, appliquer les étapes distantes 1 à 14 depuis
`AzenorPixs/cab-codex-plugins`, branche `main`, même si `cab_codex_plugins`
est une marketplace locale. GitHub fournit les versions cibles des plugins
CAB/CABU, du broker, du contrôleur, du superviseur, du Web et des deux commandes.
La présence d'un paquet local ou de fichiers déjà installés n'autorise jamais
à sauter la vérification distante ni l'actualisation de la marketplace Git.
Une source GitHub indisponible ou un jeu distant incohérent arrête la
préparation avant toute coupure, sans repli local implicite.

Résoudre les cibles non secrètes depuis
`~/.local/state/cab-approval-bridge-update/last-deployment.json` si présent,
vérifier leurs chemins, leurs URLs loopback et le workspace observé. Ce reçu
décrit les destinations, jamais la provenance ni la version cible du paquet.

### Source locale CAB plus récente que GitHub

Uniquement si une installation locale est explicitement demandée pour cette
invocation, appliquer cette exception. Avant toute actualisation de marketplace,
comparer le manifeste GitHub `main`
au manifeste du paquet local `CAB_ROOT/plugins/cab-approval-bridge`, où
`CAB_ROOT` est la racine CAB résolue depuis `DEVOPS.md`. Si GitHub est au moins
à la version locale, appliquer les étapes distantes ci-dessous. Si GitHub est
antérieur, préserver cette provenance locale explicitement demandée : ne pas migrer la marketplace
vers une version plus ancienne et ne pas lancer `codex plugin marketplace
upgrade`.

Pour le chemin local explicitement demandé, utiliser le mécanisme Codex pris en
charge. Si `cab_codex_plugins` pointe vers GitHub, mémoriser sa source, retirer
la marketplace, puis exécuter `codex plugin marketplace add <CAB_ROOT>`. Si
l'ajout local échoue, restaurer immédiatement la source Git mémorisée et arrêter
sans toucher aux services. Si l'ajout réussit, exécuter
`codex plugin add CAB@cab_codex_plugins` et vérifier que le
manifeste installé correspond au paquet CAB local. Ne jamais éditer le cache du
plugin à la main. Garder la marketplace locale tant que GitHub est inférieur ;
revenir au dépôt Git seulement quand sa version atteint ou dépasse le paquet
local.

Pour les commandes du profil dans ce chemin local, prendre exclusivement
`CAB_ROOT/.codex/commands/{CAB,CABU}.md`, vérifier leurs deux frontmatters
identiques à la version du plugin local et appliquer la même préparation privée,
comparaison, sauvegarde, remplacement atomique et relecture définis aux étapes
10 à 14. Retirer `cab.md` comme entrée obsolète après validation du nouveau jeu,
en conservant une sauvegarde réversible jusqu’à la vérification finale. Le rapport
conserve les provenances locale et GitHub séparées. Le commit ou la publication
du dépôt ne découlent pas de cette installation locale.

Uniquement dans cette installation locale explicitement demandée, lorsque
le manifeste du paquet CAB local est plus récent que GitHub, applique
la branche locale ci-dessus, saute les étapes distantes 1 à 7, puis résous le
plugin local installé à l'étape 8. Pour ce cas, les étapes 9 et 10 sont
remplacées par la préparation des deux fichiers canoniques depuis
`CAB_ROOT/.codex/commands/` ; conserve les contrôles d'atomicité, de sauvegarde,
de retrait de l'ancienne entrée minuscule et de relecture des étapes 11 à 13.

1. Vérifie avec `codex plugin marketplace list` que la marketplace
   `cab_codex_plugins` est configurée depuis
   `AzenorPixs/cab-codex-plugins`, branche `main`, avec le chemin sparse
   `.agents/plugins` et `plugins`.
2. Si une marketplace locale porte déjà ce nom, mémorise sa racine, la retire,
   puis ajoute la source Git par
   `codex plugin marketplace add AzenorPixs/cab-codex-plugins --ref main --sparse .agents/plugins --sparse plugins`.
   Si cet ajout échoue, restaure immédiatement la source locale mémorisée et
   affiche `CAB_MARKETPLACE_MIGRATION_ÉCHOUÉE`. N'essaie aucune actualisation
   de plugin après cet échec.
3. Si la marketplace Git n'est pas encore configurée, l'ajoute avec la même
   commande. Un échec affiche `CAB_MARKETPLACE_INDISPONIBLE` et préserve les
   autres ressources CAB.
4. Actualise l'instantané Git par
   `codex plugin marketplace upgrade cab_codex_plugins`, puis vérifie que
   `CAB@cab_codex_plugins` est disponible.
5. Télécharge et valide le manifeste distant
   `plugins/cab-approval-bridge/.codex-plugin/plugin.json` depuis la même
   branche GitHub. Compare sa version SemVer de base, sans son cachebuster
   `+codex`, à celle renvoyée par `codex plugin list --marketplace cab_codex_plugins --available --json`.
   Vérifie aussi le manifeste `plugins/cabu/.codex-plugin/plugin.json` et
   les versions distribuées du contrôleur, du superviseur, du Web, du broker
   et des deux commandes sur cette même révision GitHub. Le jeu doit partager
   la même version de base. Un accès manquant ou une divergence arrête la
   préparation avant l'updater. Ne déduis aucune version GitHub d'un fichier
   local, du cache installé ou du reçu de déploiement.
6. Comparer séparément la version de base et l'identifiant complet du paquet.
   À identifiant complet égal, vérifier les empreintes et conserver le cache
   conforme. À base égale mais suffixe `+codex` différent, la révision GitHub
   vérifiée est une nouvelle révision documentaire : l'installer par le
   gestionnaire Codex, sans modifier manuellement son cache. Une base distante
   antérieure ne remplace jamais une base locale plus récente.

7. Si le plugin CAB est absent, de base antérieure, ou d’identifiant complet différent sur la même base, exécute une seule fois
   `codex plugin add CAB@cab_codex_plugins`, puis relit les
   métadonnées installées. Affiche `CAB_PLUGIN_MIS_À_JOUR` uniquement si la
   version installée est celle du manifeste distant ; sinon, affiche
   `CAB_PLUGIN_MISE_À_JOUR_ÉCHOUÉE` avec la cause observée.
   Applique les mêmes contrôles au plugin CABU avec son identifiant publié
   dans la marketplace distante. Si un plugin installé est plus récent que
   GitHub, conserve-le et signale l'écart sans déployer ses briques locales
   dans cette invocation distante. À version égale, vérifie les empreintes
   du jeu installé contre le paquet GitHub actualisé ; une divergence arrête
   la préparation sans remplacement implicite du cache.
   Applique également ces contrôles au plugin `CABU@cab_codex_plugins`, depuis
   `plugins/cabu/.codex-plugin/plugin.json` : installe-le s'il manque ou si sa
   version est antérieure. Vérifie CAB et CABU sur la même base de version
   avant maintenance. Une ancienne entrée `cab-approval-bridge` se migre vers
   `CAB` ; sauvegarde son paquet privé, installe et vérifie CAB puis retire
   l'ancienne entrée par le gestionnaire Codex, sans éditer le cache.
8. Résout le jeu complet dans le plugin installé, notamment
   `scripts/cgpt-approval-bridge-update.mjs`,
   `scripts/cgpt-approval-bridge-supervisor.mjs`,
   `systemd/cgpt-approval-bridge-supervisor.service`, les trois unités, le
   contrôleur, le Web, `broker/` et ses trois modules Python. Vérifie que le
   manifeste référence `./skills/`, que `skills/approval-bridge/SKILL.md`
   référence sa procédure `component-update.md`, et que celle-ci
   décrit le même updater. Vérifie la version de l'outil et du manifeste.
   Résout le workspace canonique, le home du compte systemd utilisateur et les
   URLs loopback depuis les métadonnées disponibles sans lire de secret. Pour
   le dépôt CAB, la destination canonique du broker est `<CAB_ROOT>/src`, le
   répertoire du point d'entrée déclaré dans BUILD.md ; elle reste résoluble
   même sans processus OpenCode. Une installation externe utilise sa
   destination broker déjà déclarée. Détermine le layout à partir des liens
   des artefacts ; passe `--layout managed-release` lorsque les entrées pointent
   vers des releases gérées. L'absence d'OpenCode n'empêche pas l'update : les
   fichiers broker sont toujours remplacés dans cette destination.
   Pour le dépôt CAB uniquement, passe `--broker-policy cab-source` avec
   `<CAB_ROOT>/src` : l'outil vérifie le projet cab et le manifeste local identique
   au paquet installé. Le home système n'est pas CODEX_HOME. Refuse toute autre
   destination dans le workspace ou dans le cache du plugin ; ne modifie pas le lancement MCP ni
   ses variables.
   Lance l'outil depuis le paquet installé, avec les chemins absolus protégés
   comme arguments distincts, le workspace et toutes les URLs effectives :

   ```text
   node <plugin>/scripts/cgpt-approval-bridge-update.mjs --plugin-root <plugin> --workspace <workspace> --broker-directory <installation-broker> --home <home-utilisateur> --controller-url <url> --supervisor-url <url> --monitor-url <url> --opencode-url <url> [--layout managed-release]
   ```

   L'outil valide et sauvegarde les fichiers CAB dans son journal privé, puis
   arrête seulement les unités du plan vérifié, remplace les artefacts
   atomiquement, exécute `systemctl --user daemon-reload` et démarre les trois unités. La préparation de transfert suit transport-continuity.md, sans gel métier ni attente des commandes longues. Il ne tue pas
   OpenCode. L'API native recharge le broker seulement si le plan l'exige ; seule son
   absence prouvée permet une version chargée `INDISPONIBLE`. En cas d'échec de démarrage,
   l'outil restaure les fichiers sauvegardés et redémarre les trois unités ; le
   rapport décrit le repli. Interprète le JSON final et le code de sortie :
   - `completed`, code 0 : `CAB_BRIQUES_MISES_À_JOUR` ;
   - `up-to-date`, code 0 : `CAB_BRIQUES_DÉJÀ_À_JOUR`, sans arrêt ni redémarrage ;
   - erreur : `CAB_BRIQUES_MISE_À_JOUR_ÉCHOUÉE`, avec état du repli ;
     `update-recovery-required` exige de conserver les preuves et le gel.
   Une récupération utilise le même outil et les mêmes cibles ; `--rollback`
   permet le retour explicite aux artefacts sauvegardés ou l'annulation sûre
   d'une attente, sans restaurer un ancien runtime. Un verrou vivant ou un
   journal invalide n'est jamais supprimé pour forcer une nouvelle transaction.
   Si l'updater retourne `ROLLBACK_FAILED` avec `failureCode=update-controller-start-unconfirmed`,
   reprendre le même reçu avec `--resume-forward <transactionId>` seulement après
   publication d'une source au moins aussi récente et vérification de l'identité
   OpenCode, de la transition MCP et des empreintes. Cette reprise conserve
   l'ancien reçu, crée un reçu lié et ne recharge pas les locations ; un état
   MCP incertain exige sa procédure exacte d'autorisation distincte.
   L'outil ne touche ni controller.env ni monitor.env. Les anciens états
   CAB_SUPERVISEUR_INSTALLÉ et CAB_SUPERVISEUR_MIS_À_JOUR sont remplacés par
   le bilan des quatre briques ; le bilan indique le statut des trois unités
   après la mise à jour.
9. Utilise exclusivement la référence GitHub suivante pour préparer les deux
   fichiers canoniques de commande :
   `https://github.com/AzenorPixs/cab-codex-plugins`, branche `main`, chemins
   `.codex/commands/CAB.md` et `.codex/commands/CABU.md`. Construis leurs URL
   brutes HTTPS sans accepter de redirection vers un autre hôte. La procédure
   complète réside uniquement dans CAB.md.
10. Prépare les deux téléchargements dans un répertoire temporaire privé du
    profil Codex avec `curl --fail --silent --show-error`, sans écrire les cibles.
    Exige deux frontmatters avec une version SemVer valide identique et vérifie
    que CABU charge le fichier frère CAB.md, refuse les arguments et fixe son
    argument à `update`. Un fichier absent, une source ou une version divergente
    arrête toute publication des commandes.
11. Examine les deux cibles canoniques sous
    `${CODEX_HOME:-$HOME/.codex}/commands/`. Une copie sans version est
    antérieure à une source distante valide ; une version invalide est une
    erreur explicite. Préserve une copie canonique locale plus récente. À
    version égale, compare le contenu de chaque commande présente au
    téléchargement : une commande divergente est préservée et signalée sans
    publication partielle. Examine aussi `cab.md` uniquement comme une ancienne
    entrée à retirer ; ne l’utilise jamais comme commande canonique ou référence
    de version et sauvegarde-la pour pouvoir la restaurer en cas d’échec.
12. Si les deux commandes canoniques sont conformes à version égale et
    `cab.md` est absent, affiche `CAB_COMMANDE_DÉJÀ_À_JOUR`, sans écriture. Si
    seules des commandes canoniques manquent à version égale et que les copies
    présentes concordent, installe seulement les fichiers absents après
    validation complète du jeu. Si la source est plus ancienne que l'une des
    copies canoniques locales, conserve le jeu local et rapporte sa provenance,
    sans installation partielle.
13. Pour un jeu strictement plus récent ou les fichiers canoniques absents admis
    à l'étape 12, sauvegarde les seules copies à remplacer et mémorise celles
    qui étaient absentes. Revérifie leurs empreintes avant publication pour
    détecter une modification concurrente ; en cas de divergence, arrête.
    Remplace atomiquement CAB.md et CABU.md par leurs copies validées, puis
    retire `cab.md`. Relis les deux versions, contenus et références locales et
    vérifie l'absence de `cab.md` avant d'afficher `CAB_COMMANDE_MISE_À_JOUR`.
    Si une étape échoue, restaure les seules copies sauvegardées, y compris
    l'ancienne entrée `cab.md`, et retire les seuls nouveaux fichiers de cette
    tentative. Un échec de restauration conserve les sauvegardes et reste
    explicitement bloqué. Affiche `CAB_COMMANDE_MISE_À_JOUR_ÉCHOUÉE` avec la
    cause observée ; n'annonce jamais un succès global après un échec de
    préparation ou publication.
14. Affiche toujours `CAB_RÉSUMÉ_VERSIONS`, y compris après échec ou attente,
    avec des colonnes distinctes GitHub, plugin installé, fichiers déployés,
    processus réellement actif et résultat de transaction. Inclure plugin,
    contrôleur, superviseur, broker, Web, CAB.md, CABU.md et le statut de retrait
    de l'ancienne entrée `cab.md` :
    - GitHub : manifeste, scripts controller/supervisor/monitor, broker
      distribué dans plugins/cab-approval-bridge/broker/ et frontmatters des deux fichiers
      .codex/commands/{CAB,CABU}.md ;
    - fichiers : versions du cache installé et des artefacts effectivement
      déployés, dont la version du superviseur déployé extraite du script ;
   - processus : GET /status du contrôleur et du superviseur, readiness
     broker si l'API OpenCode répond, et GET /api/snapshot du Web, avec
     workspace et fraîcheur. Si OpenCode est absent, marquer seulement la
     version broker runtime `INDISPONIBLE` ; la version de ses fichiers reste
     rapportée et cette absence ne transforme pas l'update des autres briques
     en échec.
    Toute source inaccessible reste INDISPONIBLE. La version d'un processus
    n'est jamais déduite de son fichier ou du plugin. L'absence de readiness broker interdit le succès si OpenCode est actif.
    Seule son absence prouvée permet cette exception ; les trois unités
    systemd doivent toujours être vérifiées sur la version cible.

N'édite jamais le manifeste du plugin, la configuration Codex, les secrets ou
les fichiers du projet piloté. Les écritures admises sont les artefacts CAB
nommés, leurs unités utilisateur, la commande de profil et le journal privé
avec ses sauvegardes, selon references/component-update.md. La migration
réversible de marketplace reste la seule exception de configuration. Aucun
nettoyage ou migration des états métier n'est effectué par update.

La récupération MCP globale suit [l’accord permanent borné](mcp-pending-recovery.md) :
contrôles frais, reçu exact et intention unique, sans nouvelle question si toutes
les conditions sont satisfaites. Ne pas étendre cet accord à un autre profil.
