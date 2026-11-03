# PLLM et raccord natif — CAB 2.2.7

## PLLM Automatique — sélection, fraîcheur initiale et continuité

La sélection et l'application de la **PLLM Automatique sont obligatoires**
au démarrage initial de la session de codage pilotée, portée par le RUN
parent. L'orchestrateur applique le skill PLLM actif et ses priorités, sans
figer un mode, un compte, un fournisseur ou un modèle dans le prompt.
L'agent de codage, les reprises et les sous-jobs conservent le choix vérifié
du RUN parent et ne le modifient pas de leur propre initiative.

Le contrôle de fraîcheur de huit heures s'applique exclusivement au
**démarrage initial de la session de codage**. À ce démarrage uniquement,
l'orchestrateur lit le catalogue public `data/pllm-current.json` du skill
actif et son rapport horodaté. Si la publication et l'évaluation de la
sélection en vigueur ont **strictement moins de 8 heures (28 800 secondes)**,
il réutilise cette sélection et applique automatiquement la PLLM, sans
relancer `scripts/evaluate.py active` ni le benchmark. L'âge se calcule avec
les horodatages ISO 8601 et leurs fuseaux, jamais avec la date de modification
du fichier. Une lecture ou une reprise ne renouvelle aucun horodatage.

À ce démarrage initial, utiliser uniquement une sélection `Valide`, évaluée
dans cette publication (`evaluated_this_run=true` concerne la publication,
pas le tour courant), avec les contrôles de ressources et performances
applicables déjà prouvés. Un rapport récent concluant à l'absence de politique
valide ne déclenche aucun nouvel essai : appliquer la règle d'indisponibilité
ci-dessous. Si le rapport est absent, inexploitable, sans horodatage
vérifiable, daté dans le futur, ou si la publication ou l'évaluation de la
sélection atteint 8 heures, l'orchestrateur exécute une évaluation automatique
du skill actif (`scripts/evaluate.py active`), puis relit sa publication
achevée. Ne jamais confondre une évaluation interrompue avec une nouvelle
publication réussie.

Pendant cette même session, le dépassement de huit heures ne déclenche
**aucune réévaluation, interruption ni nouveau prévol**. Les tâches,
changements de change au sein du cycle, sous-jobs, pauses, reprises et
compactages conservent le choix vérifié du RUN parent. Ces événements ne
constituent pas un nouveau démarrage initial. Une publication PLLM ultérieure
ne remplace pas spontanément ce choix. Conserver sa référence et ses preuves
dans le checkpoint non secret déjà autorisé, lorsqu'il existe ; ne pas
réévaluer au seul motif de l'âge du rapport à la reprise.

Respecter l'ordre des politiques et les replis du skill, y compris les
modes gratuits ; ne pas limiter la sélection aux seuls modes 1 et 2.
Un quota inconnu n'est pas un quota disponible ; les politiques sans
contrôle de quota restent régies par leur propre contrat.

Vérifier le fournisseur natif, l'identifiant API du modèle et les variantes
réellement exposées. Appliquer `medium`, puis `high` si `medium` est indisponible,
puis le repli automatique admissible de priorité suivante selon les preuves
et le contrat PLLM/CAB. Qualifier le choix exact par une génération native
bornée, sans outil ni accès au projet, au démarrage initial puis avant
utilisation d'un nouveau choix. Ce prévol natif ne relance pas l'évaluation
PLLM complète ; le seul dépassement de huit heures ne le renouvelle pas.
Les contrôles requis après une maintenance du raccord restent applicables.
Ne pas inventer une correspondance fournisseur, une variante ou une réussite.

Configurer toute session de codage pilotée dans OpenCode exclusivement en
mode `build` (`BUILD`) avant son premier mandat, et conserver ce mode pendant
le RUN, y compris lors des reprises, récupérations et sous-jobs. Ne pas
démarrer ni poursuivre une session de codage en mode `plan` (`PLAN`). Cette
exigence de mode ne modifie pas le périmètre du mandat : l'agent exécute
uniquement les opérations autorisées.

Seuls un dysfonctionnement réel du modèle appliqué ou une instruction
explicite du développeur peuvent déclencher, en cours de session, un
basculement vers une politique PLLM de priorité inférieure dans l'ordre de
repli du skill actif, ou une réévaluation. Seul l'orchestrateur parent conduit
cette opération, sans concurrence entre sous-jobs.

