---
name: approval-bridge
description: Met en place, teste et supervise le dialogue OpenCode–Codex via broker MCP stdio, contrôleur local et SSE OpenCode, sans déléguer les décisions.
---

# Codex Approval Bridge

Utiliser ce skill lorsqu’un développeur demande de mettre en place, tester, superviser ou reprendre le pilotage d’OpenCode par Codex.

## Bootstrap prioritaire du monitoring

Dès la résolution du workspace absolu canonique, appliquer intégralement
`references/monitor-service.md` du skill CAB installé, avant PLLM, santé
OpenCode et prévols modèle/MCP. Ce passage est obligatoire à chaque entrée
ou reprise de session de codage pilotée, même si le contrôleur et le superviseur
sont déjà actifs et réutilisés. Ne pas se limiter au constat d'une unité absente :
si elle est inactive ou absente dans le périmètre autorisé, installer son jeu
indépendant, puis exécuter `systemctl --user daemon-reload` et
`systemctl --user start cgpt-approval-bridge-monitor.service` séparément.
Réutiliser une instance active conforme sans modification ni redémarrage.
Vérifier service actif, GET /api/snapshot avec version 1.10.0 et identity.workspace
attendus, puis GET / ; terminer cette tentative bornée et rapporter son résultat
avant les contrôles amont. Afficher l'URL réelle uniquement après ces preuves,
sinon la cause et l'URL attendue séparément du statut CAB. Préserver configuration
et port existants, sans activation au login. Un échec PLLM ou CAB ultérieur
n'arrête pas le moniteur. Une divergence active ou un échec de monitoring ne
permet aucun arrêt, redémarrage ou changement de RUN dans les autres briques.

## RUN concurrents CAB 1.10.0

Lire [le contrat concurrent](references/concurrent-runs.md) et ORCHESTRATED_CODING.md du projet avant pilotage. Un OpenCode et un broker stdio restent partagés ; change/intention, session, job, décisions, preuves et gates sont propres au RUN. Réserver par POST /runs/reserve avant préparation et armer POST /runs/<run_id>/job/arm ; garder le checkpoint output/<prompt>/<run_id>/state.json.

Le manifeste déclare la portée ; les accès actifs sont temporaires. Les lectures compatibles coexistent, les écritures recouvrantes attendent et /locks/acquire attribue l'ensemble entier ou WAITING sans acquisition partielle. Les fichiers privés prouvés peuvent éviter l'appel de verrou partagé ; leur promotion est coordonnée si un pair les déclare.

Chaque request_validation inclut coordination_protocol=resource-scoped-v1, run_id, reservation_version, operation_id, operation_digest, resources et expected_revisions. Préparer le contenu exact, obtenir la décision, acquérir juste avant effet et conserver ask/once. Une base périmée exige une nouvelle demande. Terminer les effets natifs corrélés avant /locks/release ; aucun timeout ni idle ne libère un effet inconnu.

Valider et publier sur les ressources utiles avec /publish, sans /ready de cohorte ni réconciliation générale des pairs. Le reçu est durable ; REPORT est limité au STATISTIQUES.md propre au change. Rapport vérifié, gate, POST /runs/<run_id>/job/disarm puis /release restent requis. /cab pause|stop --run <run_id> reste ciblé ; --all demande un gel exceptionnel pour réconciliation commune, maintenance, pause ou arrêt globaux.

Installer ensemble les scripts controller, job-context, model-policy, run-steps, monitor-events, monitor-management, runs, resource-coordination, supervisor, supervisor-context, statistics, observation-statistics, statistics-maintenance, import-observations, registry-lock, SSE, healthcheck, reset, update et prompts, avec leurs noms complets cgpt-approval-bridge-*. Un jeu mixte est refusé avant permission. Le registre schéma 4 exige une maintenance explicite pour migration ; /cab update prépare le jeu puis actualise les briques actives sous maintenance partagée selon references/component-update.md ; les autres procédures ne remplacent pas un jeu actif implicitement. Aucun démarrage/reprise de RUN ne purge ou reconnecte l'infrastructure commune.

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

## Invariants

