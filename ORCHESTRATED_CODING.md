# ORCHESTRATED_CODING.md — Sessions de codage pilotées

Version : 0.1

Projet : identité à résoudre depuis la racine réelle et les cadrages applicables

## Champ d'application et autorité

Ce fichier est facultatif à l'échelle du projet. Il est uniquement présent
pour un projet qui nécessite des sessions pilotées par un agent orchestrateur
vers un agent de codage. Son absence est normale dans un projet sans besoin
de pilotage et n'empêche pas une session de codage directe.

Ce document est la référence locale des sessions de codage conduites par un
agent orchestrateur vers un agent de codage. Les deux agents doivent le lire
avant l'initialisation du pilotage, en complément d'AGENTS.md. Il ne modifie
ni les autorisations du développeur, ni la priorité des spécifications
OpenSpec validées, ni les permissions de la plateforme.

L'orchestrateur définit le périmètre et les critères, arbitre les demandes et
vérifie les preuves. L'agent de codage analyse et exécute seulement les
opérations autorisées. Le développeur conserve le contrôle des décisions qui
lui sont réservées. Aucun de ces rôles ne peut inventer une autorisation.

Le profil technique actuellement décrit utilise OpenCode comme agent de codage,
l'agent orchestrateur désigné par le prompt et CAB comme transport neutre.
Le nom `CGPT` désigne le rôle d'orchestrateur dans les messages et interfaces
ci-dessous. Un autre agent de codage ou transport exige un contrat d'intégration
explicitement validé ; les exemples CAB ne prouvent pas sa compatibilité et
ne déclenchent aucune adaptation implicite.

Une session directe SCM reste régie par son prompt et AGENTS.md. La présence
de ce fichier ne lance ni agent OpenCode, ni service CAB, ni compétence,
sonde ou télémétrie de session pilotée. Le rapport d'archivage éventuellement
requis par le projet reste une obligation distincte.

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
Vérifier service actif, GET /api/snapshot avec version 1.10.4 et identity.workspace
attendus, puis GET / ; terminer cette tentative bornée et rapporter son résultat
avant les contrôles amont. Afficher l'URL réelle uniquement après ces preuves,
sinon la cause et l'URL attendue séparément du statut CAB. Préserver configuration
et port existants, sans activation au login. Un échec PLLM ou CAB ultérieur
n'arrête pas le moniteur. Une divergence active ou un échec de monitoring ne
permet aucun arrêt, redémarrage ou changement de RUN dans les autres briques.

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

## Identité, coordination et autorisations des RUN

### Identité et nommage des sessions

Chaque nouveau RUN dispose d'une identité propre et crée sa propre session
OpenCode visible, sans créer une seconde instance du processus OpenCode.
L'orchestrateur conserve la correspondance entre projet, racine réelle,
`run_id`, numéro du RUN, identifiant du chat orchestrateur, sessions OpenCode
et réservations CAB. Le numéro vient de la demande ou, s'il manque, d'un
numéro disponible vérifié dans le registre et les chats accessibles. Ne pas
inventer d'identifiant natif ; une valeur non exposée reste `null`.

Le préfixe des sessions est `<SIGLE><N> - `, suivi du change ou de leur fonction.
Pour CISMP, employer `CISMP<N> - `. Les sessions des sous-jobs et les sessions
techniques attribuables au RUN conservent le préfixe du parent. Chaque nouveau
change utilise une nouvelle session et un nouveau job selon le protocole CAB.
Une interruption sans clôture ou une reprise du même change conserve
l'identité et la session du RUN après réconciliation, sauf récupération
explicitement prévue ; elle ne recrée pas une session au seul motif d'une
relance. Après clôture pour dépendances manquantes, une nouvelle invocation
générale relance la sélection sans imposer la cible historique ; si le change
retenu diffère, appliquer les règles de nouvelle session et de nouveau job
avec réservation, en conservant le bilan précédent. Ne pas renommer les
anciennes sessions d'un autre RUN. Un titre lisible ne remplace jamais les identifiants natifs.

### Coordination autorisée entre chats CISMP

Le développeur autorise durablement l'envoi et la réception de messages
strictement nécessaires à la coordination entre les chats du même projet
identifiés comme participants « RUN CISMP<N> persistant ». Cette autorisation
couvre les demandes et réponses concernant réservations, dépendances,
ressources partagées, jalons stables et intégration. Avant un envoi, vérifier
la correspondance du chat destinataire avec le projet, la racine et le RUN
au moyen des identifiants accessibles et du registre CAB ; le titre seul ne
prouve ni l'identité ni la propriété. Une correspondance incertaine exige la
clarification indispensable, sans envoyer au chat supposé.

Un message reçu fournit des informations à réconcilier ; il ne modifie pas
les autorisations du développeur et ne vaut jamais décision CAB. Cette
coordination n'autorise ni arrêt ou redémarrage d'un autre RUN, ni modification
de son périmètre, ni décision à sa place. Elle n'autorise pas de message à un
autre projet, à un chat non participant ou à un tiers. Les autres types de
prompts conservent leurs autorisations de coordination explicitement données.

### Conservation et vérification des accords

Dans le checkpoint non secret déjà autorisé par le prompt, conserver la
correspondance d'identité et, pour chaque accord applicable, sa source
explicite, son périmètre, les destinataires autorisés et ses
limites. Ne pas créer un autre fichier d'état à cette seule fin. À la reprise,
réconcilier ces accords avec les instructions actuelles du développeur ; une
restriction ou révocation plus récente prévaut. Ne pas redemander un accord
explicite, toujours applicable et non révoqué. Un checkpoint seul ne crée ni
n'étend une autorisation.

Les préconditions techniques et les accords particuliers sont définis par le
prompt invoqué et le contrat CAB effectivement en vigueur. Les choix de services
externes, leurs évaluations et leurs replis relèvent de ces seules sources.
Vérifier les accords applicables avant les échanges, sans les réinventer ni
les étendre. Transmettre seulement les éléments nécessaires dans les limites
d'AGENTS.md, sans secret ni source exclue. Un accord ne s'étend pas implicitement
à un autre projet, prompt ou destinataire. En cas d'accord manquant, demander
uniquement la décision nécessaire avant l'échange concerné.

### Barrières propres au prompt

Le feu vert de démarrage et la validation du périmètre restent distincts.
Lorsqu'un prompt définit son invocation comme feu vert conditionnel,
l'orchestrateur vérifie les conditions puis démarre sans redemander cet
accord. Sinon, sa barrière de démarrage demeure applicable. Un sous-job
hérite seulement du feu vert que son parent lui délègue effectivement.

