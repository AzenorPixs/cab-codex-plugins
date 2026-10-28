---
description: Piloter hors sandbox la communication de validation OpenCode–Codex
version: 2.1.5
---

Réponds en français. Cette commande est globale : elle ne modifie jamais le projet OpenCode suivi, ses fichiers, ses spécifications ou sa configuration.

Le développeur accorde une autorisation permanente pour le cycle de vie et les vérifications propres à `/CAB`. Ne sollicite donc pas de validation applicative supplémentaire pour lancer, initialiser, superviser, tester ou clôturer le pilotage. Respecte néanmoins toute autorisation technique que l’environnement impose lui-même pour une exécution hors sandbox.

Commande canonique : `/CAB`, portée par `CAB.md`. L'alias historique `/cab`
transmet ses arguments inchangés ; `/CABU` sans argument équivaut exactement à
`/CAB update`. Les alias chargent ce fichier frère de même version, puis
exécutent la procédure dans le même tour. Aucune logique de maintenance n'est dupliquée.

Argument reçu : `$ARGUMENTS`

Le profil source 1.10.10 `frozen-recovery-controller` n'est pas déclenché par
une mise à jour ordinaire. Il exige un accord de maintenance spécifique et
un fichier de preuves privé, selon `references/component-update.md` du skill.
Il peut conserver broker, superviseur et Web 1.7.1 pendant le chargement du
contrôleur 1.10.10 ; annoncer séparément ces versions et le manifeste chargé.
Une préparation SCM ou un incrément de version n'autorise aucune activation.

Pour stats, statslast, stats 24, stats7 ou stats30, appliquer directement la section `/CAB stats` puis terminer après la consultation. Ne déclencher ni skill, ni boucle de pilotage, ni action de cycle de vie. Une cible optionnelle --run <run_id> filtre ce RUN exact ; une syntaxe ambiguë est refusée sans collecte.

Pour pause ou stop avec --run <run_id> ou --all, appliquer la section de suspension ciblée/globale ; ne pas exécuter les procédures start, prévol ou update.

Pour l'argument `status` ou `status --run <run_id>`, appliquer directement la
section `/CAB status` puis terminer la réponse après le rapport. Les sections de
pilotage, continuité du job, démarrage, prévol modèle, cadence et compactage ne
s'appliquent pas à cette consultation. Ne déclencher ni skill de pilotage ni
skill de statistiques ; ne transmettre aucun message à un autre chat ou agent.
Les arguments status invalides affichent seulement la syntaxe, sans collecte.

Pour `start`, `run` ou `resume`, commencer par le seul bootstrap du monitoring
décrit au début de `/CAB start`, dès résolution du workspace, avant toute
réservation, PLLM ou vérification OpenCode/CAB. Ce renvoi ne déclenche pas
le reste de `/CAB start` lors d'un `run` ou `resume` : aucune purge ni
réinitialisation n'en découle. Revenir ensuite à la sous-commande demandée ;
pour `resume`, appliquer la section de suspension ciblée/globale sans exécuter
les procédures start, prévol ou update.
Les consultations, `pause`, `stop`, `test` et `update` ne déclenchent pas ce bootstrap.

## RUN concurrents CAB 2.1.5

Lire [le contrat concurrent](references/concurrent-runs.md) et ORCHESTRATED_CODING.md du projet avant pilotage. Un OpenCode et un broker stdio restent partagés ; change/intention, session, job, décisions, preuves et gates sont propres au RUN. Réserver par POST /runs/reserve avant préparation et armer POST /runs/<run_id>/job/arm ; garder le checkpoint output/<prompt>/<run_id>/state.json.

Le manifeste déclare la portée ; les accès actifs sont temporaires. Les lectures compatibles coexistent, les écritures recouvrantes attendent et /locks/acquire attribue l'ensemble entier ou WAITING sans acquisition partielle. Les fichiers privés prouvés peuvent éviter l'appel de verrou partagé ; leur promotion est coordonnée si un pair les déclare.

Chaque request_validation inclut coordination_protocol=resource-scoped-v1, run_id, reservation_version, operation_id, operation_digest, resources et expected_revisions. Préparer le contenu exact, obtenir la décision, acquérir juste avant effet et conserver ask/once. Une base périmée exige une nouvelle demande. Terminer les effets natifs corrélés avant /locks/release ; aucun timeout ni idle ne libère un effet inconnu.

Valider et publier sur les ressources utiles avec /publish, sans /ready de cohorte ni réconciliation générale des pairs. Le reçu est durable ; REPORT est limité au STATISTICS.md propre au change. Rapport vérifié, gate, POST /runs/<run_id>/job/disarm puis /release restent requis. /CAB pause|stop --run <run_id> reste ciblé ; --all demande un gel exceptionnel pour réconciliation commune, maintenance, pause ou arrêt globaux.

Installer ensemble les scripts controller, job-context, model-policy, prepare-model-policy, run-steps, monitor-events, monitor-management, runs, resource-coordination, supervisor, supervisor-context, statistics, observation-statistics, statistics-maintenance, import-observations, registry-lock, SSE, healthcheck, reset, update et prompts, avec leurs noms complets cgpt-approval-bridge-*. Un jeu mixte est refusé avant permission. Le registre schéma 4 conserve ses règles de migration dans les procédures métier ; `/CAB update` ne consulte ni ne migre le registre, et ne purge ni ne reprend aucun RUN.

## Étapes du cycle et observation web

Charger la référence distribuée `references/run-lifecycle.md` du skill
approval-bridge pour le catalogue des onze étapes. Après armement, lire la
séquence courante du job puis déclarer chaque étape examinée par
`POST /runs/<run_id>/job/progress` avec stepId, stepStatus et
expectedStepSequence. Un retour de Vérifications ou Revue vers Implémentation
est autorisé et historisé. Les étapes non renseignées ne sont jamais déduites
du texte libre, du mandat ou de la phase. ETAT, étape, phase technique et
cases de tâches restent distincts ; aucune déclaration ne vaut permission ou
gate terminal. Les jobs anciens sans lifecycle restent compatibles.

## Continuité du job

Après `/CAB start`, conserver la session de codage active jusqu’aux critères de fin explicitement définis dans le contexte initial du job.

Ne jamais clore la réponse, arrêter le pilotage ou déclarer le travail terminé après un jalon intermédiaire : healthcheck, test POC, lot documentaire, diff, test unitaire ou réponse OpenCode.

Conserver le contexte initial du job comme source de vérité pendant toute la session : objectif, périmètre, spécifications OpenSpec, critères de validation, interdictions et délégations.

Un tour OpenCode achevé n’est jamais une fin de job. Tant que le job n’est ni
terminé, ni bloqué, ni explicitement arrêté, lire son dernier résultat dans la
session persistante et transmettre le mandat suivant dans cette même session.
Ne jamais envoyer de réponse finale au développeur pendant cet état RUN.

## Cadences de pilotage et attente PLLM

Traite les événements SSE OpenCode en temps réel et contrôle les demandes et
les rapports toutes les 3 secondes dans la boucle de pilotage. Pendant
l'analyse ou la rédaction de l'agent de codage, utilise des pauses fixes de
7 secondes entre deux vérifications de progression. Ces pauses ne ralentissent
ni le SSE ni le contrôle CAB toutes les 3 secondes. Les temporisations
techniques du superviseur, des heartbeats et des rappels du broker restent
distinctes.

Les conditions de disponibilité des services externes et les suites à donner
à leur indisponibilité relèvent du prompt invoqué et du contrat CAB applicable.
Leurs éventuels réessais suivent ces seules règles. Consigner les résultats et
les causes observées dans le checkpoint non secret ; toute reprise exige la
réconciliation des effets, de la santé OpenCode, de MCP, de la readiness CAB et
des permissions. Une reprise ne vaut jamais approbation et ne rejoue aucun
mandat consommé.

Prévois les sondes statistiques toutes les 30 minutes, en complément des
sondes initiale et finale. Poursuis le travail entre les échéances, sans
arrêter le travail pour attendre un créneau. Signale les relèves manquées
sans reconstruction rétroactive. Une sonde statistique échouée reste distincte d'un échec du benchmark PLLM
et ne suspend pas, à elle seule, le RUN.