- `cgpt-validation` est un serveur MCP local `stdio` lancé par OpenCode.
- Le broker ne possède ni port MCP réseau ni serveur MCP HTTP exposé.
- Le broker relaie et persiste les demandes ; il ne décide jamais.
- Une demande porte un `requestId` stable et unique.
- Une deuxième décision pour le même `requestId` est refusée.
- Ne déclarer une étape validée qu’avec une preuve observée dans la session courante.
- `broker_readiness` est l’interface synthétique de supervision.
- `broker_health` reste réservé au diagnostic détaillé.
- Le contrôleur `../../scripts/cgpt-approval-bridge-controller.mjs` (chemin relatif à ce `SKILL.md`) s’exécute exclusivement hors sandbox avec `OC_Codex_OUTSIDE_SANDBOX=1`. L’alias historique `OC_CGPT_OUTSIDE_SANDBOX=1` reste accepté.
- Le contrôleur est géré par le service utilisateur `cgpt-approval-bridge-controller.service`, avec `Restart=on-failure` pendant son exécution. `/cab start` installe ses ressources sans l'activer, puis le démarre explicitement ; `/cab stop` l'arrête. Ne pas utiliser un processus éphémère ou un `nohup` pour un RUN CAB.
- Le contrôleur n'écoute que `127.0.0.1` ou `::1`, avec `127.0.0.1` par défaut.
- OpenCode est observé indépendamment via son SSE HTTP direct.
- Après reconnexion SSE ou divergence, réconcilier l’état réel par HTTP auprès d’OpenCode.
- Les validations normales passent par MCP stdio.
- L’état `GET /mcp` du serveur OpenCode est la source de vérité de connexion MCP pour les sessions persistantes ; une sortie CLI ne peut pas s’y substituer.
- Une réinitialisation globale exclusive CAB purge entièrement son ancien état technique et crée une nouvelle session maîtresse après confirmation de `cgpt-validation: connected`. La réutilisation d'une session concerne seulement la reprise du même RUN. Tous les mandats passent par `POST /session/<id>/message` et restent observables dans OpenCode.
- Chaque opération OpenCode nécessitant une permission native constitue un mandat unitaire. Avant cette opération, l’agent soumet `request_validation` avec l’identifiant de session, le répertoire cible et exactement un fichier relatif ou une commande complète. Le contrôleur ne transmet `once` qu’après une décision CAB `approved` explicite et corrélée à ce mandat unique ; cette décision est consommée après une seule permission native correspondante.
- La fin d’un tour OpenCode ne constitue pas la fin du job : conserver la boucle de pilotage et transmettre le mandat suivant dans la même session jusqu’à un état terminal explicite.
- Ne jamais lire, journaliser ou afficher de secret.
- Une interdiction de fermer ou redémarrer OpenCode vise son processus et
  l’interface visible. Elle ne prohibe pas une authentification fournisseur
  explicitement autorisée, son stockage privé standard par OpenCode, ni un
  rechargement interne via `POST /instance/dispose`. Le secret reste hors du
  broker, du modèle, des sorties et des sources. Attendre la fin du mandat
  courant, préserver le processus et la session, puis réconcilier santé, MCP,
  `broker_readiness` réel et test CAB avant de reprendre le pilotage.

## Rôle non déléguable de l’orchestrateur

L’orchestrateur Codex pilote la session de codage persistante depuis `/cab start`
jusqu’à son état terminal explicite. Il fixe les mandats, observe leur exécution,
contrôle leurs résultats et décide de la poursuite, de la correction, du refus,
de la suspension ou de la clôture du job.

Il est l’unique validateur opérationnel de chaque décision de la session. Toute
édition, commande Bash ou système, commande OpenSpec, test à effet de bord,
correction ou opération d’archivage OpenSpec fait l’objet d’un mandat unitaire
soumis à son examen et à sa décision explicite, corrélée et visible dans la
session persistante. Le feu vert initial du développeur autorise ce pilotage ;
il ne remplace jamais les décisions de l’orchestrateur.

L’agent de codage réalise les mandats validés, mais ne les autorise pas lui-même
et ne décide ni d’un élargissement de périmètre ni d’un archivage OpenSpec.
CAB est un transport neutre : il ne décide jamais. Après une décision
`approved` de l’orchestrateur, il ne fait que transmettre cette décision à
l’unique permission native OpenCode corrélée.

L’archivage OpenSpec est un mandat distinct. L’orchestrateur ne l’approuve
qu’après avoir vérifié les critères d’acceptation, les validations applicables,
la cohérence entre implémentation, spécifications et cadrages, ainsi que
l’absence de blocage connu. Cette décision clôt le cycle OpenSpec ciblé ; elle
ne vaut jamais autorisation d’archiver un autre changement.

