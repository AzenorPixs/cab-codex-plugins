---
name: CAB
description: Met en place, teste et supervise le dialogue OpenCode–Codex via broker MCP stdio, contrôleur local et SSE OpenCode, sans déléguer les décisions.
---

# CAB — Codex Approval Bridge

Utiliser ce skill lorsqu’un développeur demande de mettre en place, tester, superviser ou reprendre le pilotage d’OpenCode par Codex.

## Problèmes de codage et coordination du correctif CAB

Appliquer [le suivi des incidents CAB](references/coding-incidents.md) dès tout
problème rencontré pendant le codage avec CAB. Transmettre au chat
**« Correctif CAB - OC »**, le réutiliser ou le créer après absence vérifiée,
et maintenir la coordination jusqu’au correctif et à l’activation vérifiée par
CABU, puis informer les sessions concernées. Si ce chat est le chat courant,
consigner directement le signalement. Conserver les mandats, preuves et
permissions ; aucun signalement ne vaut décision ni relance automatique.

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
Vérifier service actif, GET /api/snapshot avec version 2.1.27 et identity.workspace
attendus, puis GET / ; terminer cette tentative bornée et rapporter son résultat
avant les contrôles amont. Afficher l'URL réelle uniquement après ces preuves,
sinon la cause et l'URL attendue séparément du statut CAB. Préserver configuration
et port existants, sans activation au login. Un échec PLLM ou CAB ultérieur
n'arrête pas le moniteur. Une divergence active ou un échec de monitoring ne
permet aucun arrêt, redémarrage ou changement de RUN dans les autres briques.

## RUN concurrents CAB 2.1.27

Lire [le contrat concurrent](references/concurrent-runs.md) et ORCHESTRATED_CODING.md du projet avant pilotage. Un OpenCode et un broker stdio restent partagés ; change/intention, session, job, décisions, preuves et gates sont propres au RUN. Réserver par POST /runs/reserve avant préparation et armer POST /runs/<run_id>/job/arm ; garder le checkpoint output/<prompt>/<run_id>/state.json.

Le manifeste déclare la portée ; les accès actifs sont temporaires. Les lectures compatibles coexistent, les écritures recouvrantes attendent et /locks/acquire attribue l'ensemble entier ou WAITING sans acquisition partielle. Les fichiers privés prouvés peuvent éviter l'appel de verrou partagé ; leur promotion est coordonnée si un pair les déclare.

Chaque request_validation inclut coordination_protocol=resource-scoped-v1, run_id, reservation_version, operation_id, operation_digest, resources et expected_revisions. Préparer le contenu exact, obtenir la décision, acquérir juste avant effet et conserver ask/once. Une base périmée exige une nouvelle demande. Terminer les effets natifs corrélés avant /locks/release ; aucun timeout ni idle ne libère un effet inconnu.

Valider et publier sur les ressources utiles avec /publish, sans /ready de cohorte ni réconciliation générale des pairs. Le reçu est durable ; REPORT est limité au STATISTICS.md propre au change. Rapport vérifié, gate, POST /runs/<run_id>/job/disarm puis /release restent requis. /CAB pause|stop --run <run_id> reste ciblé ; --all demande un gel exceptionnel pour réconciliation commune, maintenance, pause ou arrêt globaux.

Installer ensemble les scripts controller, job-context, model-policy, prepare-model-policy, run-steps, monitor-events, monitor-management, runs, resource-coordination, supervisor, supervisor-context, statistics, observation-statistics, statistics-maintenance, import-observations, registry-lock, SSE, healthcheck, client OpenCode V2, reset, update et prompts, avec leurs noms complets cgpt-approval-bridge-*. Le manifeste doit référencer le répertoire skills distribué ; approval-bridge doit porter `references/component-update.md`, la référence utilisée par l'updater. Un jeu mixte est refusé avant permission.

## Mise à jour forcée CAB 2.1.27

`/CAB update` est la procédure unique. `/CABU` sans argument charge le fichier
frère `CAB.md` de même version et lui transmet exactement `update` ; ne duplique
pas la procédure dans CABU. Cette référence décrit l'updater
`scripts/cgpt-approval-bridge-update.mjs` distribué par le plugin.

La procédure canonique prend GitHub `AzenorPixs/cab-codex-plugins`, branche
`main`, comme référence de version des plugins CAB/CABU, des quatre briques et
des commandes. Elle vérifie le jeu distant avant maintenance, même si la
marketplace est locale. Un accès distant impossible ou un jeu incohérent
arrête la préparation ; une installation locale exige une demande explicite.

Après validation et sauvegarde du jeu, l'updater ne consulte aucun état de RUN,
permission, coordination globale ou service systemd comme précondition. Il
arrête systématiquement les unités controller, supervisor et monitor, remplace
atomiquement les fichiers des quatre briques, recharge systemd puis démarre
systématiquement les trois unités. Il n'active aucune unité au login. Les RUN,
permissions et autres états CAB ne sont ni suspendus, ni réconciliés, ni
modifiés par cette procédure.