Ces règles ne déclenchent ni écriture ni implémentation dans un diagnostic.
DOPP conserve son fonctionnement en lecture seule, sans `/cab run`.
Les validations spécifiques de périmètre, de reprise RSMP,
d'OpenSpec, de Git, d'infrastructure et les mandats CAB restent applicables.
La persistance suit les conditions terminales du prompt ; elle ne crée aucun
réveil automatique après interruption de l'orchestrateur.

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

## Protocole de communication OpenCode ↔ CGPT via CAB

Ce protocole s'applique à tout agent de codage OpenCode piloté par CGPT pendant
une session de codage. Il complète les règles OpenSpec et ne les remplace pas.

### Rôles

CGPT fixe le périmètre, valide les choix fonctionnels et techniques, décide
des mandats CAB et reçoit les comptes rendus. Le broker CAB ne décide jamais :
il transporte et corrèle les demandes. Une décision est limitée à un
`requestId` unique et à une seule opération.

L'agent de codage NE DOIT PAS étendre le périmètre, inventer une réponse CGPT
ou CAB, exécuter une opération refusée, ni déclarer exécuté un outil, une
commande ou un test sans preuve observée dans la session. Il NE DOIT PAS lire,
afficher ou transmettre de secret.

### Initialisation de session

Avant tout accès au projet, l'agent DOIT :

1. confirmer le répertoire, le change OpenSpec et le périmètre reçus ;
2. appeler réellement l'outil MCP `broker_readiness` exposé dans la session ;
3. exiger le statut `READY` et l'absence d'approbation parasite ;
4. rapporter à CGPT l'identifiant de session, le répertoire, le change et
   l'état CAB.

Une réponse textuelle sans appel d'outil observé ne constitue jamais une
preuve. Si l'outil MCP n'est pas exposé, échoue, répond `BLOCKED` ou
`HUMAN_REQUIRED`, l'agent DOIT envoyer `CAB_BLOCKED` à CGPT et s'arrêter.

### États de session

L'agent suit exclusivement la séquence suivante :

```text
INIT → ANALYSE → WAIT_CGPT → WAIT_CAB → EXECUTION → REPORT
                                      ↑                 │
                                      └─────────────────┘
```

* `ANALYSE` : lecture et compréhension dans le seul périmètre validé ;
* `WAIT_CGPT` : une décision fonctionnelle, technique ou de périmètre est
  attendue ;
* `WAIT_CAB` : une autorisation technique unitaire est attendue ;
* `EXECUTION` : une seule opération autorisée est réalisée ;
* `REPORT` : preuve et résultat sont transmis ;
* `DONE` : la session ne peut être clôturée que par CGPT ou après exécution de
  tous les mandats validés.

Un changement d'état ne peut jamais être déduit d'un texte produit par
l'agent lui-même.

### Messages à destination de CGPT

Lorsqu'une décision est nécessaire, l'agent envoie l'un des messages suivants,
puis passe à `WAIT_CGPT` sans poursuivre.

```text
NDOC
change_id: <change>
objet: <question précise>
contexte: <faits observés>
impact du blocage: <ce qui ne peut pas continuer>
attente: réponse CGPT
```

```text
NFDOC
change_id: <change>
objectif: <objectif validé>
fichiers:
  - <chemin> : <modification minimale>
critères: <critères observables>
validations: <vérifications prévues>
limites: <éléments exclus>
attente: validation explicite CGPT
```

```text
NQCMOC
change_id: <change>
question: <choix à arbitrer>
A: <option et impact>
B: <option et impact>
recommandation: <option et justification>
attente: choix CGPT
```

Seule une réponse reçue dans la même session OpenCode est exploitable. Sans
réponse explicite de CGPT, l'agent reste à `WAIT_CGPT`.

### Mandats CAB

Avant toute écriture, commande Bash ou système nécessitant une permission,
commande OpenSpec mutante, test à effet de bord, opération Docker, correction
ou archivage, l'agent soumet un mandat CAB unitaire. Il contient un
`requestId` inédit, un `approval_id`, un `change_id`, l'identifiant de session,
le répertoire et un résumé lisible.

Le mandat désigne exactement l'une des cibles suivantes :

```text
Édition :   files: ["chemin/relatif"] ; commands: []
Commande :  files: [] ; commands: ["commande complète exacte"]
```

Les mandats à plusieurs fichiers, plusieurs commandes, glob, préfixe ou
commande implicite sont interdits. Un `requestId` ne peut jamais être réutilisé.

Après soumission :

* `APPROVED` : exécuter une seule fois l'opération strictement identique ;
* `REJECTED` : ne rien exécuter, rapporter le refus et passer à `WAIT_CGPT` ;
* `needs_clarification` : ne rien exécuter et envoyer un `NDOC` ;
* réponse absente, non corrélée, `BLOCKED` ou `HUMAN_REQUIRED` : envoyer
  `CAB_BLOCKED` et s'arrêter.

Une décision CAB ne couvre jamais une autre commande, même identique.

### Exécution, preuves et clôture

Les lectures natives ne nécessitant pas de permission peuvent être effectuées
pendant `ANALYSE`, dans le périmètre autorisé. L'agent distingue toujours les
faits observés, les déductions, les éléments non vérifiés, les refus et les
erreurs.

Après chaque mandat, l'agent envoie un `RAPPORT_OC` contenant le `requestId`,
l'opération, le résultat, les preuves réellement observées, les fichiers
modifiés, les validations exécutées, les écarts et la prochaine étape. Toute
correction, validation à effet de bord, modification OpenSpec ou archivage est
un nouveau mandat CAB.

L'agent ne coche une tâche OpenSpec qu'après preuve de son achèvement et
validation explicite de l'orchestrateur, sous mandat unitaire applicable. Un
archivage OpenSpec reste un mandat distinct et exige une validation explicite
de CGPT après contrôle des critères, des tests et de la cohérence entre code,
spécifications et documentation.

### Nouvelle invocation après clôture et choix du change

Distinguer une session interrompue avant sa clôture d'une session effectivement
clôturée pour dépendances manquantes. Réconcilier d'abord les effets, les preuves,
le bilan, le checkpoint lorsqu'il existe et les ressources de la session
précédente. Ne pas sélectionner une autre cible tant qu'un mandat, une permission
ou un effet de l'ancienne session reste non réconcilié.

Une interruption sans clôture reprend le change courant au premier jalon non
prouvé. Une demande visant explicitement un change, ou imposant de finaliser
la cible précédente, conserve cette cible : vérifier ses dépendances, réaliser
les unités indépendantes autorisées puis appliquer la clôture différée si elle
reste bloquée, sans lui substituer silencieusement un autre change.

