# Mandats et rapports — CAB 2.2.8

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

Après ces contrôles, l’agent entre en analyse dans le seul périmètre autorisé
et suit l’ordre de lecture ci-dessus : `DEVELOPMENT_MAP.md` après `DEVOPS.md`
et avant les spécifications et changes OpenSpec. L’orchestrateur distingue les
sources effectivement consultées, les limites et les informations revérifiées
dans les preuves reçues.

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
Utiliser la cartographie lue préalablement comme repère, après revérification
des informations déterminantes contre ces sources et les preuves actuelles.
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

À toute nouvelle sélection ou reprise, respecter l’ordre de lecture ci-dessus,
avec `DEVELOPMENT_MAP.md` avant OpenSpec. Lors de l’examen des changes, lire
`BLOCKERS.md` lorsqu'il existe pour chaque candidat. Revérifier les dépendances
sur l'état courant par des lectures ou contrôles ciblés autorisés sans effet de bord ;
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
« Rapport durable de blocage et réévaluation », puis appliquer « Statistiques
des sessions pilotées » pour le change ouvert. Vérifier les deux rapports et
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

### Rapports statistiques et nettoyage des sessions

Appliquer les sections communes « Statistiques des sessions pilotées » et
« Nettoyage final des sessions de l'agent de codage ». Les procédures du
profil s'y ajoutent sans limiter les rapports aux seuls changes archivés.