OpenCode reste ouvert. S'il est actif, l'updater recharge le broker par les
routes natives V2 et exige une readiness fraîche portant la version cible.
Un échec de vérification interdit le succès. Seule l'absence prouvée
d'OpenCode permet `INDISPONIBLE` pour la version chargée du broker.
Le bilan sépare versions du paquet, fichiers déployés et processus observés.

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
- Le contrôleur est géré par le service utilisateur `cgpt-approval-bridge-controller.service`, avec `Restart=on-failure` pendant son exécution. `/CAB start` installe ses ressources sans l'activer, puis le démarre explicitement ; `/CAB stop` l'arrête. Ne pas utiliser un processus éphémère ou un `nohup` pour un RUN CAB.
- Le contrôleur n'écoute que `127.0.0.1` ou `::1`, avec `127.0.0.1` par défaut.
- OpenCode est observé indépendamment via son SSE HTTP direct.
- Après reconnexion SSE ou divergence, réconcilier l’état réel par HTTP auprès d’OpenCode.
- Les validations normales passent par MCP stdio.
- L’état `GET /api/mcp` du serveur OpenCode est la source de vérité de connexion MCP pour les sessions persistantes ; une sortie CLI ne peut pas s’y substituer.
- Une réinitialisation globale exclusive CAB purge entièrement son ancien état technique et crée une nouvelle session maîtresse après confirmation de `cgpt-validation: connected`. La réutilisation d'une session concerne seulement la reprise du même RUN. Tous les mandats passent par `POST /api/session/<id>/prompt` et restent observables dans OpenCode.
- Chaque opération OpenCode nécessitant une permission native constitue un mandat unitaire. Avant cette opération, l’agent soumet `request_validation` avec l’identifiant de session, le répertoire cible et exactement un fichier relatif ou une commande complète. Le contrôleur ne transmet `once` qu’après une décision CAB `approved` explicite et corrélée à ce mandat unique ; cette décision est consommée après une seule permission native correspondante.
- La fin d’un tour OpenCode ne constitue pas la fin du job : conserver la boucle de pilotage et transmettre le mandat suivant dans la même session jusqu’à un état terminal explicite.
- Ne jamais lire, journaliser ou afficher de secret.
- Une interdiction de fermer ou redémarrer OpenCode vise son processus et
  l’interface visible. Le protocole V2 ne s'appuie pas sur `/instance/dispose`.
  Le secret Basic Auth reste hors du broker, du modèle, des sorties et des
  sources. Préserver le processus et la session, puis réconcilier `/api/info`,
  `/api/mcp`, `broker_readiness` réel et test CAB avant de reprendre le pilotage.

## Rôle non déléguable de l’orchestrateur

L’orchestrateur Codex pilote la session de codage persistante depuis `/CAB start`
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

Les agrégats /statistics et /runs/<runId>/statistics préparent un brouillon individuel à six sections. Les consultations de fenêtres et imports sont décrits dans references/concurrent-runs.md. Préparer pendant le travail, publier avec les accès ciblés et finaliser le rapport après libération des protections métier. Les anciennes /integration et /integration-request sont refusées dans le profil 1.10.10 ; /publish fournit le reçu durable et l'entrée éventuelle en REPORT. Le rapport vérifié reste obligatoire avant gate et livraison, avec un mandat distinct pour ce seul fichier et N/A motivés pour les mesures absentes.

Charger le skill voisin `../coding-session-statistics/SKILL.md` dès le début
de chaque change piloté. Préparer ses relevés de quota et ses sondes avant le
premier travail ; conserver l'identité de la session, le change et les bornes.
La lecture des quotas utilise directement l'outil natif Codex, sans skill
`cgpt` externe. Toute donnée inaccessible reste `N/A` avec sa cause.

Inscrire dans les critères de fin du job la preuve de publication de
`openspec/changes/archive/<archive>/STATISTICS.md` après chaque archivage.
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

## Environnement DevOps

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