## Cadences de pilotage et attente PLLM

Traiter les événements SSE OpenCode en temps réel et contrôler les demandes
et les rapports toutes les 3 secondes dans la boucle de pilotage. Pendant
l'analyse ou la rédaction de l'agent de codage, utiliser des pauses fixes de
7 secondes entre deux vérifications de progression. Ces pauses ne ralentissent
ni le SSE ni le contrôle CAB toutes les 3 secondes. Les temporisations
techniques du superviseur, des heartbeats et des rappels du broker restent
distinctes.

Après un échec du benchmark PLLM, conserver le même RUN en attente non terminale
et retenter le benchmark toutes les 30 minutes (1 800 secondes), indéfiniment,
sans limite de tentatives, jusqu'à reprise sûre du RUN ou arrêt explicite du
développeur. Calculer la prochaine échéance depuis l'échec observé de la dernière
tentative. Conserver dans le checkpoint non secret le RUN, les horodatages,
causes, résultats et la prochaine échéance. Après interruption, conserver cette
échéance et réconcilier toute tentative en cours ou d'effet inconnu avant de
retenter. Ne jamais lancer de tentatives simultanées ou dupliquer un essai
non réconcilié. Maintenir la supervision sans attente bloquante de trente
minutes ; ce seul échec ne clôture pas le RUN et ne ferme ni ne redémarre les
processus.

Après une réussite observée, réconcilier les contextes, la santé OpenCode, MCP,
la readiness CAB réelle et les permissions avant reprise. Si la reprise n'est
pas sûre, appliquer la récupération CAB et conserver sa cause observable.
La réussite du benchmark ne vaut jamais approbation, ne rejoue aucun mandat
consommé et ne contourne aucun blocage CAB distinct.

Prévoir les sondes statistiques toutes les 30 minutes, en complément des
sondes initiale et finale. Poursuivre le travail entre les échéances, sans
arrêter le travail pour attendre un créneau. Signaler les relèves manquées
sans reconstruction rétroactive. Une sonde statistique échouée reste distincte
d'un échec du benchmark PLLM et ne suspend pas, à elle seule, le RUN.

## Compactage coordonné toutes les 1 h 30

Toutes les 5 400 secondes, terminer le mandat autorisé en cours, traiter son
rapport et sauvegarder un checkpoint non secret. Vérifier les API natives
réellement exposées pour les deux sessions actives. Si les deux sont
disponibles, déclencher leurs compactages en parallèle sous un identifiant
commun et observer leurs fins natives corrélées. Sinon, compacter seulement
les sessions dont l'API est disponible et tracer les opérations non exécutées.

Une API absente ou un échec conserve le cycle incomplet avec sa cause ; ne
déclarer une réussite conjointe qu'avec les deux preuves natives. Un accusé de
lancement, un résumé manuel ou une session auxiliaire ne remplace pas ces
preuves. Après réconciliation des contextes, de la santé OpenCode, de MCP,
de la readiness CAB et des permissions, poursuivre les mandats autorisés si
l'état réel permet une reprise sûre, même si le compactage reste incomplet.
Une API de compactage absente ne signifie pas une perte de contexte : utiliser
la conversation active, le checkpoint et les preuves disponibles pour vérifier
la continuité. Signaler les identifiants non exposés sans en inventer.

L'indisponibilité ou l'échec du compactage ne suffit jamais, à lui seul, à
classer le RUN `BLOQUÉ`, arrêter CAB, demander une dérogation au développeur ou
différer les statistiques. Un compactage encore en cours ou un contexte perdu,
un mandat ambigu ou une permission non corrélée suspend les opérations
concernées selon les règles CAB habituelles. Ne pas relancer aveuglément un
compactage dont l'effet est inconnu ni attendre une API absente : réexaminer
sa disponibilité à l'échéance suivante, calculée depuis le cycle courant.
Ce mécanisme ne change pas le modèle, ne rejoue pas de mandat et ne ferme ni
ne redémarre les processus des agents.

## Statistiques obligatoires à chaque archivage

