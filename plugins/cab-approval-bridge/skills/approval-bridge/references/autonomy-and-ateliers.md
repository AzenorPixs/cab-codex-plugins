# Autonomie du change — cible CAB 2.4.0

Le développeur valide le change et ses ressources. Dans ce périmètre,
l’orchestrateur décide, orchestre, contrôle et valide ; le codeur produit le
travail. Une reprise technique déjà couverte ne nécessite pas un nouvel accord
du développeur. Hors change et nouvelle allocation non couverte lui reviennent.

| Action du codeur | Autorité requise |
|---|---|
| Lecture/exploration/outils et exécution sans effet extérieur au change | Autonome dans le mandat |
| Création, copie, modification dans son atelier | Autonome dans le mandat |
| Toute écriture projet hors atelier, y compris renommage, suppression ou droits | Validation préalable de l’orchestrateur sur contenu/lot exact |
| Tout accès web, y compris via script, shell, navigateur ou outil | Validation préalable de l’orchestrateur |
| Résultat de test réussi, échoué ou indisponible | Soumission et validation de l’orchestrateur avant acceptation comme preuve |
| Action hors change ou ressources supplémentaires non allouées | Accord du développeur |

L’atelier se trouve à la racine du projet : `.cab-tests/<change>/<RUN>/`.
Chaque brique vérifie/crée la racine propre au projet ; ses parents et chemins
physiques sont vérifiés. Les liens symboliques ne permettent pas de contourner
les frontières. Les ateliers des pairs restent hors mandat. Le codeur peut
copier les fichiers du change et réaliser autant d’essais que nécessaire dans
son espace ; les résultats intermédiaires ne bloquent pas le diagnostic autonome.
Il prépare un diff/lot exact pour validation avant application au projet.

Dans le profil isolé disponible, le codeur utilise `atelier_execute` via Code
Mode après discovery exacte, avec un payload littéral : request_id stable,
run_id, reservation_version, session_id, change_id, directory et argv ;
timeout_ms est facultatif. Aucun request_validation ni décision supplémentaire
n’est requis pour cet essai : l’autorité est le mandat du RUN et l’exception
d’atelier déjà accordée. Le contrôleur corrèle l’appel natif ; le broker lance
la commande sous son UID avec projet/runtimes RO, atelier propre RW et réseau
isolé. Bubblewrap est une capacité locale vérifiée, sans installation implicite.
S’il manque, diagnostiquer la capacité et utiliser les voies existantes déjà
autorisées ; ne jamais remplacer ce lanceur par un shell hôte libre.

### Méthodes masquées par la politique de session

Si un atelier est nécessaire ou si sa discovery est vide, vérifier la location
MCP partagée puis les règles effectives du SID pour
`cgpt-validation_atelier_execute` et `cgpt-validation_atelier_status` : une
règle universelle `deny` peut masquer ces méthodes malgré un broker connecté.
Avec le mandat d’atelier existant, le propriétaire peut, session inactive et
sans permission pendante, ajouter seulement les deux règles ALLOW nécessaires
au SID ciblé. Il conserve et relit toutes les autres règles, notamment shell,
edit/write, web et les sessions paires ; aucune configuration globale n’est
modifiée. Relire la policy et effectuer la discovery exacte avant tout essai.
Une discovery réussie ne prouve pas l’exécution ni la validation d’un test.

Une réponse perdue se consulte avec `atelier_status` sur le même request_id,
RUN/change/directory et la génération/SID courants. Une identité existante
INTENT/RUNNING/terminale n’est pas relancée. COMPLETED et exit0 décrivent le
processus, pas une validation du résultat de test. Les écritures projet hors
atelier et les accès web suivent les décisions CAB ordinaires. Les ressources
de test déjà allouées conservent leurs voies autorisées ; aucune allocation
nouvelle n’est déduite de cette capacité.

La liberté d’exécuter un outil ne dispense pas de qualifier ses effets : un
shell qui écrit dans le projet ou accède au web suit les lignes correspondantes.
Les politiques natives doivent être réglées à la portée minimale vérifiable ;
ne pas désactiver les contrôles des pairs pour autoriser un atelier. Les gardes
d’identité, d’accès partagé et d’effet incertain restent actives. Une autorisation
d’essai ne vaut ni validation du résultat ni accord de publication.