1. Vérifier `GET /api/info` d’OpenCode avec Basic Auth, une version majeure 2 et un schéma V2 valide.
2. Vérifier que `cgpt-validation` est déclaré comme MCP local `stdio`.
3. Vérifier `GET /api/mcp` dans la location demandée et exiger `cgpt-validation: connected`.
4. Si ce statut est absent ou en échec, tenter uniquement les routes V2 documentées de reconnexion de ce serveur MCP puis relire `/api/mcp`. Ne jamais appeler `/instance/dispose`, tuer ou lancer directement le broker, qui appartient à OpenCode.
5. Relever par API, pour l’agent de codage ciblé, le fournisseur, le modèle et le niveau de raisonnement effectivement configurés. Vérifier que le fournisseur et le modèle sont publiés par OpenCode sans lire de secret.
6. Créer une session de prévol temporaire sans outil ni accès au projet, lui adresser une requête inoffensive en imposant exactement ces paramètres et vérifier la réponse ainsi que ses métadonnées observées. Fermer la session temporaire après le contrôle.
7. Si la réponse, le fournisseur, le modèle ou le raisonnement est absent ou divergent, publier `CAB_INACTIF` avec la cause et ne créer ni session persistante ni contrôleur. Ne jamais corriger la configuration à la place du développeur.
8. Installer ou actualiser les ressources utilisateur du contrôleur et du superviseur sans `systemctl --user enable`, puis démarrer ou réutiliser explicitement le service `cgpt-approval-bridge-controller.service`, qui exécute `../../scripts/cgpt-approval-bridge-controller.mjs` hors sandbox avec `OC_Codex_OUTSIDE_SANDBOX=1` (ou l’alias historique `OC_CGPT_OUTSIDE_SANDBOX=1`). Vérifier qu'il est actif et que son redémarrage sur échec est actif.
9. Vérifier le statut local du contrôleur.
10. Démarrer explicitement `cgpt-approval-bridge-supervisor.service` après le contrôleur, sans activation au login. Vérifier son statut local et `Restart=on-failure` ; il supervise le job sans créer de décision ni de session de remplacement.
11. Démarrer ou maintenir le SSE authentifié `GET /api/event`.
12. Créer une nouvelle session maîtresse pour un nouveau RUN via `POST /api/session` ; réutiliser la session seulement pour une reprise du même RUN. Conserver son identifiant et adresser tous les mandats par `POST /api/session/<id>/prompt`.
13. Appeler `broker_readiness` dans cette session, sans accès au projet.
14. Interpréter `READY`, `DEGRADED`, `BLOCKED` ou `HUMAN_REQUIRED`.
15. Réconcilier l’état OpenCode via HTTP après chaque reconnexion ou divergence, puis revalider `/api/mcp` avant tout mandat.
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
- Supprimer les heartbeats et healthchecks créés par `/CAB`.
- Fermer les clients SSE créés par `/CAB`.
- Arrêter explicitement le superviseur démarré par `/CAB`, puis le contrôleur, avec `systemctl --user stop` sur leurs services respectifs. Conserver les unités installées et inactives, sans les désactiver ni les supprimer.
- Préserver `cgpt-approval-bridge-monitor.service`, sa configuration et ses connexions propres ; le moniteur reste disponible après `/CAB stop`. Son arrêt requiert une demande explicite distincte.
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
avant retry. Un timeout seul ne prouve ni divergence ni refus et ne déclenche
aucun gel supplémentaire : rechercher la décision sur le même `approval_id`.
Le gel déjà établi par un prévol divergent ou incomplet reste soumis aux
preuves exigées pour retry et complete. Une erreur générique, un polling
divergent, une commande ou un autre outil natif exige la réconciliation ou
l'autorité indispensable, sans lever ce gel existant.

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

## Mandats d’inventaire ou d’analyse en lecture seule — OpenCode V2

Attendre l’inactivité de la seule session ciblée, puis utiliser
`PATCH /api/session/{sessionID}` avec ses règles `permissions`. Interdire les
actions natives `shell` et `edit` (cette dernière protège aussi `write`), ainsi
que les délégations et skills non autorisés. Exemple de règles de refus à
intégrer sans perdre les restrictions existantes :

```json
{"permissions":[{"action":"shell","resource":"*","effect":"deny"},{"action":"edit","resource":"*","effect":"deny"},{"action":"subagent","resource":"*","effect":"deny"},{"action":"skill","resource":"*","effect":"deny"}]}
```

Relire `GET /api/session/{sessionID}` et vérifier les dernières règles
applicables avant le prompt. Conserver uniquement les lectures et recherches
autorisées par le mandat. Le texte « lecture seule » ne remplace pas les
permissions ; ne pas reprendre un exemple V1 `tools`/`noReply` dans un prompt V2.
Aucune configuration persistante OpenCode n’est modifiée.

## Réactivation sûre des outils — OpenCode V2

Avant une opération, attendre l’inactivité puis rétablir par PATCH les seules
actions nécessaires à `ask`, de portée `*`, en conservant les autres refus.
Relire la session et vérifier la dernière règle applicable pour `shell`
(normalisé `bash` par CAB) ou `edit`, y compris les noms à jokers. Une règle
spécifique ultérieure ou une preuve absente suspend le mandat.

Envoyer ensuite le prompt V2 `{text, resume: true}` sans champ `tools` ni
réécriture de permission. L’activation d’un outil ne constitue aucune décision
CAB : chaque opération exige sa demande corrélée, son accès et sa permission
`once`. Le contrôleur recontrôle `ask` avant admission, décision `approved` et
transmission de `once`. Les diagnostics `native-permission-ask-required`,
`native-permission-control-unavailable`, `native-permission-context-divergent`
et `preflight-native-ask-required` restent bloquants. Une modification externe
des règles après contrôle n’est pas atomique avec l’exécution native.

## Édition partielle native OpenCode 2.2

Le banc privé CAB qualifie un outil natif direct `edit`, présenté au modèle
avec cette signature :

```json
{"path":"/chemin/absolu/du/fichier","oldString":"texte exact et unique","newString":"texte de remplacement","replaceAll":false}
```