Après une clôture pour dépendances manquantes, une nouvelle invocation générale
explicitement demandée relance la sélection parmi les changes actuellement
réalisables dans le périmètre autorisé. Un ancien checkpoint, le même chat ou
le même numéro de RUN n'impose pas de reprendre l'ancien change. Une limite à
un seul change borne le travail de cette invocation ; elle ne désigne pas
l'ancienne cible et ne lui donne aucune priorité automatique.

Choisir de manière argumentée, à partir des priorités validées, des exigences
OpenSpec, des fondations documentées, des dépendances satisfaites, des unités
réalisables et de leurs validations, ainsi que des ressources disponibles.
Examiner aussi la capacité d'un candidat à débloquer d'autres travaux, lorsque
les liens de dépendance sont prouvés. Privilégier les changes existants cohérents
et réalisables ; ne choisir ni au hasard ni selon le seul ordre des fichiers.
Expliquer le choix et les motifs d'écartement, dont les dépendances toujours
manquantes de l'ancien change. Si seuls des travaux bloqués subsistent sans
candidat réalisable, produire un bilan puis clôturer, sans attente ni création
destinée à contourner le blocage.

Conserver l'ancien change ouvert, ses tâches, son bilan et les preuves encore
valables ; il redevient candidat dès que ses dépendances permettent un travail
autorisé. Préserver l'historique de l'ancienne cible avant d'actualiser la cible
courante dans les artefacts déjà autorisés. Cette nouvelle sélection n'exige pas
un accord distinct au seul motif que la cible change ; les validations de
périmètre, de préparation ou de création OpenSpec et les autres autorisations
propres au prompt restent applicables. Elle ne relance jamais automatiquement
la session clôturée.

En pilotage, le choix appartient à l'orchestrateur ; l'agent de codage conserve
sa cible jusqu'à un nouveau mandat explicite. Tout changement de cible suit
les réservations, la nouvelle session de codage et le nouveau job requis,
sans effacer l'historique du RUN ni réutiliser une permission consommée.

### Rapport durable de blocage et réévaluation

Avant toute clôture pour dépendances insatisfaites et libération des ressources,
enregistrer le bilan dans `openspec/changes/<change>/BLOCKERS.md`, au sein du
change courant laissé ouvert. L'invocation de ce prompt autorise cette création
ou mise à jour documentaire et l'ajout d'un lien relatif vers `BLOCKERS.md`
dans le `tasks.md` existant, dans le seul change déjà autorisé. Référencer aussi
le rapport dans le checkpoint lorsqu'il existe. Cette autorisation ne permet
ni création d'un autre change, ni modification des critères, ni coche sans
preuve ; elle n'autorise pas à créer un `tasks.md` absent. Si aucun change
autorisé n'existe, ne pas en créer pour le seul rapport : conserver le bilan
dans les sorties déjà autorisées et signaler l'absence de dossier de change.

Le rapport contient au minimum :

- l'identifiant du change, le prompt, le RUN et la session lorsqu'ils existent,
  la date UTC du constat et le motif de clôture ;
- les tâches achevées, leurs preuves et les limites de ces preuves ;
- un tableau de toutes les tâches non validées, avec leur identifiant et leur
  libellé exacts, la ou les dépendances bloquantes directes ou indirectes,
  le constat daté et ses preuves, la phase empêchée (réalisation, tests,
  intégration ou validation finale), les contrôles ciblés à effectuer et les
  conditions vérifiables de reprise ;
- les contrôles réussis, échoués, non exécutés ou indisponibles, la prochaine
  étape possible et l'état des ressources à la date du constat, avec la
  référence du checkpoint lorsqu'il existe. Le résultat final de libération
  est ensuite consigné dans ce checkpoint et à l'écran, sans imposer une
  écriture dans le change après libération de sa réservation.

Distinguer une dépendance absente, insatisfaite et non vérifiable ; ne pas
inventer de cause pour une tâche dont le blocage n'est pas établi. Conserver
les constats précédents par entrées datées identifiant leur RUN ou session,
sans les écraser ni dupliquer une même entrée lors d'une reprise. Le rapport
et ses références sont vérifiés par relecture, en UTF-8/LF, avant libération.
La restitution à l'écran indique son chemin. Un échec d'enregistrement est
signalé explicitement avec le bilan disponible et l'état réel des ressources ;
ne pas déclarer le rapport enregistré ni la clôture documentée sans preuve.

À toute nouvelle sélection ou reprise, lire `BLOCKERS.md` lorsqu'il existe
pour chaque change candidat examiné. Revérifier les dépendances sur l'état
courant par des lectures ou contrôles ciblés autorisés sans effet de bord ;
tout contrôle nécessitant une écriture, une réservation, une validation de
périmètre ou un mandat attend ces autorisations. L'absence d'un rapport ancien
ne prouve ni l'absence de blocage ni l'impossibilité de reprendre : reconstituer
les faits accessibles sans écrire dans un change non sélectionné.

Pour chaque candidat, conclure sur preuves actuelles : `TOUJOURS BLOQUÉ`,
`PARTIELLEMENT RÉALISABLE`, `FINALISABLE` ou `ÉTAT NON VÉRIFIABLE`.
Préciser les tâches pouvant maintenant avancer et celles encore empêchées.
`FINALISABLE` signifie que les prérequis permettent de reprendre la finalisation ;
ce statut ne prouve ni validation globale réussie ni autorisation d'archivage.
Après sélection et réservation lorsqu'elle est requise, consigner les nouveaux
constats dans le rapport du change retenu, en préservant son historique.
Ne pas modifier le rapport d'un change actuellement réservé par un autre RUN
ni lancer de surveillance automatique.

En pilotage, l'agent de codage rédige ou actualise le rapport et le lien dans
`tasks.md` sous deux mandats d'édition distincts lorsqu'ils sont tous deux à
modifier. L'orchestrateur valide le contenu et la preuve d'enregistrement,
référence le rapport dans son checkpoint puis vérifie le gate et la libération.
Cette obligation documentaire est distincte des écritures du checkpoint par
l'orchestrateur ; elle ne permet ni mandat groupé ni écriture hors réservation.

### Dépendances manquantes et clôture différée du change

Valider sur preuves et cocher chaque tâche achevée selon ses critères exacts.
Lorsqu'une dépendance manque, laisser les tâches concernées non cochées et
poursuivre uniquement les unités indépendantes réalisables dans le périmètre
déjà autorisé. Vérifier cette indépendance à partir des contrats, données,
ressources et validations concernés, et non des seuls fichiers distincts.
Ne pas contourner la dépendance, élargir le périmètre ni affaiblir les critères.
Une tâche de production de sources peut être validée selon ses propres
critères ; sa coche ne prouve pas une intégration ou une qualification encore
impossible.