Les agrégats /statistics et /runs/<runId>/statistics préparent un brouillon individuel à six sections. Les consultations de fenêtres et imports sont décrits dans references/concurrent-runs.md. Préparer pendant le travail, publier avec les accès ciblés et finaliser le rapport après libération des protections métier. Les anciennes /integration et /integration-request sont refusées dans le profil 1.10.0 ; /publish fournit le reçu durable et l'entrée éventuelle en REPORT. Le rapport vérifié reste obligatoire avant gate et livraison, avec un mandat distinct pour ce seul fichier et N/A motivés pour les mesures absentes.

Charger le skill voisin `../coding-session-statistics/SKILL.md` dès le début
de chaque change piloté. Préparer ses relevés de quota et ses sondes avant le
premier travail ; conserver l'identité de la session, le change et les bornes.
La lecture des quotas utilise directement l'outil natif Codex, sans skill
`cgpt` externe. Toute donnée inaccessible reste `N/A` avec sa cause.

Inscrire dans les critères de fin du job la preuve de publication de
`openspec/changes/archive/<archive>/STATISTIQUES.md` après chaque archivage.
Après la preuve d'un archivage autorisé et réussi, obtenir le relevé final
et la fin de l'intervalle, puis faire produire le rapport par un mandat
d'édition distinct. Vérifier ses six sections, ses totaux, son encodage
UTF-8/LF et son existence avant de demander la clôture normale `TERMINÉ`.
Pour un lot, exiger un rapport par archive avec ses bornes et son périmètre.

Si l'archivage échoue, le rapport final après archivage reste en attente. Si
le rapport échoue après archivage, signaler le cycle incomplet et reprendre
le rapport avec un nouveau mandat sans réarchiver. Une donnée absente ne
dispense pas du rapport ; ne jamais inventer de mesure. Le broker et le
contrôleur restent neutres et ne produisent pas ce document à la place des
agents. Cette obligation ne remplace pas l'autorisation d'archivage.

## Environnement Pixs / Devops

- Sur l’hôte Devops, OpenSpec est installé sous `/home/devops/.local/npm/bin/openspec`.
- Dans le conteneur OpenCode, ce répertoire peut être monté sous `/opt/devops/npm`.
- Utiliser les chemins explicites prévus par l’environnement au lieu de déduire l’absence d’OpenSpec depuis le seul `PATH`.

## Ordre de mise en place

Après le bootstrap prioritaire du monitoring, avant une réinitialisation globale exclusive, appliquer intégralement la
[procédure de purge](references/session-reset.md). Elle est obligatoire quel
que soit l'ancien état, y compris en présence de conflits Syncthing. Le script
`../../scripts/cgpt-approval-bridge-reset.py` est fourni par ce plugin.
Une reprise ordinaire du même RUN conserve son état et commence par la
réconciliation. Un prévol de récupération divergent conserve la candidate,
le job et le runtime selon la procédure ci-dessous, sans purge ni renouvellement.

1. Vérifier `GET /global/health` d’OpenCode.
2. Vérifier que `cgpt-validation` est déclaré comme MCP local `stdio`.
3. Vérifier `GET /mcp` et exiger `cgpt-validation: connected`.
4. Si ce statut est absent ou en échec, exécuter seulement la récupération contrôlée `POST /instance/dispose`, puis attendre `/global/health` et `/mcp` sains. Ne jamais tuer ou lancer directement le broker, qui appartient à OpenCode.
5. Relever par API, pour l’agent de codage ciblé, le fournisseur, le modèle et le niveau de raisonnement effectivement configurés. Vérifier que le fournisseur et le modèle sont publiés par OpenCode sans lire de secret.
6. Créer une session de prévol temporaire sans outil ni accès au projet, lui adresser une requête inoffensive en imposant exactement ces paramètres et vérifier la réponse ainsi que ses métadonnées observées. Fermer la session temporaire après le contrôle.
7. Si la réponse, le fournisseur, le modèle ou le raisonnement est absent ou divergent, publier `CAB_INACTIF` avec la cause et ne créer ni session persistante ni contrôleur. Ne jamais corriger la configuration à la place du développeur.
8. Installer ou actualiser les ressources utilisateur du contrôleur et du superviseur sans `systemctl --user enable`, puis démarrer ou réutiliser explicitement le service `cgpt-approval-bridge-controller.service`, qui exécute `../../scripts/cgpt-approval-bridge-controller.mjs` hors sandbox avec `OC_Codex_OUTSIDE_SANDBOX=1` (ou l’alias historique `OC_CGPT_OUTSIDE_SANDBOX=1`). Vérifier qu'il est actif et que son redémarrage sur échec est actif.
9. Vérifier le statut local du contrôleur.
10. Démarrer explicitement `cgpt-approval-bridge-supervisor.service` après le contrôleur, sans activation au login. Vérifier son statut local et `Restart=on-failure` ; il supervise le job sans créer de décision ni de session de remplacement.
11. Démarrer ou maintenir le SSE direct OpenCode.
12. Créer une nouvelle session maîtresse pour un nouveau RUN via `POST /session` ; réutiliser la session seulement pour une reprise du même RUN. Conserver son identifiant et adresser tous les mandats par `POST /session/<id>/message`.
13. Appeler `broker_readiness` dans cette session, sans accès au projet.
14. Interpréter `READY`, `DEGRADED`, `BLOCKED` ou `HUMAN_REQUIRED`.
15. Réconcilier l’état OpenCode via HTTP après chaque reconnexion ou divergence, puis revalider `/mcp` avant tout mandat.
16. Vérifier qu’aucune approbation parasite n’est en attente.
17. Tester `request_validation` avec un `requestId` inédit dans la session persistante.
18. Rendre une décision Codex explicite unique.
19. Vérifier la réponse MCP corrélée reçue par OpenCode dans cette session.
20. Créer le heartbeat de trente secondes uniquement après validation complète.