`path`, `oldString` et `newString` sont requis ; `replaceAll` est facultatif,
faux par défaut. `oldString` et `newString` doivent différer. Si le texte
ancien apparaît plusieurs fois, ajouter le contexte permettant un match unique ;
ne pas activer `replaceAll` sans revue explicite de toutes les occurrences.
Lire le fichier dans le périmètre autorisé et revoir le remplacement exact,
son empreinte avant/après et sa cible unique avant la décision CAB.

Appeler `edit` directement comme outil natif exposé au modèle. `search` dans
Code Mode explore le catalogue Code Mode (MCP et helpers internes annoncés) ; son résultat, même vide, ne démontre pas
l’absence d’un outil natif. Ne pas inventer `tools.edit` ou un outil `apply_patch`
non exposé. Distinguer catalogue natif réellement transmis au modèle, catalogue
MCP, règles de permissions et texte du prompt. Si le modèle n’appelle pas
l’outil exposé, corriger le mandat ou qualifier le modèle avant de conclure à
une absence runtime ; un repli shell exige sa propre commande et décision CAB.

La preuve positive qualifiée lie demande CAB d’un fichier, décision explicite,
accès d’écriture, permission native `edit` de source vérifiée, `once`, fin native
et contenu exact. Le refus natif et le remplacement ambigu sont qualifiés sans
écriture. Cette qualification utilise OpenCode privé et fournisseur synthétique ;
elle ne prouve pas le choix d’outil d’un modèle réel ni une activation CABU.

## Supervision entre deux mandats

Pour un RUN piloté sans `currentCabMandate`, le superviseur publie `WAITING`
avec `orchestrator-mandate-required`. L’orchestrateur examine cet état puis
prépare le mandat suivant ; aucun prompt automatique n’est envoyé au codeur.
Un gate `OPEN`, une récupération achevée ou une échéance de 60 secondes
n’autorisent ni commande, ni lecture, ni édition. Un mandat déjà déclaré et
les gardes de pause, récupération, permissions et accès restent prioritaires.


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

OpenCode V2 n'accepte pas le champ V1 `tools` dans le corps d'un prompt. CAB
vérifie donc les règles natives V2 de la session et n'envoie jamais d'instruction
V1. Si une reprise héritée exige une preuve du champ `tools` que le transcript
V2 n'expose pas, CAB conserve le job et refuse la réconciliation sans inférer
une autorisation ou une exécution.

## Environnements Docker/LXC réservés par change

Avant la préparation de tests conteneurisés, appliquer la section « Environnements de test Docker et LXC » de [references/concurrent-runs.md](references/concurrent-runs.md). Vérifier `test-resources-v1`, déclarer les identités non secrètes canoniques, acquérir l'ensemble avant les commandes et conserver la réservation jusqu'au nettoyage et à la vérification de restitution corrélés. Une fin de commande, un délai ou STOP ne libère rien. Après restauration, réconcilier sans rejouer once. Chaque commande garde sa permission unitaire ; aucune réservation ne vaut approbation.

Les navigateurs externes de test déclarés dans DEVOPS.md, actuellement Chromium et Firefox, suivent aussi ce cycle avec les clés `browser:<hôte>/<navigateur>`. La réservation reste détenue jusqu'à fermeture des sessions WebDriver/BiDi et processus, libération des ports et profils temporaires du change, nettoyage puis vérification distincts. Les sessions utilisateur préexistantes sont préservées. Les ensembles navigateur/conteneur sont acquis atomiquement ; des mécanismes indépendants peuvent avancer.

## Modèle du prompt et PLLM automatique

Avant un nouveau job piloté 2.1.27, appliquer intégralement references/model-policy.md après le bootstrap du monitoring. Un modèle concret explicite reste prioritaire. Sinon, utiliser la PLLM automatique actuelle ; sans raisonnement explicite, demander medium. Si medium est indisponible, demander high sur le même modèle ; examiner la politique PLLM suivante seulement si les deux niveaux sont indisponibles. Un modèle explicite incompatible bloque. Résoudre OC_Codex_PLLM_CATALOG depuis le skill actif et négocier pllm-auto-v1 ; armer avec modelSelection et la preuve native modelPreflight du prévol exact. Vérifier codingModel dans le job. Une reprise conserve le contexte et réexamine la priorité medium puis high selon la section de convergence ; aucun changement actif implicite n’est autorisé. Les anciens jobs non négociés restent historiques. Le broker et le moniteur ne choisissent pas de LLM.

La session de pilotage définit explicitement providerMaxBytes pour la lecture /provider dans /model-policy/resolve et le répète dans modelSelection à l'armement, selon references/model-policy.md du skill installé. Ce budget local en octets n'élargit ni les autres observations ni le catalogue PLLM.

Pour le raccord 2.1.27, utiliser la préparation sans effet du catalogue dans references/model-policy.md avant le démarrage autorisé, transmettre son patch au contrôleur puis vérifier /model-policy/resolve avant nouvel armement. Conserver la provenance logique et employer le fournisseur natif vérifié. Les variantes parent imbriquée/historique et assistant présent doivent rester cohérentes. Aucune activation n’est déduite de cette préparation source.