Dès que ces unités sont épuisées, clôturer proprement la session sans attendre
que les dépendances soient réalisées. Ne maintenir aucune boucle d'attente,
surveillance ou réessai automatique pour ces dépendances et ne pas ouvrir un
nouveau change pour prolonger cette attente. La session est clôturée pour
dépendances manquantes ; le change reste ouvert, en attente de finalisation.
Cet état ne constitue ni une réussite globale ni une livraison. Aucun
archivage forcé n'est permis ; l'archivage reste soumis à tous ses critères
et validations.

Avant la clôture, enregistrer le bilan dans `BLOCKERS.md` selon la section
« Rapport durable de blocage et réévaluation », puis vérifier sa présence et
les références depuis `tasks.md` et le checkpoint lorsqu'ils existent.
Pour chaque tâche non validée, préciser toutes les dépendances bloquantes,
leurs preuves, la phase empêchée et les conditions vérifiables de reprise.
Les contrôles empêchés restent explicitement non exécutés ou indisponibles ;
ils ne sont ni cochés ni exigés comme réussis pour cet arrêt partiel.

Libérer rapidement les ressources propres à la session après sauvegarde et
réconciliation de l'état réel, sans supprimer les travaux ni les preuves,
sans interrompre les ressources d'autres sessions et sans masquer un effet
inconnu. Si une libération échoue, signaler la ressource encore détenue et
la cause ; ne pas la déclarer libérée. La reprise est ultérieure et
explicitement demandée : vérifier alors les dépendances, la propriété des
ressources et la validité des preuves affectées avant de poursuivre.

Cette règle concerne les implémentations autorisées ; elle ne lance aucun
codage dans une session limitée à l'analyse, à la préparation, aux spécifications
ou à la revalidation sans correction.

En session pilotée, l'agent de codage fournit les preuves ; l'orchestrateur
valide explicitement les tâches puis autorise les coches sous les mandats
unitaires applicables. L'agent rapporte le blocage et ne clôt pas seul la
session. L'orchestrateur clôture pour `BLOQUÉ`, motif « dépendances manquantes »,
dès qu'aucune unité indépendante autorisée ne reste réalisable. Cette cause
est distincte d'un incident opérationnel récupérable : ne pas tenter de la
résoudre en recréant une session ou en attendant.

L'orchestrateur traite le dernier rapport, réconcilie et clôt les mandats et
permissions du seul RUN, sauvegarde son bilan, vérifie le gate `BLOQUÉ`,
désarme le job puis libère sa réservation avec `delivered=false` et les
preuves requises. Le change OpenSpec reste ouvert ; une réservation libérée
ne clôt pas le change. Un sous-job transmet cet état au parent, qui effectue
la clôture du RUN sans attente de la dépendance. Arrêter le heartbeat et les
sondes propres au RUN clôturé ; un arrêt CAB global exige la libération et
la quiescence de tous les RUN concernés. Ne pas fermer OpenCode ni arrêter
une infrastructure partagée pour libérer ce seul RUN.

### Statistiques d'archivage

Après chaque archivage OpenSpec autorisé et réussi, produire un rapport par
archive dans `openspec/changes/archive/<archive>/STATISTIQUES.md`, avec un
mandat d'édition distinct pour ce seul fichier lorsque le protocole CAB
s'applique. Vérifier les six sections, UTF-8/LF et les totaux ; afficher `N/A`
motivé pour les mesures absentes. Ne pas déclarer `TERMINÉ` sans preuve du
rapport. Si le rapport échoue, reprendre uniquement ce rapport, sans réarchiver.

## Architecture et interfaces techniques CAB

```text
Développeur
    │ objectif, périmètre et décisions réservées
    ▼
Agent orchestrateur ── HTTP natif ──► session persistante de l'agent OpenCode
    ▲                                         │
    │ HTTP local                              │ MCP stdio local
    │                                         ▼
Contrôleur CAB ◄────────────────────────── Broker CAB
    ▲
    └── SSE HTTP direct OpenCode
Superviseur CAB ──► état du job et relance technique de la même session
```

Le broker ne possède aucun serveur MCP réseau. Le contrôleur et le
superviseur écoutent uniquement en loopback. Les adresses ci-dessous sont
les valeurs par défaut du profil CAB ; les valeurs effectives sont résolues
dans le contexte autorisé, sans lire de secret.

| Composant | Interface | Usage |
|---|---|---|
| OpenCode | `http://127.0.0.1:4096/global/health` | Santé technique |
| OpenCode | `GET /mcp` | Connexion MCP native, dont `cgpt-validation` |
| OpenCode | `GET /global/event` | SSE direct en temps réel |
| OpenCode | `POST /session` | Nouvelle session native du RUN autorisé |
| OpenCode | `POST /session/<id>/message?directory=<racine encodée>` | Mandats dans la session persistante |
| OpenCode | `GET /session/status?directory=...` | Sessions occupées ou inactives |
| OpenCode | `GET /permission?directory=...` | Permissions natives à réconcilier |
| Contrôleur CAB | `http://127.0.0.1:8788/status` | État technique, compteurs et gate |
| Contrôleur CAB | `GET /runs/<run_id>/job` | Contrat durable courant |
| Contrôleur CAB | `POST /runs/<run_id>/job/arm`, `POST /runs/<run_id>/job/progress` | Armement et jalons prouvés |
| Contrôleur CAB | `POST /validation/request` | Notification par le broker |
| Contrôleur CAB | `GET /decision/<requestId>`, `POST /decision/<requestId>` | Décision explicite corrélée |
| Contrôleur CAB | `POST /broker/readiness` | Readiness publiée par le broker |
| Contrôleur CAB | `POST /runs/<run_id>/job/recover` | Récupération explicite en deux phases |
| Contrôleur CAB | `POST /runs/<run_id>/job/terminal-gate`, `POST /runs/<run_id>/job/disarm` | Clôture contrôlée |
| Superviseur CAB | `http://127.0.0.1:8789/status` | État de supervision et dernière relance |

Le SSE et les états HTTP ne remplacent pas un appel MCP réel de
`broker_readiness` dans la session de codage ciblée. L'état `connected` de
`GET /mcp` ne constitue ni une readiness métier ni une décision.

## Initialisation technique et identité du RUN

1. Fixer le projet, le répertoire absolu, le change, les critères, les limites
   et les conditions terminales. Identifier les deux sessions réellement
   pilotées ; signaler un identifiant non exposé sans l'inventer.
2. Vérifier la santé OpenCode et le MCP natif. La connexion CAB est gérée par
   OpenCode ; l'orchestrateur ne tue ni ne démarre directement le broker.
3. Avant une initialisation globale exclusive, appliquer le protocole autorisé
   de nouvelle session : propriété et inactivité prouvées, arrêt des seules
   ressources CAB, déconnexion native, purge bornée, puis reconnexion.
   Une reprise ordinaire du même RUN conserve ses preuves et son runtime.