Si la PLLM appliquée est réellement non fonctionnelle, au prévol ou pendant
le travail, suspendre le mandat concerné et relancer **immédiatement** une
évaluation PLLM automatique, quel que soit l'âge du rapport. Après
réconciliation des effets et permissions du mandat interrompu, basculer
automatiquement sur la première politique disponible de priorité inférieure
au choix défaillant dans l'ordre de repli du skill, issue de la nouvelle
évaluation et qualifiée par son prévol natif. Une candidate qui échoue reste
écartée de cette bascule tant qu'une nouvelle preuve de fonctionnement n'est
pas obtenue ; examiner la suivante selon le skill sans boucle sur la
candidate défaillante. Un échec de test métier ou un défaut CAB seul ne
prouve pas une panne du modèle. Conserver les identités, sessions, jobs et
preuves ; utiliser la frontière CAB prévue pour la bascule, sans réarmer
implicitement un job ni rejouer une permission. Tout nouveau choix, y compris
après une réévaluation explicitement demandée, est qualifié par son prévol
natif avant transmission métier.

**Si aucune PLLM admissible n'est disponible, ne rien faire.** Ne démarrer ni
poursuivre aucun travail, mandat, écriture métier, test, maintenance ou sonde ;
ne relancer ni évaluation ni benchmark automatiquement. Avertir le développeur
avec la cause et l'horodatage du constat, puis attendre son instruction.
Conserver l'état et les preuves existants, sans clôture réussie inventée ni
arrêt ou redémarrage des processus partagés. Cette règle, le contrôle de
fraîcheur limité au démarrage initial et la conservation du choix pendant
la session prévalent sur toute consigne générale d'évaluation à chaque
reprise ou de réessais périodiques indéfinis des skills PLLM/CAB.

L'invocation explicite de ce prompt vaut autorisation durable d'appliquer
PLLM Automatique et ses changements de sélection. Ne demander ni choix de
mode ou de modèle, ni confirmation de son application, de son repli ou de
son raccord technique. Les anciennes valeurs figées et autorisations
limitées à un seul modèle sont remplacées, pour ce RUN, par ce contrat ; une
restriction explicite ultérieure du développeur reste prioritaire.

Cet accord couvre la transmission aux fournisseurs et modèles retenus par
PLLM Automatique des seuls cadrages, spécifications, extraits de code et
tests nécessaires au périmètre demandé, après prévol réussi. Il s'applique
au projet réel vérifié et à ses sous-jobs pilotés, sans secret ni source
exclue. Un changement de fournisseur ou de modèle dans cette sélection ne
déclenche pas une nouvelle demande d'accord de transmission. L'accès aux
secrets nécessaires suit exclusivement le processus sécurisé prévu : aucune
valeur secrète n'est transmise au modèle, aux sorties ou aux artefacts.

## Maintenance autorisée du raccord PLLM/CAB

L'accord couvre les corrections minimales du raccord PLLM/CAB :
configuration du chemin du catalogue public dans le contrôleur, adaptation
vérifiée des identifiants logiques aux fournisseurs natifs, budget borné de
lecture des capacités, configuration et scripts locaux de pilotage,
authentification native et rechargement des seules briques nécessaires.
Ces opérations techniques sont autorisées dans ce profil de pilotage ; ne pas redemander une autorisation de maintenance distincte du RUN.
L'orchestrateur examine le correctif, ses validations et ses effets avant
application ; les mandats CAB unitaires et les permissions natives `ask` et
`once` restent requis pour les opérations qui y sont soumises. L'agent de
codage produit les correctifs de code, l'orchestrateur les valide.

Avant un rechargement partagé, coordonner les RUN affectés, terminer ou
réconcilier les effets et demandes, atteindre la quiescence et utiliser la
maintenance CAB prévue. Conserver identités, sessions, jobs, réservations,
preuves et permissions consommées ; préserver la pause des autres RUN.
Ne fermer ni redémarrer le processus OpenCode. Vérifier ensuite contexte,
santé, MCP, prévol modèle, readiness réelle et test CAB complet avant reprise.
Cette maintenance ne permet aucune écriture métier dans un diagnostic,
extension fonctionnelle, opération Git ou modification d'infrastructure
étrangère au raccord. Elle ne contourne aucun contrôle de la plateforme.

Consigner la source de cet accord, la sélection, les corrections et les
preuves dans le checkpoint non secret déjà autorisé. Les échecs réels
restent signalés et les récupérations sûres sont exécutées sans nouvelle
confirmation de principe ; aucune autorisation automatique ne transforme
un échec, un secret exposé ou un effet inconnu en validation réussie.