Contrat courant CABU 2.1.27 : les tolérances historiques de broker non vérifiable
ne permettent plus le succès si OpenCode est actif. Une absence prouvée est
requise pour la seule exception broker. Appliquer le contrat de coupure courte
de component-update.md ; ne prévenir ni modifier les RUN pour cet update.


### Permissions réappliquées par DIU

DIU peut remettre le répertoire `~/.config/cab-approval-bridge/` en `0770`. Dans CAB 2.1.27, la lecture du credential existant reste possible si `opencode.password` est un fichier ordinaire, sans lien, détenu par l’utilisateur du service et protégé en `0600`. Le passage du répertoire à `0770` ne prouve donc pas une panne de l’API OpenCode.

Le provisionnement d’un credential absent exige en revanche un répertoire détenu par l’utilisateur et non modifiable par le groupe ou les autres. Si DIU a remis `0770` et que le fichier manque, rétablir les permissions sûres du seul répertoire CAB, par exemple `0700`, avant le raccord explicitement autorisé à OPENCODE_PASSWORD. Préserver le credential et son mode lors des mises à jour DIU ; ne jamais afficher sa valeur. La variable reste facultative pour les projets qui n’utilisent pas OpenCode.

## Réconciliation humaine du rejet après redémarrage — 2.1.27

Après accord humain spécifique, utiliser la phase `reconcile-rejected` de
`POST /runs/<run_id>/job/recover` avec les mêmes jobId, expectedSessionId,
sessionId et recoveryId, previousPreflightRequestId courant, un
preflightRequestId inédit, developerAuthorization et rejectedPreflightProof
(nativeToolCount et nativeToolHash SHA-256 du JSON canonique des outils
natifs complets). Le contrôleur n'accepte qu'un rejet natif corrélé sans
effet et scelle un reçu non exécutable. Ne reconstruire aucune décision.

Sous gel GLOBAL_RECONCILIATION, joindre globalTransactionId exact. Après
réconciliation, confirmer puis libérer cette transaction avec authorization,
evidence et rejectedRecovery : runId, jobId, recoveryId, prochain
preflightRequestId et nativeToolHash retourné dans la dernière tentative.
Le contrôleur recontrôle le reçu, l'historique inchangé et la cohorte.
Aucun outil ne doit être envoyé entre le sceau et la libération. Toute autre
récupération non réconciliée ou effet inconnu interdit la levée. Le nouveau
prévol normal exige ensuite ask, décision, once, exit 0 et READY avant
complete. Cette voie ne remplace ni retry ni la procédure CABU.

## Raccord Code Mode OpenCode 2.2 — 2.1.27

Le client reconnaît seulement le retour direct d'un appel MCP cgpt-validation
avec objet de données littérales. Les clés peuvent être des identifiants
statiques non cités ; les valeurs restent des données JSON. Les métadonnées
toolCalls doivent concorder et la sortie ne doit pas être tronquée. CAB
n'évalue aucun programme. La découverte search reconnue reste diagnostique.
Une transformation de résultat, une variable, un calcul, un appel caché ou
une provenance fabriquée conserve une enveloppe execute bloquante. Le sceau
couvre l'enveloppe native complète et les anciens outils directs restent
stables. Les clés de provenance internes reçues dans les métadonnées sont
écartées puis produites seulement par la projection vérifiée.

OpenCode 2.2 nomme sa commande native shell. Le client conserve sa source
native et la rattache au contrat interne bash. Il vérifie l'appel source,
la commande, l'absence de background et le workdir courant avant once. Les
permissions d'écriture relatives sont rapprochées du fichier du contexte
et de l'appel natif. Les règles shell: ask doivent couvrir le nouvel appel ;
une seule règle historique bash: ask ne suffit pas pour transmettre once.
Le drapeau executed ne prouve pas l'effet : OpenCode 2.2 termine réellement
shell et write avec ce drapeau faux. CAB exige permission once acquittée,
identité d'appel, cible, dates et résultat ; shell exige sa fin et son exit
natifs. Une fin non corrélée garde ses protections.

Le rejet réconcilié accepte les découvertes reconnues, un polling interrompu
en lecture seule et le relais natif du rejected décidé par CGPT, avec rejet
terminal exact obligatoire. Aucun ancien accord n'est restauré comme
exécutable. Qualifier avec CAB_TEST_OPENCODE=/chemin/vers/opencode-2.2
et le banc tests/native-opencode-codemode.test.mjs : serveur privé, fournisseur
synthétique loopback, broker réel, prévol et écriture sous once, puis contrôle
de disparition du broker et nettoyage. Aucune configuration ou credential
réel n'est copié. Après archive et publication, CABU précède le recovery réel.

## Découverte non autorisante — complément 2.1.27