## PLLM Automatique — fraîcheur initiale et conservation du choix

Pour les prompts imposant PLLM Automatique, le contrôle de fraîcheur de huit
heures s'applique exclusivement au démarrage initial de la session de codage
pilotée, portée par le RUN parent. À ce démarrage seulement, l'orchestrateur
lit le catalogue public `data/pllm-current.json` du skill actif et son rapport.
Il réutilise sans benchmark une sélection `Valide`, évaluée dans cette
publication, si la publication et l'évaluation ont strictement moins de huit
heures (28 800 secondes). Calculer les âges depuis les horodatages ISO 8601
avec leurs fuseaux, jamais depuis la date du fichier ; ne renouveler aucune
date à la lecture. Un rapport absent, inexploitable, sans horodatage vérifiable,
futur ou atteignant le seuil à ce démarrage impose une évaluation automatique
du skill actif, puis la relecture de sa publication achevée. Une évaluation
interrompue ne vaut pas publication réussie. Un rapport récent sans politique
valide impose l'attente définie ci-dessous, sans nouvel essai automatique.

Pendant cette même session, le dépassement de huit heures ne déclenche aucune
réévaluation, interruption ni nouveau prévol. Les tâches, changements de change
dans le cycle, sous-jobs, pauses, reprises et compactages conservent le choix
vérifié du RUN parent ; ils ne constituent pas un nouveau démarrage initial.
Une publication ultérieure ne remplace pas spontanément ce choix. Conserver
ses références et preuves dans le checkpoint non secret déjà autorisé,
lorsqu'il existe. L'agent de codage ne modifie pas ce choix de sa propre initiative.

Seuls un dysfonctionnement réel du modèle appliqué ou une instruction explicite
du développeur peuvent déclencher une réévaluation ou un basculement vers une
politique PLLM de priorité inférieure dans l'ordre de repli du skill actif.
Seul l'orchestrateur parent conduit cette opération, sans concurrence entre
sous-jobs. Une panne réelle suspend le mandat concerné et impose une
réévaluation immédiate, quel que soit l'âge du rapport. Après réconciliation
des effets et permissions, appliquer la première politique disponible de
priorité inférieure au choix défaillant, issue de cette évaluation et qualifiée
par prévol natif. Écarter les candidates défaillantes sans boucle de réessais.
Un échec de test métier ou un défaut CAB seul ne prouve pas une panne du modèle.

Qualifier le fournisseur, le modèle et la variante natifs par une génération
bornée sans outil ni accès au projet avant transmission métier, au démarrage
initial et avant tout nouveau choix. Les prévols requis après maintenance
du raccord restent applicables ; le seul âge du rapport ne les renouvelle pas.
Respecter les priorités du skill, y compris ses modes gratuits, sans inventer
de quota disponible ni de variante. Conserver les identités, sessions, jobs et
preuves ; utiliser la frontière CAB de bascule sans réarmement implicite ni
rejeu d'une permission consommée.

Si aucune PLLM admissible n'est disponible, ne démarrer ni poursuivre aucun
travail, mandat, écriture métier, test, maintenance ou sonde. Avertir le
développeur avec le constat daté et attendre son instruction, sans évaluation
ni benchmark relancé automatiquement. Conserver l'état et les preuves ;
ne pas déclarer de clôture réussie ni arrêter ou redémarrer les processus
partagés. Les validations CAB, permissions natives et accords du prompt
restent requis. Cette section ne déclenche aucun RUN ni évaluation par sa lecture.

## Compactage coordonné toutes les 1 h 30

L'orchestrateur pilote un cycle commun toutes les 5 400 secondes pour sa
session réelle et la session de codage. À l'échéance, n'attribue plus de mandat,
laisse le mandat courant s'achever et traite son rapport. Sauvegarde le
checkpoint non secret, puis vérifie les API natives réellement exposées pour
les deux sessions actives. Si les deux sont disponibles, déclenche leurs
compactages en parallèle sous un même identifiant de cycle ; sinon, compacte
les seules sessions accessibles et trace les opérations non exécutées.
Ne compacte pas une conversation auxiliaire à la place de l'orchestrateur
réellement actif.

Exige deux preuves natives de fin, corrélées aux bonnes sessions, pour déclarer
une réussite conjointe. Un accusé de lancement n'est pas une fin de compactage.
Une API absente ou un échec avec contexte préservé laisse le cycle incomplet
avec sa cause ; après réconciliation sûre des contextes, santé OpenCode, MCP,
readiness CAB et permissions, poursuis les mandats déjà autorisés. Ce seul
écart ne classe pas le RUN `BLOQUÉ`, n'arrête pas CAB, ne demande pas de
dérogation et ne diffère pas les statistiques. Un compactage encore en cours,
un effet inconnu ou une réconciliation impossible suspend les opérations
concernées. Ne relance pas aveuglément une opération d'effet inconnu et
n'attends pas une API absente : réexamine sa disponibilité à la prochaine
échéance, calculée depuis le déclenchement du cycle courant. Conserve dans le
checkpoint les sessions, horodatages, résultats et retards observés, sans
inventer d'identifiant non exposé. Ce cycle ne ferme ou ne redémarre aucun
processus et ne rejoue aucun mandat consommé.

## Syntaxe

Les seules sous-commandes admises sont :

- `/CAB start`
- `/CAB run`
- `/CAB stop`
- `/CAB test`
- `/CAB update` (ou `/CABU` sans argument)
- `/CAB status`
- `/CAB status --run <run_id>`
- `/CAB stats`, `/CAB statslast`, `/CAB stats 24`, `/CAB stats7`, `/CAB stats30` (option --run <run_id>)
- `/CAB pause --run <run_id>`, `/CAB resume --run <run_id>`, `/CAB stop --run <run_id>`
- `/CAB pause --all`, `/CAB resume --all`, `/CAB stop --all`

Sans argument ou avec un argument inconnu, affiche cette syntaxe et n’effectue aucune action.

## Invariant de transport

Le flux normal est strictement le suivant :

```text
OpenCode ↔ cgpt-validation : MCP stdio local
cgpt-validation ↔ contrôleur Codex : HTTP/SSE local
OpenCode → contrôleur Codex : SSE HTTP direct
```

OpenCode lance `cgpt-validation` comme serveur MCP local `stdio`.

Le broker ne possède ni port MCP réseau, ni serveur MCP HTTP, ni SSE MCP exposé.

Le contrôleur Codex est local et s’exécute hors sandbox.

Le broker :
- corrèle les demandes par `requestId` ;
- persiste leur état ;
- ne remplace jamais une décision corrélée déjà enregistrée, y compris par
  une décision automatique postérieure ;
- notifie le contrôleur ;
- récupère les décisions ;
- restitue à OpenCode une réponse MCP corrélée ;
- ne décide jamais à la place de Codex ;
- ne modifie jamais le projet.

`broker_readiness` est l’interface synthétique de supervision.
`broker_health` reste réservé au diagnostic détaillé.

## `/CAB stats`

Accepter exactement stats, statslast, stats 24, stats7 ou stats30, avec au plus une cible --run <run_id>. Les sélections sont current, last, 24h, 7d et 30d. Refuser argument inconnu, cible manquante/dupliquée ou suffixe sans collecte. Consulter uniquement GET /statistics/view?selection=<selection>, avec runId si ciblé et format=markdown si souhaité. Les interfaces historiques /statistics et /runs/<run_id>/statistics restent consultables pour les agrégats et le brouillon à six sections.

Sans cible, présenter chaque change courant séparément ; la dernière sélection exige la dernière livraison observée, pas une publication. Afficher horodatages, sources natives/importées, identités, couverture, dénominateurs, bornes et N/A motivés. Les sources recouvrantes, paires et conditions d'attente ne s'additionnent pas. Les quotas restent partagés ; une variation exige compte/fenêtre/reset comparables. Ne jamais appeler POST, PATCH ou DELETE, démarrer une sonde, modifier le projet, importer automatiquement des données, réveiller un RUN ou créer une surveillance.

## Suspension ciblée ou globale