## Mandats unitaires d’un job piloté

Le contrat de job fixe seulement l’objectif, les critères de fin et les
limites fonctionnelles. Il ne vaut jamais approbation d’écriture ou de
commande.

Avant chaque action qui déclenche une permission native OpenCode, soumettre un
nouveau `request_validation` avec un `requestId`, un `approval_id`, un
`change_id`, l’identifiant de la session, son répertoire cible et un résumé
compréhensible. Le mandat contient exactement l’un des deux objets suivants :

- un seul chemin relatif dans `files` et une liste `commands` vide pour une édition ;
- une liste `files` vide et une seule commande complète dans `commands` pour Bash ou OpenSpec.

Ne jamais grouper plusieurs fichiers, commandes, glob, préfixe ou commande
implicite. Attendre la décision explicite et corrélée de Codex. Si elle est
`approved`, CAB transmet cette unique décision à la permission native
correspondante et la consomme. Une seconde permission, même identique, exige
un nouveau mandat. Une demande non corrélée, `rejected`,
`needs_clarification`, `BLOCKED`, `HUMAN_REQUIRED` ou divergente suspend le
job et reste signalée dans la session persistante.

## Readiness

`broker_readiness` doit être utilisé avant tout test actif.

Interprétation :

- `READY` : pilotage nominal.
- `DEGRADED` : pilotage potentiellement poursuivable si l’action reste sûre ; afficher la cause et l’action recommandée.
- `BLOCKED` : arrêter le test ou le pilotage actif concerné.
- `HUMAN_REQUIRED` : suspendre la partie concernée et demander l’intervention humaine requise.

Ne reconstruis pas toi-même une seconde logique de diagnostic si `broker_readiness` fournit déjà :
- `root_cause` ;
- `recommended_action` ;
- `controller_reachable` ;
- `pending_count` ;
- `stalled_count` ;
- `auto_recovery_available`.

## Restitution

Présenter chaque résultat sur une ligne :

`✅ étape — preuve`

ou

`⚠️ étape — cause précise`

Une connexion déclarée par une API ne suffit pas.
Le broker doit être interrogé par `broker_readiness`, puis le test MCP actif doit confirmer le chemin de bout en bout.

## Changement de modèle OC

Avant de modifier le modèle d’un agent OC :

1. Vérifier que le fournisseur et le modèle ciblés sont publiés par l’API OpenCode, sans lire de secret.
2. Exécuter une requête OC temporaire, sans outil ni accès aux fichiers.
3. N’appliquer le changement qu’après une réponse modèle observée.
4. Si le test échoue, ne pas modifier la configuration.
5. Après changement, vérifier le fournisseur, le modèle et le niveau de raisonnement réellement utilisés.

## Arrêt