Le diagnostic Code Mode admet aussi un unique search à données littérales
suivi du retour d'une chaîne littérale fixe. La liste toolCalls doit être
exacte, terminée, concordante et non tronquée. La projection reste
cab_codemode_discovery ; le texte, même APPROVED, n'a aucune autorité.
Une variable, un appel ajouté ou une expression inconnue conserve le refus.
Ce complément ne change ni admission MCP, ni permissions, ni once, ni fin.
La distribution commune est 2.1.27 ; les preuves 2.1.8 restent historiques.

## Priorité medium puis high — nouvelles sessions et reprises

Pour une nouvelle session ou une reprise autorisée, converger vers `medium`
lorsqu’il est réellement publié et disponible sur le modèle retenu. Se
replier sur `high` seulement si `medium` est absent, désactivé ou rejeté par
une preuve native d’incompatibilité. Une erreur réseau, de quota ou
d’authentification ne prouve pas cette indisponibilité. Un niveau explicitement
imposé par le développeur reste prioritaire. Prévoler exactement le choix
avant de générer un mandat.

Une reprise historique en `high` réexamine donc `medium`, sans conserver
`high` par simple habitude. Préserver fournisseur/modèle, RUN, job, réservations,
mandats et preuves ; préparer la transition à une frontière autorisée, vérifier
la variante native et réconcilier le choix durable du contrat. Ne pas réarmer
un job ni écrire manuellement son état pour forcer la convergence. Si le contrat
courant ne permet pas une transition sûre ou si son prévol manque, signaler
la limite et conserver le contexte sans annoncer `medium` appliqué.

Cette règle de protocole ne déclenche ni benchmark PLLM de reprise, ni
changement des sessions actives lors d’une mise à jour des sources. La sélection
par défaut essaie `medium`, puis `high` sur la même candidate ; seulement en
cas d’indisponibilité des deux, la sélection automatique examine la politique
PLLM suivante. Un modèle imposé reste conservé si les niveaux admissibles ne
sont pas disponibles.

## Adaptations natives V2 — source 2.1.27

Le retry historique après `access_id` vide exige l’enveloppe native exacte
Code Mode, un seul appel et ses arguments concordants, `metadata.error=true`,
`truncated=false`, le refus de validation déterministe, puis un `get_approval`
natif corrélé prouvant l’absence de cette approbation. Session, RUN, génération,
commande `/usr/bin/true`, absence d’effet et nouvelle identité de prévol restent
contrôlés. Le texte libre ou le timeout seuls restent insuffisants. Le schéma
MCP refuse désormais `access_id` vide : omettre cette clé si aucun accès
existant n’est référencé. Le banc reproduit explicitement l’ancien schéma
2.1.9 pour qualifier cette récupération, avec le validateur réel inchangé.

Les vérifications d’un RUN filtrent les permissions par leurs identités de
session avant de valider leurs cibles. Une permission étrangère n’est ni
répondue ni autorisée ; une identité manquante ou une cible propre invalide
reste bloquante. Les contrôles globaux conservent leur validation stricte.

Le client expose les `tokens` et le `cost` natifs valides dans `info`, avec
`usageSource=opencode-v2`. Absence reste inconnue, zéro reste zéro ; les
métadonnées libres ne fabriquent pas ces mesures. Les événements SSE V2
`data` et `location` sont normalisés avec vérification des identités et
répertoires. Les débuts/fins d’exécution et permissions corrélés invalident
les observations de génération ; les états statistiques suivent l’activité
sans créer de décision CAB. Les mesures historiques manquantes ne sont pas
reconstruites.

## Récupération directe et pagination — source 2.1.27

Le retry historique du refus `access_id` vide reconnaît aussi les erreurs MCP
natives directes qualifiées, en plus de Code Mode : partie assistant tool pour
request_validation/get_approval, executed faux, error de type tool.execution,
itemId natif fc_ lié exactement au call_, et temps created/ran/completed
entiers positifs ordonnés. Le client dérive la provenance et l’empreinte de
la partie complète ; une marque libre ne suffit pas. Le refus déterministe,
les identités/génération exactes, `/usr/bin/true` unique, le lookup natif inconnu
corrélé, la quiescence et l’absence d’effet restent requis. Le prévol suivant
a une identité neuve dans la même candidate. Aucun -32602 n’est fabriqué et
aucun once n’est rejoué. Les autres formes restent refusées.

Pour les historiques volumineux, le client conserve le plafond de 2 Mio et
réduit par moitié la limite de la même page seulement après
`opencode-response-too-large`, de 200 jusqu’à un minimum de un. Il n’avance pas
le curseur et ne conserve aucune réponse partielle lors de cette réduction.
Les pages complètes, l’ordre, les curseurs et la borne de 100 pages restent
contrôlés ; un message unique trop volumineux échoue explicitement. Les autres
erreurs ne sont pas masquées ni réessayées par ce mécanisme. Ne pas purger
ni tronquer le transcript pour franchir cette limite.

Les tests et lectures filtrées qualifient les sources. L’activation CABU et
la récupération réelle du RUN restent des étapes distinctes, coordonnées
séparément ; les services actifs ne sont pas modifiés par cette préparation.

## Diagnostics de notification et refus avant admission — source 2.1.27