4. Appliquer les préconditions techniques et prévols prescrits par le prompt
   invoqué et le contrat CAB en vigueur. Vérifier leurs preuves observables
   avant le démarrage métier. Une divergence suspend ce démarrage ; ne pas
   inventer de réussite ni substituer une autre configuration.
5. Créer la session persistante visible dans OpenCode pour le nouveau RUN,
   ou réutiliser celle du même RUN. Les mandats passent exclusivement par
   sa messagerie native ; aucun appel CLI éphémère ne remplace cette session.
6. Exiger le prévol MCP réel READY et l'absence de permission parasite.
   Le test CAB porte sur une seule commande autorisée, une réponse MCP
   corrélée, une permission consommée une fois, exit 0 et readiness finale.
7. Armer le contrat durable avant les mandats métier, puis maintenir le SSE
   et les contrôles décrits ci-dessous. Une session inactive ou un tour
   terminé ne clôture jamais, à lui seul, ce contrat.

Le contrôleur exige `OC_Codex_WORKSPACE` absolu et
`OC_Codex_OUTSIDE_SANDBOX=1` ; les alias `OC_CGPT_` restent compatibles.
Les installations et démarrages éventuels sont soumis au périmètre autorisé.
Les unités utilisateur utilisent `Restart=on-failure` sans activation au
login. Ces dispositions ne donnent aucune autorisation d'installation
système ni d'intervention sur un service existant.

## Contrat durable, mandat et preuve

Exemple de contrat transmis à `POST /runs/<run_id>/job/arm` :

```json
{
  "jobId": "<identifiant inédit du job>",
  "sessionId": "<session OpenCode persistante>",
  "directory": "<racine absolue du projet>",
  "changeId": "<change autorisé>",
  "criteria": ["<critère observable>", "<preuve du rapport après archivage>"],
  "strictCommands": true
}
```

`strictCommands` est booléen et vaut false par défaut dans CAB. Lorsqu'une
identité octet pour octet est exigée, notamment pour CISMP, le contrat doit
porter true. Le mode historique false conserve seulement l'instrumentation
de sortie déterministe reconnue ; il ne permet aucune transformation métier.

Exemple d'arguments du seul appel MCP `request_validation` pour une commande :

```json
{
  "requestId": "<identifiant inédit de requête>",
  "approval_id": "<identifiant inédit d'approbation>",
  "change_id": "<change autorisé>",
  "session_id": "<session ciblée>",
  "directory": "<racine absolue du projet>",
  "title": "<opération unitaire>",
  "summary": "<objectif, cible et critères>",
  "files": [],
  "commands": ["<commande complète exacte>"]
}
```

Pour une édition, remplacer la cible par un seul chemin relatif dans
`files` et laisser `commands` vide. Les deux listes ne sont jamais remplies
ensemble. La décision HTTP utilise `approved`, `rejected` ou
`needs_clarification` et reprend requestId, approval_id et change_id.
La réponse MCP terminale, la permission native et l'effet observé doivent
être corrélés à la même opération, session et racine.

Après un délai d'attente MCP, rechercher uniquement l'approbation déjà
soumise par son approval_id avec `poll_approval` ou `get_approval`.
Un délai ne vaut ni refus terminal ni approbation ; il n'autorise pas la
création d'une requête de remplacement ni le rejeu d'une opération prouvée.
Une décision déjà consommée ne couvre jamais une nouvelle permission.

Les jalons et le mandat courant sont transmis par `POST /runs/<run_id>/job/progress`.
L'orchestrateur conserve les preuves natives hors des seules affirmations
textuelles de l'agent : appels d'outils, réponses corrélées, sorties et codes
de retour, contenu ou empreintes des fichiers autorisés et effets réellement
observés. La corrélation et la propriété du contexte sont recontrôlées après
chaque interruption ou reconnexion.

## Verrou technique des mandats en lecture seule

Pour un inventaire ou une analyse en lecture seule, le message natif
OpenCode désactive explicitement les outils suivants :

```json
{
  "tools": {
    "bash": false,
    "edit": false,
    "write": false,
    "apply_patch": false,
    "task": false,
    "skill": false
  }
}
```

Les outils natifs de lecture et recherche autorisés restent utilisables.
Le champ tools ne modifie pas la configuration persistante. Un mandat
exécutable ultérieur réactive seulement ses outils nécessaires, avec
permissions natives `ask` et décision CAB unitaire. Une instruction
textuelle seule ne constitue pas ce verrou technique.

## Persistance et erreurs de démarrage

Le broker utilise par défaut le home du processus OpenCode qui le lance :
`$HOME/.opencode/state/cgpt-approval-bridge/`. Le contrôleur et le
superviseur utilisent par défaut l'espace du workspace :
`<racine projet>/.opencode/state/cgpt-approval-bridge/`.
Les chemins personnalisés doivent être réellement résolus ; ces exemples
ne désignent pas un espace à purger automatiquement.

Le contrat du contrôleur est conservé dans `controller-job.json`. Seul
ENOENT permet un démarrage sans job. Un JSON malformé ou une autre erreur
de lecture arrête le démarrage avant HTTP et les interactions externes,
avec un diagnostic sans contenu persistant ni chemin runtime.
Le fichier reste intact. Ni l'orchestrateur, ni le superviseur ne fabriquent
un contrat vide ou une clôture pour contourner cet échec.


## Cadences de pilotage

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
n'invente aucun gate terminal. La seule exception de purge est définie dans
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

## Compactage coordonné et continuité

Prévoir un cycle commun de compactage toutes les 1 h 30 (5 400 secondes),
à une frontière entre mandats après traitement du rapport et sauvegarde du
checkpoint. Utiliser uniquement les API natives des sessions réellement
actives : OpenCode `POST /session/<id>/summarize` et, lorsqu'elle est exposée
par la connexion propriétaire, Codex App Server `thread/compact/start`.

Un accusé de lancement ne prouve pas la fin. Pour Codex, observer l'item
natif `contextCompaction` achevé et corrélé au bon thread ; une session
auxiliaire ne remplace pas l'orchestrateur principal. Consigner identifiant
du cycle, sessions, horodatages, retards et résultats sans secret.

Une API absente ou un échec avec contexte préservé laisse le cycle incomplet,
sans fabriquer une réussite conjointe ni bloquer à lui seul le RUN.
Après réconciliation sûre des contextes, OpenCode, MCP, CAB et permissions,
poursuivre les mandats autorisés. Un compactage encore en cours, un effet
inconnu ou une réconciliation impossible suspend les opérations concernées.
Ce cycle ne ferme ni ne redémarre les agents et ne rejoue aucune opération.