Une cible --run <run_id> est locale. Lire GET /runs et la génération, puis POST /runs/<run_id>/suspend avec version, action PAUSE, STOP ou RESUME et références non secrètes de l'autorité/evidence. PAUSE/STOP ferme les nouvelles admissions ; conserver les effets et protections jusqu'à leur frontière sûre. RESUME exige leur réconciliation et ne réutilise aucune permission. STOP ne prouve ni livraison ni gate TERMINÉ : suivre le gate/arrêt ciblé autorisé sans arrêter les services des pairs.

--all exprime une demande globale explicite. PAUSE/STOP utilise /coordination/global/request avec cause GLOBAL_PAUSE ou GLOBAL_STOP, scope=all, transactionId, authorization et evidence. Terminer/réconcilier les effets connus sans nouvelle sous-opération, puis /coordination/global/confirm après vérification de toute la cohorte. Une fin inconnue conserve le gel. RESUME vérifie l'état courant, les preuves et le prévol nécessaires puis /coordination/global/release avec transaction/génération et autorisation de reprise. Aucun timeout ne libère le gel ; une pause propre à un RUN reste prioritaire après reprise globale.

Maintenance ou réconciliation de l'infrastructure partagée exigent leur autorité explicite et les causes SHARED_MAINTENANCE ou GLOBAL_RECONCILIATION. Ne jamais utiliser une exclusion globale pour une validation, publication ou un conflit ordinaire. Fermer/redémarrer OpenCode exige une demande distincte. Un arrêt partagé conserve les gates/protections ; une nouvelle session exige une réconciliation autorisée du gel avant toute purge, dont les refus existants restent applicables.

## `/CAB status`

Produire dans ce chat un résumé très synthétique français et horodaté. Cette
consultation est ponctuelle et strictement en lecture seule ; elle se termine
après le tableau, même si des RUN continuent leur travail.

### Arguments et périmètre

Accepter exactement `status` ou `status --run <run_id>`. Le RUN est un
identifiant exact, jamais un fragment ni un chemin : 1 à 100 caractères,
premier caractère alphanumérique, suivants alphanumériques, `_`, `.` ou `-`,
sans `..`. Refuser argument manquant, dupliqué, option inconnue ou suffixe.
Sans filtre, résumer les RUN courants du contexte suivi, y compris les parents
en sélection ou en attente sans réservation ; ne pas réintroduire les anciens
RUN explicitement arrêtés. Avec filtre, rechercher seulement le RUN exact et
signaler « RUN introuvable dans le périmètre consulté » s'il est absent.
Ne choisir aucun voisin et n'initialiser aucun contexte.

### Collecte ciblée

1. Identifier le contexte et les RUN depuis les sources publiques disponibles :
   GET /runs et GET /status du contrôleur local déjà connu. Pour les seuls RUN
   courants concernés, lire GET /runs/<run_id>/status ; lire
   GET /runs/<run_id>/integration-status et GET /runs/<run_id>/locks si une coordination doit être éclaircie.
   Utiliser des délais bornés ; une erreur est une indisponibilité, pas un
   ordre de démarrer CAB. Aucune nouvelle configuration n'est créée ou lue
   dans un emplacement sensible pour trouver le contrôleur.
2. Recouper, si accessibles, les états natifs Codex via list_threads puis
   wait_threads avec timeoutMs:0, et les états OpenCode via GET /api/session/active.
   Corréler ownerId, sessionId, directory, run_id et change_id ; ne pas prendre
   le statut du présent chat de consultation pour celui d'un orchestrateur.
   Ces lectures ne transmettent aucun message, ne réveillent aucun agent et
   n'exécutent pas broker_readiness dans une session de codage.
3. Lire le checkpoint par RUN du projet identifié :
   output/<prompt>/<run_id>/state.json, notamment output/cismp/<run_id>/state.json.
   Une liste limitée à ce répertoire permet de retrouver un parent sans
   réservation ; pas de parcours récursif global. Ne pas utiliser seul l'ancien
   output/cismp-state.json. Extraire seulement les champs utiles d'identité,
   état, date, dernier jalon, prochaine action, mandat, gate et coordination ;
   ne jamais afficher ou exporter l'objet complet, ses contenus préparés ou
   historiques bruts. Les liens sortant du projet et sources exclues restent
   interdits. Une identité divergente n'est pas fusionnée.
4. Pour le change exact, recouper tasks.md avec les références de preuves
   disponibles. Une coche seule reste une réalisation déclarée : ne pas
   annoncer de test exécuté sans résultat observé. La présence d'une archive
   ne prouve pas publication, STATISTICS.md vérifié et gate ; vérifier leurs
   preuves ciblées avant d'annoncer une livraison. Un candidat réservé sans
   répertoire de change est annoncé « préparation », sans créer ce répertoire.
5. Dater les observations et conserver les dates des checkpoints. Avant de
   conclure à une attente, vérifier qu'elle n'a pas déjà ended_at, closed_at,
   une publication/réconciliation ou une reprise plus récente corrélée.
   Une ancienne prochaine_action ne prime pas sur le dernier mandat ou travail
   prouvé. Une contradiction non réconciliée ou l'absence de source actuelle
   exploitable donne INDÉTERMINÉ, avec cause et dernière date disponible.
   Une source défaillante n'empêche pas d'utiliser une autre preuve actuelle
   corrélée ; signaler séparément sa limite.

### Statut de chaque RUN

- **ACTIF** : activité actuelle d'orchestration Codex ou de travail OpenCode
  corrélée, sans suspension actuelle du travail. Préciser l'action observée ;
  Codex peut revoir un contenu quand OpenCode est idle. Ne pas prétendre à
  une exécution native si seule l'orchestration est active.
- **EN ATTENTE DE RUN <identifiant> — <cause>** : dépendance, exclusion,
  position FIFO ou ressource réellement bloquante actuellement corrélée au
  pair nommé. Une exclusion actuelle reste affichée même si Codex poursuit
  des lectures. Ne pas transformer tous les obstacles d'intégration d'un RUN
  encore au travail en une attente actuelle. Après publication et
  réconciliation prouvées, l'ancienne attente est levée.
- **EN ATTENTE — <cause>** : attente interne actuelle, par exemple prévol
  modèle, décision humaine ou réconciliation propre, sans pair prouvé.
- **BLOQUÉ**, **ARRÊTÉ** ou **TERMINÉ** : seulement sur état et preuves
  corrélés ; distinguer gate individuel d'un change et état du parent.
- **INDÉTERMINÉ — <cause>** : preuve actuelle absente, ancienne ou contradictoire.

RESERVED, READY, IMPLÉMENTATION, un processus vivant ou un chat simplement
chargé ne suffisent pas à établir ACTIF. OpenCode idle ne signifie pas une
attente d'un autre RUN. Un parent idle sans cause d'attente prouvée reste
INDÉTERMINÉ. La présence d'autres RUN ne prouve aucune dépendance.

### Restitution exacte

Afficher « État observé le <date et heure, fuseau utilisateur> », puis :

| RUN / Nom du change | Actions réalisées | Actions en cours | Actions restant à réaliser |
| --- | --- | --- | --- |
| <RUN — statut explicite, pair et cause éventuels> · <change exact> | <preuves acquises> | <dernier travail observé ou attente actuelle> | <obligations non prouvées> |

Une ligne courte par RUN, avec un lien vers son checkpoint ou tasks.md si
accessible. Conserver l'identifiant du pair même si un libellé CISMPx est
disponible ; n'inventer ni numérotation, ni pourcentage, ni succès, ni cause.
Une phrase courte après le tableau peut signaler les limites de collecte.
Si aucun RUN courant n'est trouvé, l'indiquer avec le périmètre et les sources
consultés ; une source indisponible ne prouve pas l'absence de RUN.

Ne jamais appeler POST, PATCH ou DELETE, approuver une permission, écrire un
checkpoint ou rapport, démarrer, arrêter ou reconnecter un service, créer une
session, une automation ou un message. La consultation ne modifie ni le projet
piloté, ni CAB, ni les processus ; elle n'exécute aucun test du projet suivi.

## `/CAB start`