- Avant tout arrêt normal, demander `POST /runs/<run_id>/job/terminal-gate` avec l'état explicite `TERMINÉ` ou `BLOQUÉ`. Si le gate est refusé, conserver le job ouvert et reprendre le pilotage ou signaler le blocage ; après validation, désarmer le contrat correspondant par `POST /runs/<run_id>/job/disarm`.
- Supprimer les heartbeats et healthchecks créés par `/cab`.
- Fermer les clients SSE créés par `/cab`.
- Arrêter explicitement le superviseur démarré par `/cab`, puis le contrôleur, avec `systemctl --user stop` sur leurs services respectifs. Conserver les unités installées et inactives, sans les désactiver ni les supprimer.
- Préserver `cgpt-approval-bridge-monitor.service`, sa configuration et ses connexions propres ; le moniteur reste disponible après `/cab stop`. Son arrêt requiert une demande explicite distincte.
- Ne pas arrêter directement `cgpt-validation` : il est géré par OpenCode.
- Ne pas fermer OpenCode ni son conteneur sans instruction explicite.

Cette procédure normale reste distincte d'un arrêt forcé explicitement demandé
par le développeur. Un prévol de récupération divergent ne permet aucun
abandon implicite de job ; un arrêt ciblé explicitement demandé par le
développeur suit la procédure distincte décrite ci-dessous.


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


## Remédiation humaine du prévol exécuté sans once

Cette exception exige l'accord spécifique du développeur ; elle ne découle
jamais du feu vert initial. Si `/usr/bin/true` a été approuvé puis exécuté sous
`tools.bash=true` sans permission native `once`, conserver la candidate et les
preuves. Après rétablissement natif de `bash: ask`, demander explicitement
`POST /runs/<run_id>/job/recover` avec `phase: "reconcile"`, les mêmes job,
ancienne session, candidate et recoveryId, `previousPreflightRequestId`, un
`preflightRequestId` inédit et `developerAuthorization` (référence non secrète
de l'accord humain). Aucun autre outil ou commande exécuté n'est admissible.
Le contrôleur vérifie les preuves natives, conserve l'ancien essai invalide
et son empreinte, puis réserve le nouveau. Après redémarrage coordonné, cette
phase ne reconstruit aucune décision locale perdue. `complete` exige encore
un nouveau prévol intégral avec décision et permission `once` propres.
Le retry ordinaire d'une décision approved reste interdit.

Pour OpenCode 1.19.0, `tools.bash=true` donne `allow`. Précharger le cadrage
avec `noReply`, rétablir `ask` par PATCH natif et le vérifier avant génération.
Envoyer ensuite les mandats exécutables sans champ `tools`. Les analyses en
lecture seule continuent à désactiver explicitement leurs outils mutables.

## Environnements Docker/LXC réservés par change

Avant la préparation de tests conteneurisés, appliquer la section « Environnements de test Docker et LXC » de [references/concurrent-runs.md](references/concurrent-runs.md). Vérifier `test-resources-v1`, déclarer les identités non secrètes canoniques, acquérir l'ensemble avant les commandes et conserver la réservation jusqu'au nettoyage et à la vérification de restitution corrélés. Une fin de commande, un délai ou STOP ne libère rien. Après restauration, réconcilier sans rejouer once. Chaque commande garde sa permission unitaire ; aucune réservation ne vaut approbation.

Les navigateurs externes de test déclarés dans DEVOPS.md, actuellement Chromium et Firefox, suivent aussi ce cycle avec les clés `browser:<hôte>/<navigateur>`. La réservation reste détenue jusqu'à fermeture des sessions WebDriver/BiDi et processus, libération des ports et profils temporaires du change, nettoyage puis vérification distincts. Les sessions utilisateur préexistantes sont préservées. Les ensembles navigateur/conteneur sont acquis atomiquement ; des mécanismes indépendants peuvent avancer.

## Modèle du prompt et PLLM automatique

Avant un nouveau job piloté 1.10.0, appliquer intégralement references/model-policy.md après le bootstrap du monitoring. Un modèle concret explicite reste prioritaire. Sinon, utiliser la PLLM automatique actuelle ; sans raisonnement explicite, high puis xhigh puis politique de priorité inférieure. Un modèle explicite incompatible bloque. Résoudre OC_Codex_PLLM_CATALOG depuis le skill actif et négocier pllm-auto-v1 ; armer avec modelSelection et la preuve native modelPreflight du prévol exact. Vérifier codingModel dans le job. Une reprise conserve ce choix sans bascule ni low implicite. Les anciens jobs non négociés restent historiques. Le broker et le moniteur ne choisissent pas de LLM.