## Lectures natives refusées par une politique héritée

`read/glob/grep DENY` décrit une permission, pas l’absence d’outil. Le pilote
peut amender la politique du seul SID dans son mandat, sans nouvel accord du
développeur. Pour OpenCode2.2.5, `read` compare une ressource relative au
workspace, même si l’input est absolu. Un ALLOW absolu peut donc rester inopérant.
Utiliser des fichiers exacts/sous-arbres relatifs du change et les cadrages
nécessaires, puis les DENY relatifs d’exclusions ; jamais un ALLOW `*` ou `**`
global pour résoudre cette différence. Les règles non lecture et les DENY
précis restent conservés. Qualifier glob/grep sur leur ressource réelle avant
de prétendre leur portée maîtrisée ; les recherches de l’atelier isolé restent
disponibles indépendamment.

Le SDK fournit `configureNativeReads(SID,{paths:[...],tools:['read']})` à une
frontière idle sans permission pendante. Le PATCH V2 utilise
`permissions:[{action,resource,effect}]` ; les objets normalisés du SDK
`{permission,pattern,action}` ne sont pas le format d’écriture natif. Relire
la policy, conserver la preuve avant/après dans le checkpoint autorisé et faire
qualifier une lecture native utile. La présence des règles ne suffit pas à
prouver leur effet. La fusion agent puis session et le dernier match sont
définis dans [le moteur2.2.5](https://github.com/anomalyco/opencode/blob/v2.2.5/packages/core/src/permission.ts).

Le checkpoint propre à l’orchestrateur se lit/amende par son mécanisme local
déjà mandaté. `source-read` n’est pas un prérequis à cette maintenance de suivi.
Préserver les champs, les droits et l’atomicité, sans exposer de token. Ne pas
écraser silencieusement un fichier illisible ou un JSON invalide. Un200 natif
sans Content-Type reste un diagnostic distinct ; ne pas assouplir le garde pour
le masquer ni étendre cette exception aux livrables métier du codeur.

## Forme littérale de l’appel d’atelier

Rendre localement l’objet d’arguments par `JSON.stringify`, puis insérer ce
résultat comme objet littéral dans `return await tools["cgpt-validation"].atelier_execute(...)`.
Les clés nues sont reconnues, mais les valeurs chaîne doivent être des chaînes
JSON à guillemets doubles ou des backticks statiques qualifiés. Une chaîne
JavaScript à apostrophes simples dans argv n’est pas reconnue par ce parseur.
Ne pas calculer le payload, ses empreintes ou une commande dans Code Mode.

Après `atelier-native-call-unobserved`, vérifier `atelier_status` avec les mêmes
identités. Si `found:false` est prouvé et aucun autre lancement n’existe, une
correction de rendu conservant exactement les valeurs, argv et request_id peut
être qualifiée sans créer un nouvel essai. Une réponse perdue ou un état
INTENT/RUNNING/terminal impose de consulter le reçu, sans relancer le processus.

Le codeur peut obtenir le contrat complet applicable par `cab_contract` dans
le broker, puis une référence exacte (`CCAB-SKILL.md`, `SGS-runtime.md`, etc.).
Le noyau/index et le digest de version sont stables ; demander les références
utiles à l’action. Cela ne nécessite pas l’accès au profil privé Codex d’un
autre UID et ne confond pas la permission native `skill` avec la connaissance
du protocole. Tracer la version et les obligations reçues avant travail et
après update, sans rejouer un ancien mandat ou une once.

À l’archivage ou à l’arrêt explicite pour dépendance insatisfaite, conserver
les rapports/statistiques durables, terminer le nettoyage OC, puis nettoyer
les briques et le seul sous-espace du RUN. La racine `.cab-tests/` reste présente.
Une pause ou un blocage technique temporaire n’autorise pas ce nettoyage.

Après démarrage, reprise ou mise à jour, transmettre le noyau et les références
applicables, puis tracer leur connaissance par rôle/version avant travail.
Le préfixe stable renvoie aux détails ; le codeur doit pouvoir consulter
l’intégralité du contrat sans recevoir chaque fois tout son historique.

CCAB est la file des incidents CAB, connue des deux rôles ; consulter le skill
CCAB distribué pour déclaration ou traitement. SGS collecte les sources natives ;
le LLM complète uniquement les faits non disponibles dans celles-ci.

## Demande refusée avant admission, sans préparation locale

Un reçu `NOT_ADMITTED/resource-revision-stale` est terminal. Si le registre
complet ne contient ni requestId ni operationId, avec zéro décision, accès,
permission et once, il n’existe aucune préparation à retirer. Un refus
`recovery-target-divergent` ne crée pas cet objet. Conserver le reçu, vérifier
la readiness fraîche et reprendre avec une unité neuve, revue et IDs neufs.
Ne pas annuler/restaurer l’ancien terminal ni retirer les autres cibles du plan.

`PENDING` désigne le broker, pas une admission contrôleur. Identifier l’unité
par `lookup_validation` sur ses cinq identités puis lire le même approval_id.
Ne pas déduire son état d’un compteur global ancien. Préparer SHA/digest hors
wrapper, puis soumettre un retour MCP littéral exact. Une révision effective
de dossier déjà agrégée ne s’applique pas une deuxième fois à un nouvel enfant :
demander les révisions des clés exactes, ou calculer revision(key) sur la map brute.

Ressources déclarées dans DEVOPS.md : appliquer la référence
[devops-resources](devops-resources.md) du skill CAB installé
(`devops-resources.md` depuis les références). Outils locaux RO et catalogue
actualisé ; accès externes par voies CAB, sans secrets ni socket de contrôle.

## Priorité des tests : codeur justifie, orchestrateur tranche

Le codeur utilise l’atelier en priorité pour tout test. Pour recourir à LXC ou
Docker, il présente à l’orchestrateur le critère précis non réalisable dans
l’atelier et la preuve de la capacité manquante. Une préférence, une habitude
ou un échec à diagnostiquer ne suffisent pas. L’orchestrateur examine cette
justification, tranche et trace sa décision dans le mandat/checkpoint existant.
Le codeur ne décide pas seul de la bascule. Les ressources déjà allouées sont
utilisées ; une allocation supplémentaire reste du ressort du développeur.
Les écritures projet hors atelier, accès web et résultats gardent leurs
validations. Aucun réglage global OpenCode n’est modifié implicitement.


## Examen coordonné des bancs de test

Avant de conclure à une impossibilité d’environnement ou de présenter un
blocage de cette nature, le codeur transmet le critère empêché, la preuve de
l’échec ou de la capacité manquante de l’atelier et les bancs pertinents connus.
L’orchestrateur examine les bancs pertinents déclarés dans DEVOPS.md et les
sources applicables, leurs autorisations et leur disponibilité observée. Une
déclaration seule ne prouve ni disponibilité effective ni allocation nouvelle.
Il examine les solutions utiles déjà autorisées, motive les voies écartées et
demande la poursuite lorsqu’une voie pertinente reste possible. Une investigation
incomplète reste non vérifiable et ne démontre pas une impossibilité générale.

Rattacher chaque restriction à sa source et à son périmètre : une interdiction
d’installation limitée au Desktop ne s’étend pas au LXC sans source applicable.
Vérifier séparément les autorisations effectives de préparation, installation,
exécution et nettoyage de chaque banc. La priorité de l’atelier et la justification
LXC/Docker ci-dessus, les réservations, les permissions natives, les décisions
unitaires et les limites d’allocation restent applicables. Une ressource nouvelle
non couverte exige l’accord du développeur.

Chaque résultat identifie le banc, le critère, la preuve et ses limites. Une
preuve d’intégration LXC peut être utile sans qualifier le profil Desktop ; une
limite de qualification n’interdit pas un test utile et autorisé. Ne pas cocher
un critère global incomplet ni transformer un test simulé en intégration réelle.
Le codeur soumet les résultats ; l’orchestrateur les examine et décide de leur
portée avant de les retenir. Le contrat métier du prompt applicable reste la
source des conditions de poursuite, de pause et d’arrêt.