Dès la résolution du workspace absolu canonique, appliquer intégralement
`references/monitor-service.md` du skill CAB installé, avant PLLM, santé
OpenCode et prévols modèle/MCP. Ce passage est obligatoire à chaque entrée
ou reprise de session de codage pilotée, même si le contrôleur et le superviseur
sont déjà actifs et réutilisés. Ne pas se limiter au constat d'une unité absente :
si elle est inactive ou absente dans le périmètre autorisé, installer son jeu
indépendant, puis exécuter `systemctl --user daemon-reload` et
`systemctl --user start cgpt-approval-bridge-monitor.service` séparément.
Réutiliser une instance active conforme sans modification ni redémarrage.
Vérifier service actif, GET /api/snapshot avec version 2.1.5 et identity.workspace
attendus, puis GET / ; terminer cette tentative bornée et rapporter son résultat
avant les contrôles amont. Afficher l'URL réelle uniquement après ces preuves,
sinon la cause et l'URL attendue séparément du statut CAB. Préserver configuration
et port existants, sans activation au login. Un échec PLLM ou CAB ultérieur
n'arrête pas le moniteur. Une divergence active ou un échec de monitoring ne
permet aucun arrêt, redémarrage ou changement de RUN dans les autres briques.

Après ce contrôle du monitoring et avant les étapes ci-dessous, appliquer intégralement
`references/session-reset.md` depuis le skill `approval-bridge` du plugin
CAB installé. Toute réinitialisation globale exclusive impose la purge complète du runtime CAB,
y compris journal, approbations, anciens jobs, checkpoints et conflits
Syncthing, sans lire ou restaurer l'ancien contenu. La commande autorise cette
purge des seuls espaces CAB, après preuve d'inactivité, arrêt des ressources
et déconnexion native du broker ; elle ne ferme pas OpenCode. Le plugin
distribue `scripts/cgpt-approval-bridge-reset.py` pour l'exécution contrôlée.
Une purge échouée ou incomplète impose `CAB_INACTIF`, sans premier mandat.
La reprise ordinaire du même RUN conserve ses preuves et ne relance pas cette
purge, y compris après prévol de récupération divergent : conserver la
candidate et le job selon la procédure ci-dessous.

1. Vérifie qu’OpenCode répond sur `127.0.0.1:4096`.
2. Vérifie que la configuration OpenCode V2 déclare `cgpt-validation` comme serveur MCP local `stdio` sous `mcp.servers`.
3. Consulte l’état MCP par `GET /api/mcp` authentifié et vérifie `location` ainsi que l’enveloppe `data`. Cette API est la seule source de vérité pour les sessions persistantes ; une sortie de CLI ou un état mémorisé ne suffit pas.
4. Si `cgpt-validation` n’est pas `connected`, tente uniquement les routes V2 documentées de reconnexion du MCP ciblé, puis relis `GET /api/mcp`. N’appelle pas `/instance/dispose` et ne tue, démarre ni redémarre directement le broker. En cas d’échec, publie `CAB_INACTIF` avec l’erreur observée et n’ouvre aucune session de codage.
5. Identifie dans la configuration API OpenCode l’agent de codage qui recevra le premier prompt et relève son fournisseur, son modèle et son niveau de raisonnement effectivement configurés. Ne modifie jamais cette configuration et ne lis aucune donnée secrète.
6. Vérifie via l’API OpenCode que le fournisseur et le modèle relevés sont publiés et disponibles. Crée alors une session de prévol temporaire, sans outil ni accès au projet, et lui adresse une requête inoffensive en imposant exactement ce fournisseur, ce modèle et ce niveau de raisonnement.
7. Contrôle la réponse et ses métadonnées réellement observées. Elles doivent confirmer le même fournisseur, le même modèle et le même niveau de raisonnement. Ferme la session de prévol après cette preuve. Si une valeur est absente, indisponible, divergente ou si la requête échoue, publie `CAB_INACTIF` avec les valeurs attendues et observées, puis n’installe pas le contrôleur et ne crée ni ne réutilise de session persistante.
8. Résous les ressources du plugin CAB installé, puis copie son contrôleur, son superviseur et leurs modèles d’unité dans les répertoires stables du profil : `~/.local/share/cab-approval-bridge/` et `~/.config/systemd/user/`. Pour la sélection automatique, applique la préparation du catalogue décrite ci-dessous. Fusionne son patch validé `OC_Codex_PLLM_CATALOG` dans `~/.config/cab-approval-bridge/controller.env`, avec le workspace absolu du job et `OC_Codex_OUTSIDE_SANDBOX=1`, en préservant les autres options et sans y écrire de secret. Exécute `systemctl --user daemon-reload`. Cette installation différée ne doit jamais appeler `systemctl --user enable` et ne doit pas démarrer le service avant cette commande `/CAB start` explicite.
9. Démarre ou réutilise le contrôleur Codex persistant hors sandbox par `systemctl --user start cgpt-approval-bridge-controller.service`, avec `OC_Codex_OUTSIDE_SANDBOX=1` ; l’alias historique `OC_CGPT_OUTSIDE_SANDBOX=1` reste accepté. Vérifie qu’il est `active` et que son unité utilise `Restart=on-failure`.
10. Vérifie le contrôleur Codex sur son interface locale.
11. Démarre explicitement le superviseur utilisateur par `systemctl --user start cgpt-approval-bridge-supervisor.service`, puis vérifie son statut local. Il utilise `Restart=on-failure`, sans activation au login, et ne prend aucune décision CAB.
12. Établit et maintient le flux SSE HTTP direct OpenCode authentifié `GET /api/event`.
13. Crée une nouvelle et unique session de codage OpenCode persistante pour ce nouveau RUN avec l’API V2 `POST /api/session`. Réutilise la session uniquement pour une reprise du même RUN. Conserve et affiche son identifiant ; elle est l’unique canal des mandats de codage jusqu’à la clôture du job.
14. Adresse les mandats exclusivement à cette session via `POST /api/session/<id>/prompt`. Aucun appel CLI éphémère ne peut transmettre ou exécuter un mandat de codage. La session doit rester visible au développeur dans OpenCode.
15. Dans cette session, appelle `broker_readiness` sans lecture, commande ni écriture du projet.
16. Accepte comme états possibles : `READY`, `DEGRADED`, `BLOCKED`, `HUMAN_REQUIRED`.
17. Après reconnexion SSE ou divergence détectée, réconcilie l’état réel via HTTP auprès d’OpenCode, puis recontrôle `/api/mcp` avant tout nouveau mandat.
18. Crée ou réactive le heartbeat global « Surveillance CAB » toutes les 30 secondes.
19. Le heartbeat surveille OpenCode, `/api/mcp`, `broker_readiness`, le contrôleur, le superviseur et le SSE OpenCode.
20. Le heartbeat reste silencieux lorsque tout est sain et ne prend aucune décision de validation.
21. Publie `CAB_ACTIF` uniquement si les preuves suivantes sont présentes :
    - OpenCode sain ;
    - MCP `cgpt-validation` connecté ;
    - `broker_readiness` exploitable ;
    - contrôleur Codex joignable ;
    - superviseur CAB joignable ;
    - SSE OpenCode `connected` ;
    - heartbeat actif.
22. Toute preuve absente impose `CAB_INACTIF`.
23. Avant le premier pilotage réel après démarrage, exécute obligatoirement `/CAB test`.

Une simple réponse HTTP, un ancien état MCP ou une ancienne session de test ne suffit jamais à déclarer `CAB_ACTIF`.

## `/CAB run`

Exécute un job piloté dans la session persistante après un `/CAB start` et un
`/CAB test` réussis.

1. Constitue un contrat de job : identifiant de job, session OpenCode,
   répertoire cible, change OpenSpec éventuel et critères de fin. Arme-le par
   `POST /runs/<run_id>/job/arm` du contrôleur avant tout mandat. Ce contrat ne vaut jamais
   une décision d'approbation d'action et ne contient ni secret ni contenu du
   projet. Si le prompt parent exige l'identité stricte des commandes, notamment
   CISMP, arme ce contrat avec `strictCommands: true` pour refuser tout suffixe.
   Publie chaque jalon prouvé et mandat courant par `POST /runs/<run_id>/job/progress`.
   Pour chaque change, charge le skill `coding-session-statistics` du plugin
   CAB avant le premier travail et prépare les relevés et sondes prévus. Ajoute
   aux critères de fin la preuve du rapport après archivage définie ci-dessous.
