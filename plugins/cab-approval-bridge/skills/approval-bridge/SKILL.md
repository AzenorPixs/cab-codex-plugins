---
name: approval-bridge
description: Met en place, teste et supervise le dialogue OpenCode–Codex via broker MCP stdio, contrôleur local et SSE OpenCode, sans déléguer les décisions.
---

# Codex Approval Bridge

Utiliser ce skill lorsqu’un développeur demande de mettre en place, tester, superviser ou reprendre le pilotage d’OpenCode par Codex.

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
- Le contrôleur n’écoute que `127.0.0.1`.
- OpenCode est observé indépendamment via son SSE HTTP direct.
- Après reconnexion SSE ou divergence, réconcilier l’état réel par HTTP auprès d’OpenCode.
- Les validations normales passent par MCP stdio.
- L’état `GET /mcp` du serveur OpenCode est la source de vérité de connexion MCP pour les sessions persistantes ; une sortie CLI ne peut pas s’y substituer.
- Une nouvelle session CAB purge entièrement son ancien état technique et crée une nouvelle session maîtresse après confirmation de `cgpt-validation: connected`. La réutilisation d'une session concerne seulement la reprise du même RUN. Tous les mandats passent par `POST /session/<id>/message` et restent observables dans OpenCode.
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

Avant toute nouvelle session, appliquer intégralement la
[procédure de purge](references/session-reset.md). Elle est obligatoire quel
que soit l'ancien état, y compris en présence de conflits Syncthing. Le script
`../../scripts/cgpt-approval-bridge-reset.py` est fourni par ce plugin.
Une reprise ordinaire du même RUN conserve son état et commence par la
réconciliation. Seule l'exception de prévol de récupération divergent définie
ci-dessous autorise une nouvelle session CAB avec purge contrôlée.

1. Vérifier `GET /global/health` d’OpenCode.
2. Vérifier que `cgpt-validation` est déclaré comme MCP local `stdio`.
3. Vérifier `GET /mcp` et exiger `cgpt-validation: connected`.
4. Si ce statut est absent ou en échec, exécuter seulement la récupération contrôlée `POST /instance/dispose`, puis attendre `/global/health` et `/mcp` sains. Ne jamais tuer ou lancer directement le broker, qui appartient à OpenCode.
5. Relever par API, pour l’agent de codage ciblé, le fournisseur, le modèle et le niveau de raisonnement effectivement configurés. Vérifier que le fournisseur et le modèle sont publiés par OpenCode sans lire de secret.
6. Créer une session de prévol temporaire sans outil ni accès au projet, lui adresser une requête inoffensive en imposant exactement ces paramètres et vérifier la réponse ainsi que ses métadonnées observées. Fermer la session temporaire après le contrôle.
7. Si la réponse, le fournisseur, le modèle ou le raisonnement est absent ou divergent, publier `CAB_INACTIF` avec la cause et ne créer ni session persistante ni contrôleur. Ne jamais corriger la configuration à la place du développeur.
8. Installer ou actualiser les ressources utilisateur du contrôleur sans `systemctl --user enable`, puis démarrer ou réutiliser explicitement le service `cgpt-approval-bridge-controller.service`, qui exécute `../../scripts/cgpt-approval-bridge-controller.mjs` hors sandbox avec `OC_Codex_OUTSIDE_SANDBOX=1` (ou l’alias historique `OC_CGPT_OUTSIDE_SANDBOX=1`). Vérifier qu'il est actif et que son redémarrage sur échec est actif.
9. Vérifier le statut local du contrôleur.
10. Démarrer ou maintenir le SSE direct OpenCode.
11. Créer une nouvelle session maîtresse pour un nouveau RUN via `POST /session` ; réutiliser la session seulement pour une reprise du même RUN. Conserver son identifiant et adresser tous les mandats par `POST /session/<id>/message`.
12. Appeler `broker_readiness` dans cette session, sans accès au projet.
13. Interpréter `READY`, `DEGRADED`, `BLOCKED` ou `HUMAN_REQUIRED`.
14. Réconcilier l’état OpenCode via HTTP après chaque reconnexion ou divergence, puis revalider `/mcp` avant tout mandat.
15. Vérifier qu’aucune approbation parasite n’est en attente.
16. Tester `request_validation` avec un `requestId` inédit dans la session persistante.
17. Rendre une décision Codex explicite unique.
18. Vérifier la réponse MCP corrélée reçue par OpenCode dans cette session.
19. Créer le heartbeat de trente secondes uniquement après validation complète.

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