Une approbation peut rester `PENDING` alors que sa notification au contrôleur
est `FAILED`. Le champ optionnel `notification_diagnostic` expose le dernier
échec HTTP sous la forme `{http_status, error_code}`. Le code est reconnu dans
une liste fermée pour son statut ; `null` signifie inconnu. Le corps est lu
sous une limite de1024 octets, sans recopier message distant, ressources,
commande ou champ arbitraire. Le diagnostic existant `command-too-long` reste
filtré comme auparavant. La lease exacte conditionne la persistance ; un
résultat périmé n’écrase rien et une livraison réussie retire l’ancien diagnostic.
Les anciennes approbations restent compatibles sans ce champ.

Les refus de validation corrélés au RUN connu sont comptés dans
`GET /runs/<runId>/statistics`, section `contexts[].httpFailures`, y compris
lorsqu’ils surviennent localement avant admission. Chaque requête HTTP compte
au plus une fois ; les réessais sont des tentatives distinctes. Ce compteur
ne représente ni des demandes uniques, ni des décisions `REJECTED`. Une demande
non admise ne doit pas apparaître comme validation indécise. Les compteurs ne
contiennent aucun corps ou contenu métier.

Lire le diagnostic et les révisions réellement observées ; ne pas inventer
une révision0 pour une ressource non listée. Réconcilier l’ancienne demande
sans effet puis préparer une demande exacte neuve selon les règles applicables.
`FAILED` ne donne aucune décision, attribution, admission, permission ou retry
exécutable ; les corrélations, révisions, accès et `ask/once` restent inchangés.
La préparation source n’active rien. L’activation CABU coordonnée est rapportée
avec les versions des processus réels avant notification aux sessions.


## Restitution sans effet — source 2.1.27

Pour une réservation de test HELD acquise mais jamais utilisée pour une
mutation, appliquer [la procédure spécifique](references/unused-test-reservations.md)
avant POST /runs/<runId>/test-resources/release-unused. Elle exige autorisation
humaine ciblée, attestation exhaustive de l’orchestrateur, relecture native
complète et frontière inchangée. Aucun délai, échec SSH ou booléen isolé ne
libère l’environnement. Après mutation ou incertitude, conserver la restitution
ordinaire avec nettoyage et vérification ; aucune once n’est rejouée.


## Isolation de la location MCP et sondes — source 2.1.27

Appliquer [la référence d’isolation MCP](references/mcp-location-isolation.md).
La découverte serveur est globale ; les contrôles MCP visent la location
partagée et refusent un répertoire explicite divergent. Pour les sondes,
utiliser createProbeSession avec le modèle exact et deny global, puis cibler
le directory retourné jusqu’à la suppression de cette seule session.
Aucun contexte technique étranger n’est initialisé pour sonder le modèle.
Une panne reste INCOMPLETE sans réparation MCP automatique ; la récupération
d’un contexte concurrent est distincte, explicitement autorisée et prouvée.


## Attente du contrôleur et échec de récupération — CAB2.1.27

L’attente de la version réelle du contrôleur utilise le budget --wait-ms
existant (120000ms par défaut, borne maximale900000ms), y compris au rollback.
Un service déclaré active par systemd ne suffit pas. Un dépassement conserve
update-controller-start-unconfirmed, distinct du rechargement du broker.
Aucun délai ne remplace la vérification des versions et de la readiness.

Après la coupure, un rollback non confirmé reste ROLLBACK_FAILED, non terminal.
La reprise doit traiter le même journal avant une nouvelle transaction ;
elle ne peut pas le reclasser PREPARATION_FAILED. Ne jamais modifier le
journal pour fabriquer un succès. Les anciens journaux déjà classés à tort
par une version antérieure restent conservés comme preuves ; observer les
artefacts et processus effectivement restaurés séparément, sans réécrire
leur historique. Les RUN, demandes et once ne sont pas restaurés depuis
une sauvegarde. Seul un retour réellement vérifié peut être annoncé.


## Refus de décision HTTP explicites — CAB2.1.27

Appliquer [les diagnostics de décision](references/decision-http-diagnostics.md).
Les anciens400 vides deviennent JSON {error,message,decision_recorded}, avec
codes fermés et messages filtrés. Conserver statut et corps avant parsing ;
GETdecision404 peut coexister avec une demande indécise. decision_recorded
reflète la table locale, pas une décision native ni une persistance durable.
Aucun diagnostic ne valide, ne rejoue ou ne reconstruit une décision/once.


## Modèle du client : reasoning en entrée

Lire references/model-policy.md avant création de session ou sonde, changement
de modèle ou prompt avec modèle explicite. Le client attend model.reasoning ;
les lectures exposent model.variant. En2.1.27, réinjecter ce champ natif est
refusé avant HTTP avec opencode-model-variant-unsupported, même si reasoning
est aussi présent. Convertir explicitement le modèle relu en un nouvel objet
{providerID,modelID,reasoning}, sans alias ni repli silencieux vers default.
Conserver le choix du codeur et les permissions existantes.