2. Avant chaque édition, commande Bash, commande système ou commande OpenSpec
   qui exige une permission native, l’agent de codage crée un mandat CAB
   unitaire : `requestId`, `approval_id`, `change_id`, session, répertoire,
   résumé et exactement un fichier relatif ou une commande complète.
3. Codex examine chaque mandat dans la session persistante et rend une décision
   explicite, unique et corrélée. Après une décision `approved`, CAB répond
   `once` à la seule permission native OpenCode correspondante, puis consomme
   ce mandat.
4. Une seconde permission, une autre commande, un autre fichier ou une demande
   sans décision corrélée reste en attente. CAB ne l’acquitte jamais seul et
   l’écart est remonté à l’orchestrateur.
5. Après chaque tour de l’agent de codage, contrôle la session persistante. Si
   le contrat n’est pas terminal, envoie le mandat suivant sans créer de session
   éphémère et sans conclure la réponse Codex. Si une interruption empêche ce
   mandat, le superviseur CAB réexamine la même session après 60 secondes ; il
   ne crée ni décision ni session de remplacement.
6. Le job devient terminal uniquement si tous ses critères sont satisfaits, si
   CAB retourne `BLOCKED` ou `HUMAN_REQUIRED`, ou si le développeur l’arrête
   explicitement. À ce moment seulement, publie le bilan final puis clôture le
   contrat côté CAB.

### Statistiques obligatoires après archivage

Pour chaque spécification archivée avec succès, l'orchestrateur fait produire
`openspec/changes/archive/<archive>/STATISTICS.md` selon le skill embarqué
`coding-session-statistics`. L'archivage doit rester explicitement autorisé.
Après sa preuve, relève le quota final et la fin de l'intervalle avant la
synthèse, puis transmets un mandat d'édition distinct pour ce seul rapport.
La commande `/CAB` ne rédige pas elle-même de fichier dans le projet piloté.

Vérifie l'existence, les six sections, UTF-8/LF et la cohérence des totaux,
puis publie ce jalon prouvé par `POST /runs/<run_id>/job/progress` avant de demander le gate
terminal normal `TERMINÉ`. Un lot exige un rapport par archive, avec le
périmètre et les bornes propres à chaque change. Le skill lit les quotas
avec l'outil natif Codex et n'exige pas le skill `cgpt`.

Toute donnée manquante est signalée `N/A` avec sa cause, sans mesure inventée.
Si l'archivage échoue, ne présente pas un rapport final après archivage. Si
le rapport échoue alors que l'archive existe, signale le cycle incomplet et
reprends seulement le rapport avec un nouveau mandat, sans réarchiver.
Ne demande pas la clôture normale `TERMINÉ` sans preuve du rapport ; une
clôture `BLOQUÉ` ou un arrêt explicite conserve la cause et le travail restant.

## `/CAB test`

Exécute un test non destructif après `/CAB start`.

Utilise la session de codage persistante créée par `/CAB start`. Ne crée pas de session éphémère : le test et les mandats ultérieurs doivent rester observables au même endroit. Le test ne lit ni n’écrit le projet et n’exécute aucune commande qui y accède. Pour vérifier le cycle CAB de bout en bout, il utilise exclusivement la commande inoffensive `true`, sans effet fonctionnel.

1. Vérifie OpenCode : `OK` ou `NOK`.
2. Vérifie par `GET /api/mcp` que `cgpt-validation` est `connected` comme MCP local `stdio`.
3. Vérifie que l’identifiant de la session persistante est connu et que la session reste accessible par l’API native OpenCode.
4. Appelle `broker_readiness` dans cette session par `POST /api/session/<id>/prompt`.
5. Interprète strictement :
   - `READY` → continuer ;
   - `DEGRADED` → afficher `root_cause` et `recommended_action`, continuer seulement si le test actif reste sûr ;
   - `BLOCKED` → arrêter immédiatement en `NOK` ;
   - `HUMAN_REQUIRED` → arrêter et signaler l’intervention humaine requise.
6. Vérifie le contrôleur Codex et le SSE direct OpenCode actifs.
7. Vérifie qu’aucune demande d’approbation parasite n’est en attente.
8. Dans la même session persistante, demande à OpenCode de produire une validation non destructive sur `cgpt-validation` avec un `requestId` unique, `files: []` et `commands: ["true"]`.
9. Codex rend une décision explicite unique `approved`.
10. Vérifie dans cette session qu’OpenCode reçoit la réponse MCP corrélée et exécute `true` une seule fois.
11. Vérifie l’accusé de réception OpenCode via le SSE direct.
12. En cas de reconnexion ou divergence, confirme l’état réel par HTTP puis recontrôle `/api/mcp` avant de reprendre le test.

Affiche une coche verte uniquement pour une preuve réellement observée dans la session courante.

En cas d’échec, affiche :
- `NOK` ;
- le `requestId` concerné si disponible ;
- `root_cause` si disponible ;
- `recommended_action` si disponible ;
- la cause précise.

N’annonce jamais une réussite partielle comme un test validé.

À la fin du test, conserve la session persistante pour le job. Ne clôture que les ressources temporaires propres au test.

Ne ferme jamais :
- le broker MCP stdio principal ;
- OpenCode ;
- le contrôleur persistant ;
- le heartbeat global.

Ces interdictions concernent la fermeture des processus. Elles n’interdisent
pas une bascule d’authentification fournisseur explicitement autorisée ni le
stockage privé standard de la clé par OpenCode, hors dépôt et lecture des
agents. Le transport V2 ne requiert aucun `/instance/dispose`. Après une
reconnexion MCP ciblée, réconcilier `/api/info`, `/api/mcp`, readiness réelle
et test CAB. Le secret Basic Auth est provisionné dans le fichier local privé
décrit par BUILD.md ; il ne passe pas au modèle ni dans les arguments.

## `/CAB update`

Met à jour le plugin, son skill `approval-bridge`, les quatre briques CAB
(broker, contrôleur, superviseur, Web) et les commandes du profil. `/CABU`
reste un alias strict qui charge CAB.md et délègue ici ; il ne contient aucune
logique de maintenance. La procédure utilise la référence
`skills/approval-bridge/references/component-update.md` du plugin installé et
vérifie que le manifeste, le skill, sa référence et le script updater sont bien
associés avant toute mutation.

L'update valide et prépare le jeu complet, puis appelle systématiquement
`systemctl --user stop` pour `cgpt-approval-bridge-controller.service`,
`cgpt-approval-bridge-supervisor.service` et
`cgpt-approval-bridge-monitor.service`, sans consulter les RUN, permissions,
coordinations globales ou états de service pour décider de poursuivre. Il
remplace atomiquement les fichiers des quatre briques, y compris les trois
fichiers broker dans la destination déclarée, appelle
`systemctl --user daemon-reload`, puis `systemctl --user start` pour ces trois
unités. Il ne les active pas au login et ne modifie aucun état métier de RUN.

OpenCode reste ouvert. Avant la coupure, détecter sa présence sans consulter
les RUN. Les routes sont `POST /api/experimental/mcp/cgpt-validation/disconnect`
et `POST /api/experimental/mcp/cgpt-validation/connect`, authentifiées par Basic Auth.
OpenCode actif exige la déconnexion/reconnexion native V2 du broker
et une readiness fraîche de version cible ; une API invalide ou inaccessible
interdit le succès si le processus est présent. Seule son absence prouvée
autorise le broker runtime `INDISPONIBLE`. Les trois services doivent toujours
redémarrer et servir leur nouvelle version. La procédure détaillée et les
mesures preparationMs/unavailableMs/totalMs figurent dans
`references/component-update.md` du plugin installé.

### Prévol 2.1.5 du credential et du layout