## Clôture et bilan documentaire

L'orchestrateur vérifie les critères, les tâches, les tests, la cohérence
documentaire et les rapports d'archive avant de demander une clôture normale.
Une clôture pour dépendances manquantes relève de la clôture différée : le
bilan est enregistré dans `BLOCKERS.md` et référencé depuis `tasks.md` et le
checkpoint lorsqu'ils existent, avec preuve de relecture. Il distingue les
tâches prouvées et les contrôles empêchés, sans exiger de
réussite globale ni d'archive du change incomplet. Le gate est BLOQUÉ et les
ressources du seul RUN sont libérées après désarmement et réconciliation.
La présence de STATISTIQUES.md, ses six sections, UTF-8/LF et les totaux
doivent être prouvés pour chaque archive ; les mesures absentes sont N/A
motivées. Un rapport échoué est repris sans réarchiver.

Le gate local est demandé par `POST /runs/<run_id>/job/terminal-gate` avec un état explicite
TERMINÉ ou BLOQUÉ. Un refus laisse le job ouvert avec sa cause. Un gate validé
permet le désarmement du seul job correspondant. Seulement après libération et quiescence de tous les RUN, il permet l'arrêt autorisé du
superviseur avant le contrôleur. Le broker reste géré par OpenCode.

Le compte rendu distingue résultat livré, préparation, attente, refus,
erreur et blocage. Il indique les opérations réellement exécutées, les
limites de preuve, les fichiers touchés et le premier jalon restant.
Une fin de tour, un délai, une réponse textuelle ou une relance technique
ne remplace jamais un état terminal prouvé.

## Clôture ciblée et dépendances manquantes

Après gate individuel, désarmement et réconciliation, POST /runs/<runId>/release
porte version, delivered et evidence. delivered=true exige gate TERMINÉ,
livraison et rapport prouvés. La clôture différée pour dépendances manquantes
exige gate BLOQUÉ, bilan durable, désarmement et effets réconciliés ; libérer
avec delivered=false sans archiver le change incomplet. Un sous-job rend le
contrôle au parent ; aucune libération ciblée n'arrête l'infrastructure commune.

## Pilotage concurrent CAB 1.10.4

### CAB 1.10.4 — coordination atomique par ressource

Un processus OpenCode, un broker MCP stdio, un contrôleur et un superviseur servent plusieurs RUN dans un répertoire commun. Chaque RUN conserve session, job, décisions, preuves et checkpoint. Le contrat courant est `resource-scoped-v1` ; l'ancienne barrière ordinaire d'intégration n'est plus admise.

#### Réservation et périmètre

Consulter GET /runs et OpenSpec avant sélection. Réserver exclusivement change et intention avant préparation par POST /runs/reserve : runId, ownerId, sessionId, directory, changeId, selectionKey, resources et dependsOn. Un RUN traite un change réservé à la fois ; les sous-jobs héritent du parent. Chaque change suivant emploie session, jobId et génération neufs.

Les ressources déclarent la portée autorisée ; leur recouvrement ne bloque plus la réservation des changes compatibles. Examiner les dépendances sémantiques : fichiers distincts ne prouvent pas l'indépendance d'un contrat. Les clés file: sont relatives et canoniques ; un répertoire couvre ses descendants. Les ressources logiques couvrent contrats, bases, ports, sorties et index/références Git distinctement autorisés. Les alias physiques connus sont refusés.

Un fichier est partagé par défaut. exclusiveResources, sous-ensemble explicite de fichiers du manifeste, demande l'optimisation privée. CAB la vérifie avant effet. L'arrivée d'un accès recouvrant ferme cette admission exclusive ; le pair attend les effets concernés avant accès partagé, sans drainer les RUN indépendants.

/extend et /resources contrôlent génération, portée et frontière sûre. Une réduction ne libère aucun effet inconnu ni obligation de publication. Le checkpoint reste output/<prompt>/<run_id>/state.json ; la reprise historique conserve preuves et propriété sans écraser un pair.

Après STOP et libération réconciliée, le même propriétaire peut réserver de nouveau le RUN. La réservation close ABANDONED ou DELIVERED et sa suspension restent dans l'historique ; la nouvelle génération et son contexte n'héritent pas du STOP. Une réservation encore RESERVED en PAUSE ou STOP, un gel global, un propriétaire divergent ou un change déjà livré restent bloquants. Aucune décision consommée ni permission native n'est transférée.

#### Préparation, décision et accès

1. Déclarer entrées, écritures et ressources logiques exactes. Une commande sans manifeste exploitable est refusée ; CAB ne devine pas ses effets et ne réserve pas automatiquement project:*.
2. Lire GET /runs/<runId>/locks pour les révisions. Une lecture stable acquiert brièvement son ensemble en lecture, lit puis libère ; une observation non stable ne prouve pas une validation.
3. Préparer le contenu exact. request_validation conserve ses champs et ajoute coordination_protocol=resource-scoped-v1, run_id, reservation_version, operation_id, operation_digest, resources et expected_revisions. Une édition exige un fichier unique couvert en écriture ; une commande décrit son manifeste complet. L'empreinte représente le contenu examiné par l'orchestrateur.
4. Attendre la décision explicite sans garder inutilement une écriture exclusive. Une base modifiée impose relecture, nouveau contenu et nouvelle demande ; aucune décision terminale n'est remplacée.
5. Après approbation, acquérir l'ensemble juste avant effet. Un fichier privé prouvé peut utiliser l'admission exclusive interne sans appel séparé de verrou partagé.
6. Garder les règles natives ask. CAB recontrôle identité, révisions et protection avant une unique permission once. Ni réservation, ni acquisition, ni readiness ne constitue une approbation.

POST /runs/<runId>/locks/acquire reçoit version, operationId, operationDigest (SHA-256 hexadécimal), resources et expectedRevisions. Il retourne HELD avec token/fencing, ou HTTP 202 WAITING sans acquisition partielle. Une réémission identique expose l'état courant ; un contenu divergent est refusé. Une base changée pendant l'attente produit STALE sans effet : annuler et préparer une opération neuve.

Les lectures coexistent ; toute écriture exclut les accès recouvrants. La FIFO s'applique entre demandes incompatibles ; une demande indépendante avance et de nouveaux lecteurs ne dépassent pas un écrivain antérieur. Un détenteur n'attend jamais l'extension/conversion de son ensemble : terminer/libérer puis demander l'ensemble complet.

Pour un groupe cohérent, annoncer les sous-opérations, leur access_id commun et operationIds à l'acquisition. Chaque édition/commande garde sa décision et once. Après un effet connu, /locks/attach peut rattacher une correction nouvellement approuvée dans le même ensemble détenu, sans ressource nouvelle ni permission réutilisée. Un drainage global interdit aussi les nouvelles sous-opérations.