## Fournisseur et modèle à chaud — CAB2.1.27

Appliquer [la procédure de changement à chaud](references/hot-model-switch.md).
Le dernier choix explicite peut remplacer fournisseur/modèle/raisonnement dans
le même job sans contrainte de l’ancienne politique ; sans choix explicite,
suivre la PLLM actuelle. POST /runs/<run_id>/job/model-transition conserve
RUN/job/session et historique, avec prepare/commit/cancel et reprise prouvée.
Le raccord confidentiel utilise l’API V2 native et le helper provider-connect,
sans reload/dispose. Aucun SCM CAB réussi ne se termine sans CABU ensuite ;
annoncer l’activation seulement sur versions réellement observées, puis avertir
les sessions. Ni CABU ni la livraison source ne modifient implicitement leur
clé, leur choix ou leurs décisions.


## Contrôle de continuité historique — CAB2.1.27

Lire [account-bound-history.md](references/account-bound-history.md). Un choix
completed et une sonde fraîche ne certifient pas l’histoire existante. Les
réponses portent historicalContinuity:not-verified et
requiresHistoricalContinuityCheck:true. Sous PAUSE/deny, vérifier un échange
natif sans outil dans le SID historique avant RESUME. Une erreur de contexte
Responses liée au compte ne déclenche ni nouvelle PLLM ni repli de raisonnement.
La limite2.2.0 et le parcours distinct d’un autre choix explicite restent
prouvés/documentés ; ne pas promettre une réparation à même modèle ou appliquer
resume:false, dispose, nouveau SID, compactage ou édition de stockage.


## Projection du contexte après transition PLLM/compte — CAB2.1.27

Appliquer la référence [portable-context.md](references/portable-context.md) : ne plus rejouer les anciens blocs de raisonnement et métadonnées fournisseur après transition. Projeter seulement les messages anciens de la session/connexion/cible autorisées, sans changer histoire, modèle ou permissions. Hook natif chargé à chaud puis preuve historique sans outil avant prévol CAB/RESUME. Le mode2 demandé conserve Muse/medium et le compte2 ; une connexion différente bloque sans repli.


## Entrée native exacte avant once — CAB2.1.27

Appliquer [native-input-guard.md](references/native-input-guard.md) : pour tout nouveau mandat write/edit, calculer tool_input_sha256 sur les arguments natifs exacts avec nativeToolInputDigest, vérifier ce champ avant APPROVED puis comparer la preuve native avant once. Une divergence bloque et invalide l’exécution sans permission consommée ; réconcilier sans effet et rejeter la permission avant nouvelle identité. Les anciens mandats sans empreinte ne sont pas annoncés protégés. Conserver la vérification du fichier après effet et le choix PLLM.


## Readiness vide et omission native — CAB2.1.27

Appliquer [empty-readiness-input.md](references/empty-readiness-input.md) : seule l’omission input du broker_readiness({}) littéral unique, achevé sans erreur et non tronqué peut être projetée. Métadonnées/empreinte brute intactes, autres outils et formes ambiguës toujours bloquants ; aucun argument implicite global ou pouvoir de décision/once ajouté.


## Admission observée — CAB2.1.27

Appliquer [admission-state.md](references/admission-state.md) : GET /runs/<run>/decision/<request>/admission distingue BUSY/STABLE, propriétaire, validation et décision locale enregistrés. STABLE est seulement un instantané, sans autorisation/réservation ;409 précoce et400 tardif restent bloquants. Lire la décision réelle et conserver les mêmes identités avant poursuite explicite si toujours indécise, sans retry automatique ni once rejouée.


## Longs mandats Bash sans recopie — CAB 2.1.27

Appliquer la [procédure du transport scellé](references/exact-shell-carrier.md) pour un nouveau payload Bash revu. L’orchestrateur dépose les octets exacts et leur SHA256 via `POST /runs/<run>/shell-stage` ; le codeur transmet seulement `command` retournée, dans `request_validation` puis dans l’appel shell natif. La décision examine également le corps privé scellé, fourni au validateur automatique par CAB. Le staging n’autorise rien : conserver décision corrélée, accès HELD, `once`, fin native et réconciliation. Aucun mandat ancien n’est réinterprété. Un refus du lanceur après `once` ne permet jamais de rejouer cette permission.


## Reprise des incidents natifs — CAB 2.1.27

Appliquer [la procédure de diagnostic et reprise](references/native-coding-recovery.md) : préparer les nouveaux mandats avec nativeCodingMandate, distinguer catalogue MCP et outils natifs et utiliser diagnoseCodingTurn sur le SID et l’ancre utilisateur exacts. Erreur fournisseur ou entrée incomplète/divergente impose examen des effets et réconciliation, sans retry, once rejouée ou bascule spontanée. Conserver le choix LLM explicite. Vérifier le conducteur entier : READY, compilation ou proposition ne prouvent pas les tests. Le moniteur utilise GET /monitor/runs, projection compacte non autorisante ; le plafond 2 Mio reste inchangé et les causes de panne sont distinctes.