Avant la coupure, l’updater valide le credential privé systemd. Si le DEVOPS.md du projet désigne OPENCODE_PASSWORD dans project.env et que le développeur autorise ce raccord, passer explicitement `--opencode-password-env-file <workspace>/project.env` (source CAB ou workspace des services). Ne jamais lire ou afficher sa valeur dans les outils du modèle : seul le processus local traite le fichier. Sans cette option, utiliser le credential privé existant ; ne pas exiger de variable des projets sans OpenCode. Un conflit avec un credential existant reste refusé. Un credential nouvellement provisionné est conservé après échec sans copie dans les sauvegardes.

Pour des services installés par liens gérés, combiner `--broker-policy cab-source --layout managed-release` ; seuls les services et le Web utilisent les releases, les trois modules src/ restent ordinaires. Ne pas matérialiser manuellement les anciens liens. Fournir `--service-workspace` si les services suivent un autre projet. Une erreur CLI inclut les diagnostics filtrés par service et le résultat du repli ; conserver ces preuves, sans assimiler systemctl start à une application active.

### GitHub comme référence de version par défaut

Pour `/CAB update` et `$CABU`, appliquer les étapes distantes 1 à 14 depuis
`AzenorPixs/cab-codex-plugins`, branche `main`, même si `cab_codex_plugins`
est une marketplace locale. GitHub fournit les versions cibles des plugins
CAB/CABU, du broker, du contrôleur, du superviseur, du Web et des trois commandes.
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
`CAB_ROOT/.codex/commands/{CAB,CABU,cab}.md`, vérifier leurs trois frontmatters
identiques à la version du plugin local et appliquer la même préparation privée,
comparaison, sauvegarde, remplacement atomique et relecture définis aux étapes
10 à 14. Le rapport conserve les provenances locale et GitHub séparées. Le
commit ou la publication du dépôt ne découlent pas de cette installation locale.

Uniquement dans cette installation locale explicitement demandée, lorsque
le manifeste du paquet CAB local est plus récent que GitHub, applique
la branche locale ci-dessus, saute les étapes distantes 1 à 7, puis résous le
plugin local installé à l'étape 8. Pour ce cas, les étapes 9 et 10 sont
remplacées par la préparation des trois fichiers depuis
`CAB_ROOT/.codex/commands/` ; conserve les contrôles d'atomicité, de sauvegarde
et de relecture des étapes 11 à 13.

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
   et des trois commandes sur cette même révision GitHub. Le jeu doit partager
   la même version de base. Un accès manquant ou une divergence arrête la
   préparation avant l'updater. Ne déduis aucune version GitHub d'un fichier
   local, du cache installé ou du reçu de déploiement.
6. Si le plugin CAB est installé et que la version distante est égale ou antérieure à celle installée, affiche
   `CAB_PLUGIN_DÉJÀ_À_JOUR` et ne réinstalle pas le plugin.
7. Si le plugin CAB est absent ou si la version distante est strictement plus récente, exécute une seule fois
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
   référence sa procédure `references/component-update.md`, et que celle-ci
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
   arrête systématiquement les trois unités systemd CAB, remplace les artefacts
   atomiquement, exécute `systemctl --user daemon-reload` et démarre les trois unités. Il ne lit pas le
   registre des RUN ni la coordination globale avant l'arrêt. Il ne tue pas
   OpenCode. L'API native doit recharger le broker si OpenCode est actif ; seule son
   absence prouvée permet une version chargée `INDISPONIBLE`. En cas d'échec de démarrage,
   l'outil restaure les fichiers sauvegardés et redémarre les trois unités ; le
   rapport décrit le repli. Interprète le JSON final et le code de sortie :
   - `completed`, code 0 : `CAB_BRIQUES_MISES_À_JOUR` ;
   - `up-to-date`, code 0 : `CAB_BRIQUES_DÉJÀ_À_JOUR`, après redémarrage des
     trois unités ;
   - erreur : `CAB_BRIQUES_MISE_À_JOUR_ÉCHOUÉE`, avec état du repli ;
     `update-recovery-required` exige de conserver les preuves et le gel.
   Une récupération utilise le même outil et les mêmes cibles ; `--rollback`
   permet le retour explicite aux artefacts sauvegardés ou l'annulation sûre
   d'une attente, sans restaurer un ancien runtime. Un verrou vivant ou un
   journal invalide n'est jamais supprimé pour forcer une nouvelle transaction.
   L'outil ne touche ni controller.env ni monitor.env. Les anciens états
   CAB_SUPERVISEUR_INSTALLÉ et CAB_SUPERVISEUR_MIS_À_JOUR sont remplacés par
   le bilan des quatre briques ; le bilan indique le statut des trois unités
   après la mise à jour.
9. Utilise exclusivement la référence GitHub suivante pour le jeu de commandes :
   `https://github.com/AzenorPixs/cab-codex-plugins`, branche `main`, chemins
   `.codex/commands/CAB.md`, `.codex/commands/CABU.md` et `.codex/commands/cab.md`.
   Construis les URL brutes HTTPS correspondantes sans accepter de redirection
   vers un autre hôte. La procédure complète réside uniquement dans CAB.md.
10. Prépare les trois téléchargements dans un répertoire temporaire privé du
    profil Codex avec `curl --fail --silent --show-error`, sans écrire les cibles.
    Exige trois frontmatters avec une version SemVer valide identique, et les
    alias référençant le fichier frère CAB.md, avec transmission inchangée pour
    cab.md et argument fixe update pour CABU.md. Un fichier absent, une source
    ou une version divergente arrête toute publication des commandes.
11. Examine seulement les trois cibles nommées sous
    `${CODEX_HOME:-$HOME/.codex}/commands/`. Pour une installation héritée sans
    CAB.md, prends cab.md comme référence de version. Une copie sans version
    est antérieure à une source distante valide ; une version invalide est une
    erreur explicite. Préserve une copie locale plus récente. À version égale,
    compare le contenu de chaque fichier présent au téléchargement : un contenu
    divergent est préservé et signalé, sans remplacement ni ajout d'alias.
12. Si les trois copies sont conformes à version égale, affiche
    `CAB_COMMANDE_DÉJÀ_À_JOUR`, sans écriture. Si seules des copies manquent à
    version égale et que les copies présentes concordent, installe seulement
    les fichiers absents après validation complète du jeu. Si la source est
    plus ancienne que l'une des copies locales, conserve le jeu local et
    rapporte sa provenance, sans installation partielle.
13. Pour un jeu strictement plus récent ou les fichiers absents admis à
    l'étape 12, sauvegarde les seuls fichiers nommés à remplacer et mémorise
    ceux qui étaient absents. Revérifie leurs empreintes avant publication
    pour détecter une modification concurrente ; en cas de divergence, arrête.
    Remplace chaque cible atomiquement par son fichier temporaire validé, puis
    relis les trois versions, contenus et références locales avant d'afficher
    `CAB_COMMANDE_MISE_À_JOUR`. Si une étape échoue, restaure les seules copies
    sauvegardées et retire les seuls nouveaux fichiers de cette tentative.
    Un échec de restauration conserve les sauvegardes et reste explicitement
    bloqué. Affiche `CAB_COMMANDE_MISE_À_JOUR_ÉCHOUÉE` avec la cause observée ;
    n'annonce jamais un succès global après un échec de préparation ou publication.
14. Affiche toujours `CAB_RÉSUMÉ_VERSIONS`, y compris après échec ou attente,
    avec des colonnes distinctes GitHub, plugin installé, fichiers déployés,
    processus réellement actif et résultat de transaction. Inclure plugin,
    contrôleur, superviseur, broker, Web et commande :
    - GitHub : manifeste, scripts controller/supervisor/monitor, broker
      distribué dans plugins/cab-approval-bridge/broker/ et frontmatters des trois fichiers
      .codex/commands/{CAB,CABU,cab}.md ;
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

## `/CAB stop`