#### Fin et reprise des effets

La permission émise reste suivie jusqu'à une fin d'outil native corrélée : session, type, cible, identifiant d'appel disponible et bornes temporelles. SSE ou historique HTTP fournit la preuve. idle, silence, timeout et expiration d'approbation ne suffisent pas.

POST /runs/<runId>/locks/release porte version, operationId, token, fencing, outcome et evidence. COMPLETED exige toutes les fins ; NO_EFFECT exige l'absence d'écriture prouvée. RECONCILED permet une frontière intermédiaire examinée avec effets connus et sous-opérations non commencées annulées ; il ne constitue pas une publication réussie. Une issue inconnue conserve toujours ses protections. /locks/cancel n'annule que les attentes ou acquisitions périmées sans effet commencé.

Les écritures connues avancent les révisions des ressources et invalident les lectures de sous-arbre concernées. Les écritures à publier restent suivies après libération. Après crash, les protections sont restaurées mais l'ancien jeton ne permet aucune nouvelle once. /locks/reconcile vérifie la frontière connue, annule les anciennes sous-opérations non commencées et émet un jeton/fencing neufs sans relâcher les fichiers ; les corrections conservent des identités et décisions neuves. Réconcilier les effets sans rejouer une permission consommée. Le prévol de récupération garde ses règles strictes ; terminer/libérer son accès avant transfert de session.

#### Environnements de test Docker et LXC

Avant toute préparation, déclarer les environnements dans le manifeste du change, puis vérifier `testResourceProtocol=test-resources-v1` sur le contrôleur. Une identité non secrète stable représente le moteur Docker (`docker:engine-a`) ou l'instance LXC sur son hôte (`lxc:host-a/101`). Employer la même clé pour tous les alias physiques ; si cette identité ne peut être établie, arrêter avant le test. Les clés acceptent des identifiants en minuscules, chiffres, tiret, point ou souligné, sans URL, secret ni accès à project.env. La réservation couvre les RUN d'un même registre CAB ; elle ne constitue pas un verrou hôte entre contrôleurs indépendants.

1. Appeler `POST /runs/<runId>/test-resources/acquire` avec `version`, `transactionId`, `resources` (clés en `write`) et `evidence`. Demander l'ensemble complet sans accès temporaire détenu ni autre réservation de test. `HELD` fournit `token` et `fencing` ; HTTP 202 `WAITING` n'attribue aucune partie de l'ensemble. Répéter la même transaction consulte son état ; un contenu divergent est refusé.
2. Préparer et faire approuver séparément chaque commande de préparation, de test, de nettoyage et de vérification. Chacune déclare les clés Docker/LXC réellement touchées et ses autres ressources. Acquérir/libérer ses accès `/locks/...` normalement. La réservation de test reste détenue entre les commandes ; chaque permission conserve son unique `once`.
3. Vérifier la fin native de tous les tests, y compris processus détachés et ressources temporaires. Exécuter un nettoyage puis une commande distincte vérifiant la restitution de chaque environnement, avec des identités d'opérations neuves et exit 0. L'orchestrateur examine les commandes et preuves : CAB contrôle leur corrélation et leur ordre durable, sans interpréter leurs sorties ni deviner l'état Docker/LXC. Ne jamais utiliser un simple `/usr/bin/true` comme preuve d'un nettoyage réel.
4. Après libération des accès temporaires, appeler `POST /runs/<runId>/test-resources/release` avec `version`, `transactionId`, `token`, `fencing`, `evidence` et `cleanup`. Ce tableau contient une entrée par clé : `resourceKey`, `cleanupOperationId`, `verificationOperationId`, `restored: true`. Les opérations appartiennent au même cycle ; nettoyage et vérification sont postérieurs à tous les autres tests de leur environnement. Un booléen seul, un nettoyage échoué, une fin inconnue ou une opération encore active refuse la libération. Un test échoué peut libérer un environnement restitué sans devenir un succès. Le reçu est idempotent.

`GET /runs/<runId>/test-resources` expose réservations, attentes, propriétaire et besoin de réconciliation. `/test-resources/cancel` avec version, transactionId et evidence annule uniquement une attente. Après crash, PAUSE, STOP ou délai dépassé, conserver les protections. `/test-resources/reconcile` exige l'ancien jeton/fencing, la génération, un `reconciliationId` neuf et les preuves ; après recontrôle natif, il renouvelle jeton/fencing sans libérer l'environnement. Réconcilier séparément les accès de commande restaurés et ne jamais rejouer une once consommée. Publication, réduction de portée, changement de génération et gate normal restent bloqués jusqu'à restitution.

Le registre 4 n'ajoute `testReservations` qu'au premier usage. Les anciens lecteurs stricts refusent cet état enrichi ; revenir à un ancien lecteur après utilisation demande une réconciliation/conversion autorisée, sans effacer les protections. Cette préparation 1.10.4 n'installe ni ne migre aucun runtime et ne propage aucun prompt consommateur.

#### Navigateurs externes de test

Les navigateurs headless déclarés dans DEVOPS.md suivent exactement le même cycle `test-resources-v1`, actuellement Chromium et Firefox. Employer `browser:<identité-hôte>/<identité-navigateur>`, par exemple `browser:host-a/chromium` ou `browser:host-a/firefox`, pour identifier le mécanisme partagé sur l'hôte. Ne pas inventer une nouvelle identité pour contourner un navigateur déjà occupé. Un navigateur distinct peut avancer indépendamment ; un groupe Docker/LXC/navigateur est acquis en une seule transaction sans détention partielle.

Avant restitution, prouver la fermeture des sessions WebDriver/BiDi et des processus de test, ainsi que la libération des ports et profils temporaires appartenant au change, puis vérifier l'environnement par une commande distincte. Ne fermer aucune session utilisateur préexistante. La simple fin du scénario navigateur ne suffit pas. Les routes, preuves natives, reçus, génération, reprise après crash et barrières de clôture sont ceux des environnements Docker/LXC. Les permissions unitaires restent requises.

#### Validation, publication et rapport

Protéger les seules entrées et effets utiles. openspec validate --all --strict protège en lecture OpenSpec, configuration et changes nécessaires ; les éditions de code indépendantes continuent. Les tests peuvent protéger une base ou des sorties. Une grande portée reste un conflit de ressources, pas une exclusion globale CAB.

Après validation, conserver les protections ou réacquérir et comparer les révisions des preuves avant publication. Réexaminer uniquement les validations/dépendances affectées. La séquence commune de publication ne rend pas les preuves indépendantes périmées. L'orchestrateur examine les preuves métier ; CAB ne lit pas le projet à sa place.

