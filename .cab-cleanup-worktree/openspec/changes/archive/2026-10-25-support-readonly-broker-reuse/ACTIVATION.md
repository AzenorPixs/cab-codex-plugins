# Procédure proposée — CAB 1.9.0, sans activation exécutée ici

Ce change est une préparation source CAB. Les seules opérations effectivement
exécutées concernent CAB et ses bancs isolés. Les archives L1/L2 restent closes,
avec leur qualification historique 1.8.0. Le passage source à 1.9.0 demandé
ici ne relance aucun processus consommateur.

## Autorités séparées

Le propriétaire de la session consommatrice doit autoriser et contrôler M2,
la réparation du prévol coordonné, puis M3 et les reprises. Les résultats SCM
ne valent aucune de ces décisions. La résolution R0 a été annoncée par le
chat propriétaire comme terminée via l'API existante ; elle n'est pas exécutée
ou réinterprétée ici. Toute entrée opérationnelle reste à recontrôler en direct.

M2 conserve son profil frozen-recovery-controller, ses preuves, ses pairs
sous PAUSE et le prévol courant seul PENDING. Il utilise le manifeste du
contrôleur source courant 1.9.0, jamais l'empreinte historique 1.8.0. Le
rejet local corrélé et le retry du prévol coordonné restent distincts. Après
complete, placer aussi la cible sous PAUSE explicite avant M3.

## Préparation de M3

Pour le cas d'un broker lancé depuis CAB/src sous UID/GID 1002 et de services
sous UID 1000, l'outil est exécuté par l'acteur des services. Il ne copie,
remplace, renomme, compile sur place ou change aucun droit des trois modules
broker. Les sources de lancement sont maintenant 1.9.0 ; le processus ancien
peut rester chargé en 1.7.1 jusqu'à une reconnexion distinctement autorisée.

Préparer hors de toute destination installée un JSON privé 0600 appartenant
à l'acteur. Ses seules clés sont :

```text
authorization : décision spécifique de maintenance
entry : chemin réel exact du serveur broker
expectedUid / expectedGid : propriétaires autorisés des trois fichiers
manifest : SHA-256 des trois modules broker, identiques au paquet 1.9.0
loadedVersion : version du broker actuellement chargé, observée nativement
instanceId : instance native actuellement observée
opencodeProcess : pid / startTime / uid du parent à conserver
brokerProcess : pid / startTime / uid de son enfant actuellement chargé
```

Les trois noms sont cgpt_approval_bridge_server.py,
cgpt_approval_bridge_router.py et cgpt_approval_bridge_journal.py. Les fichiers
sont réguliers sans liens/alias, sous le répertoire déclaré, avec empreintes
et UID/GID vérifiés. Le chemin de lancement natif est lié au processus ; aucun
environnement ou argv brut n'est publié. Une observation historique ne suffit
pas à remplir les identités de la preuve.

Le script update.mjs reçoit les cibles et URL loopback réelles habituelles,
--layout managed-release --broker-policy reuse-readonly --broker-proof-file
avec ce JSON. Ce sont des paramètres à résoudre et faire examiner avant effet,
pas une commande prête à lancer depuis ce document. La configuration MCP et
le processus OpenCode restent conservés ; OpenCode relance lui-même son enfant
sous son UID. Aucun sudo, chown, chmod, déplacement ou nouveau chemin MCP hôte
n'est nécessaire à ce mode.

## Cycle observable et reprise

1. Vérifier le paquet, la preuve, les sources et les processus ; conserver les
   snapshots des identités métier. Tous les RUN réservés doivent être sous
   PAUSE, sans récupération, mandat, permission ou effet non réconcilié.
2. Obtenir le véritable HELD ordinaire, avec transaction et génération durables.
   Les fichiers broker sont exclus de la liste des artefacts à installer et
   des sauvegardes restaurables.
3. Arrêter les services gérés selon le cycle autorisé. Avant le premier appel
   de déconnexion MCP, persister disconnectIntentAt. Le journal distingue
   artifactVersion et beforeLoadedVersion ; la première ne remplace pas la seconde.
4. Après cette intention, toute réponse ambiguë ou panne conserve le gel et
   READONLY_RECOVERY_REQUIRED. Aucun retour au processus ancien n'est annoncé
   depuis les seuls fichiers cibles. --rollback est refusé après la frontière.
5. Reprendre la même commande et la même preuve : recontrôler le HELD persistant,
   la génération, les sources, OpenCode et les réservations ; réconcilier MCP
   et processus puis poursuivre vers le jeu autorisé. Une dérive bloque la
   reprise ; ne pas changer le journal ou créer une transaction de contournement.
6. Exiger trois services aux versions actives 1.9.0 et le nouveau broker 1.9.0,
   enfant du même OpenCode sous l'UID attendu, depuis l'entrée autorisée. Sa
   readiness doit être fraîche et postérieure à la reconnexion, avec une nouvelle
   instance. Vérifier les mêmes jobs, sessions, générations, réservations et PAUSE.
7. Lever seulement la maintenance corrélée. Faire ensuite valider les reprises
   et chaque mandat métier. Le succès de M3 n'autorise aucun métier à lui seul.

Une panne avant la frontière ne permet un repli que si le processus ancien et
les artefacts initiaux sont effectivement conservés et vérifiés. Après la
frontière, la récupération progresse vers le jeu cible sous gel. Les décisions,
permissions consommées, historiques et registres métier ne sont jamais restaurés.

## Limites de qualification

Le banc Docker autorisé par DEVOPS utilise des montages d'entrée hôte en lecture
seule, un espace éphémère et des processus réellement distincts UID 1000/1002.
Les comptes ajoutés au conteneur et ses permissions ne concernent pas l'hôte.
Il vérifie aussi un refus noyau d'ouverture en écriture du broker par UID 1000,
l'intention durable avant déconnexion et la reprise après réponse perdue.
QUALIFICATION.md rapporte les résultats réellement obtenus sur la cible finale.
Ce banc ne remplace pas les contrôles opérationnels du consommateur.