- Supprimer les heartbeats et healthchecks créés par `/cab`.
- Fermer les clients SSE créés par `/cab`.
- Arrêter uniquement le contrôleur démarré par `/cab`.
- Ne pas arrêter directement `cgpt-validation` : il est géré par OpenCode.
- Ne pas fermer OpenCode ni son conteneur sans instruction explicite.


## Récupération contrôlée de session dans le même RUN

Après un écart refusé sans effet, interrompre l'ancienne session, traiter son
rapport et clôturer le mandat courant avec `/job/progress`. Ne pas réarmer le
job pour remplacer sa session : `/job/arm` reste immuable. Créer la candidate
par l'API native OpenCode dans le même `directory`, avec permissions natives
`ask`, sans lui confier de travail métier.

Utiliser `POST /job/recover` en deux phases. Le corps commun contient `jobId`,
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
n'invente aucun gate terminal. La seule exception de purge est définie dans
« Nouvelle session CAB après prévol de récupération divergent » ci-dessous.
Un redémarrage conserve ce gel mais ne recrée pas la décision ou la preuve
locale du prévol : si elles sont perdues, la récupération reste refusée et
nécessite une décision humaine. L'API ne remplace ni une session révoquée ni
un prévol échoué par une nouvelle tentative implicite.

## Nouvelle session CAB après prévol de récupération divergent

Après le feu vert de la session, l'orchestrateur est autorisé sans nouvelle
confirmation à ouvrir une nouvelle session CAB lorsqu'une récupération échouée
prouve à la fois la transmission de `true` au lieu de `/usr/bin/true` et un
`change_id` divergent du change attendu. Le mandat erroné reste refusé, sans
normalisation. Cette exception ne couvre aucun autre échec et n'est jamais
exécutée automatiquement par `/job/recover`.

Geler le travail, traiter les rapports, réconcilier les effets et refuser les
permissions divergentes ; clôturer les demandes restantes sans les approuver.
Exiger la propriété du contexte, les sessions inactives, aucun mandat actif
ou en attente, aucune permission non résolue et aucun effet inconnu. Un espace
partagé avec un autre travail ou une preuve incertaine interdit la purge.

Préserver hors des cibles un checkpoint métier non secret : objectif, change
attendu, jalons, écritures validées et preuves natives, prochaine action, motif
de l'échec et chemins résolus. Arrêter les ressources CAB du contexte et
déconnecter nativement le broker selon `references/session-reset.md`.
L'abandon de ce seul job technique gelé est autorisé même avec gate OPEN, sans
fabriquer un gate valide ni désarmer artificiellement le job. Ne pas fermer
ou redémarrer OpenCode.

Purger avec l'outil distribué les seuls espaces réellement résolus
`<home OpenCode>/.opencode/state/cgpt-approval-bridge/` et
`<racine projet>/.opencode/state/cgpt-approval-bridge/`, en tenant compte des
chemins personnalisés. Les gardes de chemin et de verrou restent obligatoires.
Approbations, journal, job et autres états techniques sont supprimés sans
lecture, sauvegarde ou restauration ; checkpoint métier, sources, secrets,
rapports et historiques natifs restent hors purge. Une purge partielle
interdit le démarrage.

Créer une nouvelle session CAB et un nouveau job technique, avec des
identifiants de session, job, requête et approbation neufs. Le prévol de ce
redémarrage exige exactement `/usr/bin/true`, sans suffixe, avec le
`change_id` attendu du checkpoint, une décision explicite, une réponse MCP
corrélée, une permission consommée une seule fois et exit 0. Exiger ensuite
`broker_readiness = READY` sans demande ni permission parasite. Un nouveau
prévol divergent interdit la reprise.

Réconcilier les fichiers et les preuves conservées, puis reprendre au premier
jalon non prouvé, sans rejouer les écritures validées ni les autorisations
consommées et sans réadopter l'ancien job ou ses décisions. Le RUN métier
conserve son checkpoint externe ; la récupération ordinaire reste sans purge.
Une preuve manquante ne vaut jamais succès et n'autorise aucun rejeu aveugle.
Les permissions techniques de la plateforme restent applicables.

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