POST /runs/<runId>/publish porte version, transactionId, operationId, token, fencing, outcome=COMPLETED, proofRevisions, evidence et éventuellement reportFile. L'accès couvre toutes les ressources écrites à publier et les dépendances des preuves. Reçu, séquence, révisions, génération et libération sûre sont persistés ensemble. Répéter la transaction restitue le reçu même après livraison, sans nouvelle permission ; un contenu divergent est refusé.

Synchronisation et archivage OpenSpec restent des mandats distincts autorisés décrivant sources, destinations et parents utiles. Ils attendent les seuls accès incompatibles. Git reste distinctement autorisé ; son index/référence est une ressource logique sans gel des éditions indépendantes.

Le passage atomique en REPORT, ou /closing après publication, limite irréversiblement le contexte au STATISTIQUES.md de sa propre archive. Écrire et vérifier ce rapport sous son seul accès. Rapport à six sections, preuves, gate individuel, désarmement puis /release restent obligatoires avant livraison. Une archive seule ne prouve pas la fin du change ou du parent.

#### Pause, arrêt et exceptions communes

POST /runs/<runId>/suspend avec version, action=PAUSE|STOP|RESUME et evidence cible ce seul RUN. Les effets en cours restent protégés jusqu'à frontière sûre. STOP ne signifie ni livraison ni gate TERMINÉ. Le superviseur ne relance pas un RUN suspendu ou en attente de ressource.

Les seules causes globales sont GLOBAL_RECONCILIATION (état commun non isolable), SHARED_MAINTENANCE (infrastructure/formats communs), GLOBAL_PAUSE et GLOBAL_STOP (demandes explicites concernant tous les RUN).

POST /coordination/global/request exige transactionId, cause, scope=all, authorization et evidence. DRAINING ferme les admissions. /coordination/global/confirm vérifie la cohorte native et les protections avant HELD. /coordination/global/release exige transaction, génération, autorité et preuves de reprise ; aucun délai ne libère le gel. Une défaillance commune d'intégrité ferme conservatoirement l'admission pour réconciliation sans réparation ni purge. Une incertitude localisée reste ciblée.

/cab pause|stop --run <run_id> est ciblé ; --all est explicitement global. Le démarrage d'un RUN rejoint l'infrastructure sans purge/reconnexion. Fermer ou redémarrer OpenCode exige une demande distincte. Le healthcheck reste diagnostique. La purge refuse réservations, accès actifs, effets incertains, gel non libéré et état invalide.

#### Compatibilité historique unique

Les anciens usages uniques sans RUN conservent leurs décisions et once. Une trace durable de leurs sessions/racines interdit leur coexistence avec les RUN coordonnés. Pour passer au profil Multi-RUN, clore le job historique éventuel, demander GLOBAL_RECONCILIATION ou SHARED_MAINTENANCE, vérifier les sessions/racines natives et faire examiner les effets, puis /coordination/legacy/reconcile avec transactionId, authorization et evidence sous HELD. Seule cette clôture prouvée efface la trace active ; idle ou un redémarrage seul ne suffit pas. L'historique de clôture est conservé et la purge refuse une trace non réconciliée.

#### Formats et migration

Le registre 1.10.4 utilise le schéma 4 ; les schémas 1/2/3 sont lus en mode migration requise sans anciennes acquisitions globales. Les mutations incompatibles reçoivent coordination-upgrade-required. Broker, clients et contrôleur confirment le protocole avant permission. Le broker concurrent notifie /validation/resource-request et /validation/resource-reminder, routes absentes des anciens contrôleurs, sans repli incompatible. Les versions des modules chargés sont vérifiées avant démarrage. Le magasin broker reste au schéma extensible 2 : les nouveaux champs sont persistés et corrélés, sans conversion implicite des anciens enregistrements.

La migration explicitement autorisée vérifie quiescence et sauvegarde privée avec empreinte. RUN, demandes consommées, jobs, candidates et reçus sont conservés ; les ressources historiques restent conservatrices. /coordination/migrate conserve les RUN en PAUSE et impose maintenancePreflightRequired. Vérifier MCP/SSE/readiness en lecture, lever explicitement le gel pour le prévol ciblé en maintenant les pairs en pause, puis autoriser uniquement /usr/bin/true avec manifeste read. Une once acquittée et exit 0 prouvés avant libération de cet accès autorisent ensuite le métier ; un échec conserve cette obligation. /coordination/rollback restitue la sauvegarde uniquement avant nouvel usage sous maintenance quiescente. Le retour arrière avant nouvel usage restitue la sauvegarde exacte ; après de nouveaux effets, une réconciliation/conversion explicite est obligatoire. Une préparation source ne déploie ni ne migre aucun état actif.

#### Statistiques et consultations

La collecte distingue réservations, natif observé, attente/détention/promotion de ressources, réconciliation ciblée et quatre causes exceptionnelles. Les lacunes restent inconnues ; durées et paires recouvrantes ne s'additionnent pas. Busy ne prouve ni codage productif ni gain causal.

GET /statistics et /runs/<runId>/statistics conservent les agrégats et le brouillon individuel à six sections. /statistics/view et /runs/<runId>/statistics/view acceptent selection=current|last|24h|7d|30d, cible/contextId éventuels et format=markdown. /cab stats, /cab statslast, /cab stats 24, /cab stats7 et /cab stats30 sont ponctuels, sans action de cycle de vie.

POST /statistics/import accepte seulement un bundle filtré du projet exact avec provenance/empreinte, sans modifier permissions, décisions ou réservations. L'importeur distribué lit en flux borné les fichiers d'audit explicitement désignés, sans suivre les chemins du contenu ni réactiver le job arrêté. Sources natives/importées restent séparées. Les quotas sont partagés et comparés seulement à compte/fenêtre identiques. Contenu, commandes, chemins d'opérations, URL et secrets sont exclus.

Sans candidat, distinguer dépendance, conflit et absence de travail restant prouvée. CISM, CAISM et prompts directs restent hors concurrence pilotée. La propagation vers les projets consommateurs exige son autorisation propre.

#### Maintenance d'une récupération gelée

Le profil explicitement autorisé frozen-recovery-controller ajoute une
autorité privée BOOTSTRAP_HELD après DRAINING et refus de l'ancien contrôleur.
Il vérifie la récupération nommée sans effet, ses deux sessions et tous les
pairs, puis charge le contrôleur avant adoption du véritable HELD. La
libération de maintenance conserve la récupération. Cette exception ne
concerne ni une intégration courante ni un prévol commencé ou incertain.
Le contrat, les versions mixtes qualifiées et les limites du repli sont
définis par references/component-update.md ; aucune activation n'est déduite
du travail source ou de la disponibilité de ce profil.