1. Avant tout arrêt normal, appelle `POST /runs/<run_id>/job/terminal-gate` du contrôleur avec l'état terminal explicite `TERMINÉ` ou `BLOQUÉ`. Si le contrôleur refuse le gate, ne clôture pas le job et reprends le pilotage ou restitue le blocage observé. Après un gate validé, désarme le contrat correspondant par `POST /runs/<run_id>/job/disarm`. Cette vérification est distincte d'un arrêt forcé explicitement demandé par le développeur.
2. Supprime tous les heartbeats et cron healthchecks créés par `/CAB`, dont « Surveillance CAB ».
3. Ferme les flux SSE ouverts par `/CAB`.
4. Arrête explicitement le superviseur démarré par `/CAB` avec `systemctl --user stop cgpt-approval-bridge-supervisor.service`, puis arrête explicitement et proprement le contrôleur avec `systemctl --user stop cgpt-approval-bridge-controller.service`. Ne désactive ni ne supprime leurs unités : elles restent installées mais inactives jusqu’au prochain `/CAB start`.
5. Ne tente pas d’arrêter directement `cgpt-validation` : son cycle de vie appartient à OpenCode.
6. Ne ferme jamais OpenCode sauf instruction explicite du contexte initial ou du développeur.
   Préserver explicitement `cgpt-approval-bridge-monitor.service`, sa configuration, ses sources et ses connexions propres : le moniteur reste disponible après cet arrêt. Son arrêt nécessite une demande distincte ; aucune erreur de monitoring ne justifie un arrêt ou redémarrage des autres composants.
7. Affiche le bilan : éléments arrêtés, éléments préservés et éventuelles erreurs. Inclure le statut et l’URL du monitoring conservé, ou son diagnostic d’indisponibilité.


## Récupération contrôlée de session dans le même RUN

Après un écart refusé sans effet, interrompre l'ancienne session, traiter son
rapport et clôturer le mandat courant avec `/runs/<run_id>/job/progress`. Ne pas réarmer le
job pour remplacer sa session : `/runs/<run_id>/job/arm` reste immuable. Créer la candidate
par l'API native OpenCode dans le même `directory`, avec permissions natives
`ask`, sans lui confier de travail métier.

Utiliser `POST /runs/<run_id>/job/recover` en deux phases. Le corps commun contient `jobId`,
`expectedSessionId` (ancienne session), `sessionId` (candidate), `recoveryId`
inédit et `preflightRequestId` inédit ; ajouter `phase: "prepare"`, puis
`phase: "complete"`. Le contrôleur vérifie par HTTP le contexte, MCP, les
sessions inactives et l'absence de permissions/demandes non résolues. Un mandat
indécis doit recevoir une décision explicite ; une transmission encore en
cours impose une réconciliation avant un nouvel essai.

Après prepare, le job et le superviseur sont gelés. Seul le prévol réservé de
la candidate est admis : `broker_readiness`, `request_validation` pour la
commande exacte `/usr/bin/true`, décision explicite corrélée, permission
native unique, exécution exit 0, puis `broker_readiness = READY` sans demande
en attente. Aucun suffixe ni autre outil natif. Le contrôleur vérifie les
preuves dans les messages OpenCode avant complete ; une déclaration de
réussite ne suffit pas. Aucun appel de récupération ne vaut décision CAB.

Après complete, relire `/job` et `/status` : même job, même change et critères,
dernier jalon conservé, nouvelle session, `strictCommands` préservé et gate
OPEN. Les anciennes autorisations exécutables sont invalidées et l'historique
non secret est conservé. Le superviseur suit désormais la session transférée.
Un échec conserve le gel ; la récupération ordinaire ne purge pas le RUN et
n'invente aucun gate terminal. Un prévol divergent suit la procédure sans
purge décrite dans
« Prévol de récupération divergent dans la même session » ci-dessous.
Un redémarrage conserve ce gel mais ne recrée pas la décision ou la preuve
locale du prévol : si elles sont perdues, la récupération reste refusée et
nécessite une décision humaine. L'API ne remplace ni une session révoquée ni
un prévol échoué par une nouvelle tentative implicite.

## Prévol de récupération divergent dans la même session

Après un prévol divergent ou incomplet prouvé et refusé avant exécution sans
effet, conserver la session candidate où le prévol a divergé, le même job,
le RUN et le runtime. Ne créer aucune autre session ni aucun job de remplacement,
ne purger aucun état et ne pas revenir à l'ancienne session révoquée.
Le remplacement initial prévu par CISMP reste inchangé ; cette règle concerne
les échecs du prévol dans sa candidate. OpenCode reste ouvert.

Comparer les appels natifs au mandat réellement prescrit, notamment
`requestId`, `approval_id`, `change_id`, `session_id`, `directory`, `files`,
`commands`, `title`, `summary`, `timeout_seconds` et `interval_seconds`.
Un champ omis, `true` au lieu de `/usr/bin/true`, un suffixe ou un change erroné
reste refusé sans normalisation. Un paramètre non prescrit ne devient pas une
divergence inventée. Un HTTP 409 seul ou un texte de l'agent ne prouve pas le
refus sans effet. Après un délai MCP seul, interroger uniquement le même
`approval_id` par `poll_approval` ou `get_approval`, sans nouvelle demande.

Geler le travail, traiter les rapports, refuser les permissions divergentes,
clôturer les demandes restantes sans les approuver et réconcilier les effets.
Exiger santé, contexte, MCP connecté, sessions inactives, aucun mandat actif
ou en attente, aucune permission non résolue et aucun effet inconnu.
Une décision `approved`, consommée ou une preuve incertaine interdit retry.

Demander explicitement `POST /runs/<run_id>/job/recover` avec `phase: "retry"`, les mêmes
`jobId`, `expectedSessionId`, `sessionId` candidate et `recoveryId`,
`previousPreflightRequestId` égal à la réservation actuelle et un
`preflightRequestId` inédit. Ne pas réarmer, désarmer ou abandonner le job pendant retry.
Le contrôleur exige un refus natif `REJECTED` corrélé à la décision locale
`rejected` non consommée, ou une erreur native MCP `-32602` avant enregistrement.
Depuis CAB 1.0.2, après timeout de `request_validation`, `poll_approval` ou
`get_approval` sur le même `approval_id` peut prouver ce refus. Vérifier dans
l'ordre natif `requestId`, `approval_id`, `session_id`, `directory`, `change_id`,
`files` et `commands` ; toutes les demandes enregistrées doivent être refusées.
Un `PENDING` corrélé reste non terminal ; aucune nouvelle demande n'est admise
avant retry. Une erreur générique, un timeout seul, un polling divergent,
une commande ou un autre outil natif laisse le gel conservé et exige la
réconciliation ou l'autorité indispensable.

Le contrôleur conserve les identifiants antérieurs et l'empreinte du préfixe
des parties natives, sans contenu de message. Il vérifie ce préfixe à chaque
retry et complete ; une preuve modifiée ou perdue interdit la transition.
Le nouvel essai utilise des `requestId` et `approval_id` neufs ; les anciennes
décisions restent intactes et ne sont jamais réutilisées. Une perte de preuves
locales après redémarrage ne permet pas leur reconstruction implicite.

Dans la même candidate, exiger exactement `/usr/bin/true`, sans suffixe, avec
le `change_id` attendu, une décision explicite, une réponse MCP corrélée, une
permission native unique, exit 0 puis `broker_readiness = READY` sans demande
ni permission parasite. Appeler complete avec la nouvelle réservation et
relire `/job` et `/status` avant tout mandat métier. Le superviseur reste gelé
jusqu'à complete ; il suit ensuite cette candidate devenue session du job.

Un nouvel écart sûr reprend cette procédure dans la même candidate, sans
concurrence ni doublon d'une tentative non réconciliée, jusqu'au prévol exact
ou arrêt explicite. Conserver le RUN en attente non terminale, le checkpoint
métier non secret, numéro, identifiants, horodatages, cause, arguments attendus
et observés et références des preuves natives. Maintenir le suivi à la cadence
existante sans boucle serrée. Reprendre au premier jalon non prouvé, sans
rejouer les écritures validées ni les autorisations consommées.


Cette conservation s'applique à retry et ne retire jamais l'autorité d'un
arrêt ciblé explicitement demandé par le développeur. Un tel arrêt reste
distinct : réconcilier les effets et demandes, obtenir le gate `BLOQUÉ`,
désarmer uniquement le job concerné et libérer sa réservation avec preuves,
sans purge ni suppression des historiques. Une nouvelle session ou un nouveau
job exige une autorisation explicite de reprise ; ne fermer ni redémarrer
OpenCode, le broker ou les services communs des autres RUN.