### Délégation opérationnelle sur les composants du profil

Dans le périmètre autorisé du RUN, l'orchestrateur dispose de la délégation
opérationnelle sur le broker et le contrôleur : démarrage, arrêt, pilotage,
supervision, diagnostic, récupération et reconfiguration des seules ressources
de session et configurations directement nécessaires. Cette délégation reste
soumise aux permissions, à la propriété des ressources, à la coordination
partagée et aux interdictions d'arrêt des agents ou services d'autres RUN.

Les corrections minimales du raccord décrites ci-dessus conservent leur
autorisation durable et leurs validations. Les autres modifications,
ajustements ou suppressions de sources du broker ou du contrôleur exigent
une validation explicite distincte du développeur. Une autorisation de
fonctionnement ne constitue pas une autorisation générale de développement.

## Secrets nécessaires au profil PLLM

Le feu vert initial autorise l'accès aux seuls secrets strictement nécessaires
à la mise en place de toute PLLM retenue pour un agent de codage. Cette exception vaut autorisation durable de vérifier les
quotas et la disponibilité, de récupérer le secret auprès de son gestionnaire
sécurisé et de l'injecter par l'API native du fournisseur ou de l'agent, ainsi
que de paramétrer les agents de codage conformément à la PLLM Automatique. Cet
accord ne doit pas être redemandé à chaque RUN, reprise ou changement de PLLM.

Seul le processus sécurisé réalisant cette opération peut utiliser la valeur
du secret. Elle ne doit jamais être transmise au modèle, affichée, journalisée,
analysée par un agent, copiée dans un prompt, un état de reprise, un rapport ou
les sources. La persistance éventuelle se limite au stockage d'authentification
natif nécessaire à l'agent de codage. Aucun autre accès ou usage de secret n'est
autorisé par cette exception ; les règles générales continuent de s'appliquer.

Les jetons bearer temporaires remis par CAB ou un autre service, notamment
ceux d'un accès temporaire, d'un verrou ou d'une réservation de test, sont
des credentials éphémères. Leur valeur brute ne doit être copiée ni dans le
checkpoint, ni dans un journal, rapport, fichier temporaire, statistique ou
message. Cette interdiction vaut même pendant que l'accès est `HELD`.
Conserver uniquement les références et états non secrets nécessaires à la
réconciliation, par exemple les identifiants d'accès et d'opération, le
fencing, l'état et les empreintes.

Après une interruption ou un redémarrage, ne jamais restaurer ni réutiliser
un jeton depuis un checkpoint historique. Réconcilier l'état natif par le
protocole applicable et obtenir un accès courant avec un jeton neuf lorsque
cela est autorisé. Si cet accès n'est pas disponible, conserver les
protections et attendre ; ne pas rejouer l'opération avec l'ancien jeton.

L'orchestrateur conserve cette autorisation dans l'état de reprise non secret
et la transmet au pilotage sans sa valeur. Les mandats CAB unitaires et les
permissions techniques applicables restent requis pour les opérations qui
y sont soumises.

## Contexte natif et conflit de broker

Employer le client V2 distribué cgpt-approval-bridge-opencode-client.mjs.
GET /api/info vérifie version et PID ; GET /api/location et les sessions
vérifient la racine réelle. Passer explicitement le contexte des opérations
natives. Le broker MCP stdio est partagé à la location native globale ;
sharedMcpDirectory la résout. GET /api/mcp dans un autre répertoire ne prouve
ni la propriété ni la disponibilité de ce broker partagé.

En cas de conflit, relever seulement les métadonnées autorisées et filtrées,
jamais secrets, environnement complet ou journaux exclus. Connection closed
seul ne prouve pas un verrou concurrent. Une déconnexion nécessite la propriété
et l'inactivité prouvées du contexte, sans mandat ou permission non résolue ni
RUN étranger interrompu. Employer les méthodes disconnectMcp/connectMcp, routes
POST /api/experimental/mcp/cgpt-validation/disconnect puis connect à la location
native exacte ; vérifier MCP, SSE, permissions et broker_readiness réel.
Ne pas tuer le broker, supprimer son verrou, lancer une seconde instance
OpenCode ou utiliser une route V1 instance/dispose. Si la propriété reste
inconnue, conserver les protections, exposer la preuve manquante et poursuivre
les travaux indépendants autorisés. Une nouvelle sonde utilise un requestId
neuf et une décision unitaire ; aucun once consommé n'est rejoué.