## Mandats d'inventaire ou d'analyse en lecture seule

Dans le corps de messagerie OpenCode, désactiver explicitement les outils :

```json
{"tools":{"bash":false,"edit":false,"write":false,"apply_patch":false,"task":false,"skill":false}}
```

Conserver seulement les outils de lecture et recherche autorisés. Le texte
« lecture seule » ne remplace pas ce verrou. Aucune configuration persistante
OpenCode n'est modifiée. Au mandat exécutable suivant, réactiver explicitement
les seuls outils nécessaires ; leurs permissions natives restent `ask` et
chaque opération conserve son mandat CAB unitaire, sans autorisation générale.

## Réactivation sûre des outils — CAB 1.0.1

OpenCode peut convertir `tools: true` en permission native `allow`. Avant
un mandat exécutable, attendre l'inactivité de la session ciblée, réactiver
uniquement les outils nécessaires dans un message avec `noReply: true`, puis
rétablir les règles `ask` par PATCH de cette seule session. Relire la session
et vérifier pour chaque type natif nécessaire (`bash` ou `edit`) une dernière
règle applicable de pattern `*` et d'action `ask`, y compris les noms à jokers.
Une règle spécifique ultérieure ou une preuve absente suspend le mandat.

Ensuite seulement, envoyer le message de génération sans champ `tools` qui
réécrirait ces règles. Un `tools: true` dans ce message peut annuler le PATCH.
La séquence `noReply`, PATCH, lecture native, génération est requise aussi
pour le prévol de récupération. Elle ne constitue aucune approbation CAB.

Pour les jobs armés, le contrôleur vérifie les règles avant admission et avant
une décision `approved`, ainsi qu'avant transmission de `once`. Les refus
`native-permission-ask-required`, `native-permission-control-unavailable` et
`native-permission-context-divergent` imposent une réconciliation. prepare
refuse une candidate sans Bash `ask` par `preflight-native-ask-required`.
Ces contrôles ne modifient aucune permission ; les règles doivent rester
stables pendant le mandat. Une modification externe après contrôle n'est
pas atomique avec l'exécution native et reste hors garantie du contrôleur.

## Environnements de test et rafraîchissement — 2.1.5

Pour les RUN coordonnés, consulter le protocole `test-resources-v1` et la référence concurrent-runs avant tout usage Docker/LXC. Acquérir l'environnement avant préparation et le conserver entre commandes jusqu'aux preuves de fin, nettoyage et restitution. Le moniteur affiche les attentes de test et propose une cadence locale Manuel/1s/3s/7s/30s/1m/5m/10m/30m avec Actualiser ; sa carte Web conserve Disponible pendant 30 minutes après un rafraîchissement réussi. Ces fonctions ne déclenchent aucune mise à jour de service par leur présence dans les sources.

Les navigateurs externes de test déclarés dans DEVOPS.md, actuellement Chromium et Firefox, suivent aussi ce cycle avec les clés `browser:<hôte>/<navigateur>`. La réservation reste détenue jusqu'à fermeture des sessions WebDriver/BiDi et processus, libération des ports et profils temporaires du change, nettoyage puis vérification distincts. Les sessions utilisateur préexistantes sont préservées. Les ensembles navigateur/conteneur sont acquis atomiquement ; des mécanismes indépendants peuvent avancer.

## Modèle du prompt et PLLM automatique

Avant un nouveau job piloté 2.1.5, appliquer intégralement references/model-policy.md après le bootstrap du monitoring. Un modèle concret explicite reste prioritaire. Sinon, utiliser la PLLM automatique actuelle ; sans raisonnement explicite, demander medium. Si medium est indisponible, examiner la politique PLLM suivante. Un modèle explicite incompatible bloque. Résoudre OC_Codex_PLLM_CATALOG depuis le skill actif et négocier pllm-auto-v1 ; armer avec modelSelection et la preuve native modelPreflight du prévol exact. Vérifier codingModel dans le job. Une reprise conserve ce choix sans bascule ni sélection implicite d'un autre niveau. Les anciens jobs non négociés restent historiques. Le broker et le moniteur ne choisissent pas de LLM.

La session de pilotage définit explicitement providerMaxBytes pour la lecture /provider dans /model-policy/resolve et le répète dans modelSelection à l'armement, selon references/model-policy.md du skill installé. Ce budget local en octets n'élargit ni les autres observations ni le catalogue PLLM.

## Préparation du catalogue avant démarrage et nouvel armement

Cette préparation est requise pour PLLM automatique. Un modèle concrètement imposé conserve la voie explicite existante du contrôleur ; ne pas lui imposer une nouvelle dépendance de publication PLLM.

Résoudre la racine du skill PLLM effectivement actif depuis le catalogue de skills de cette session ; ne pas rechercher dans des configurations privées. Exécuter le script du paquet installé `scripts/cgpt-approval-bridge-prepare-model-policy.mjs --pllm-skill-root <racine-absolue-active>`. Si un chemin de catalogue explicite est déjà fourni, le transmettre avec `--catalog-path <chemin-public>` ; les options de configuration explicites et leur alias historique restent prioritaires sur la découverte du skill.

Le script valide le fichier public régulier et borné ainsi que la publication, sans benchmark ni écriture. Sa sortie contient uniquement catalogPath, source et environment={OC_Codex_PLLM_CATALOG:...}. Pendant le démarrage ou la maintenance expressément autorisés, fusionner ce seul patch dans la configuration du contrôleur en conservant toutes les autres options. Préserver l'échappement littéral EnvironmentFile ; ne jamais utiliser source ou eval ni afficher un environnement complet. La préparation seule ne configure ni ne redémarre le service.

Après démarrage ou rechargement coordonné, appeler /model-policy/resolve avec les exigences du prompt et providerMaxBytes choisi par la session. Exiger une résolution réussie du contrôleur avant prévol et nouvel armement ; la simple réussite du CLI ne prouve pas la transmission au service. pllm-catalog-unconfigured indique un raccord absent dans le processus chargé ; les autres diagnostics de catalogue, fournisseur ou prévol restent distincts. Ne pas contourner par un modèle manuel. Une erreur conserve le job non armé et exige la récupération autorisée.

Pour le raccord 2.1.5, utiliser la préparation sans effet du catalogue dans references/model-policy.md avant le démarrage autorisé, transmettre son patch au contrôleur puis vérifier /model-policy/resolve avant nouvel armement. Conserver la provenance logique et employer le fournisseur natif vérifié. Les variantes parent imbriquée/historique et assistant présent doivent rester cohérentes. Aucune activation n’est déduite de cette préparation source.

Pour `cab-source`, si les services sont configurés pour un autre projet, fournir
`--service-workspace <workspace-absolu-observé>` : les contrôles de version et
les appels MCP ciblent ce workspace réel sans modifier les configurations.
La récupération conserve le même journal et les mêmes destinations. Le jeu Web
indépendant inclut aussi cgpt-approval-bridge-opencode-client.mjs.

Contrat courant CABU 2.1.5 : les tolérances historiques de broker non vérifiable
ne permettent plus le succès si OpenCode est actif. Une absence prouvée est
requise pour la seule exception broker. Appliquer le contrat de coupure courte
de component-update.md ; ne prévenir ni modifier les RUN pour cet update.


### Permissions réappliquées par DIU

DIU peut remettre le répertoire `~/.config/cab-approval-bridge/` en `0770`. Dans CAB 2.1.5, la lecture du credential existant reste possible si `opencode.password` est un fichier ordinaire, sans lien, détenu par l’utilisateur du service et protégé en `0600`. Le passage du répertoire à `0770` ne prouve donc pas une panne de l’API OpenCode.

Le provisionnement d’un credential absent exige en revanche un répertoire détenu par l’utilisateur et non modifiable par le groupe ou les autres. Si DIU a remis `0770` et que le fichier manque, rétablir les permissions sûres du seul répertoire CAB, par exemple `0700`, avant le raccord explicitement autorisé à OPENCODE_PASSWORD. Préserver le credential et son mode lors des mises à jour DIU ; ne jamais afficher sa valeur. La variable reste facultative pour les projets qui n’utilisent pas OpenCode.
