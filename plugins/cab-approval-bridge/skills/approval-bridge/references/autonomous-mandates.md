# Mandat autonome et revue finale — autonomous-change-v1

## Autorité et préparation
Pour les nouvelles sessions pilotées, l’orchestrateur confie une mission complète.
Avant le codage, il résout avec le développeur les choix et décisions nécessaires
au change : fonctionnel, architecture, sécurité, ressources et critères. Le codeur
ne reçoit pas une liste de décisions encore à prendre. Une décision imprévue qui
dépasse le cadrage suit l’exception hors cadrage.

Le développeur autorise le change ; l’orchestrateur initialise projet/change/RUN/SID,
réservation, job et contrat, puis POST /runs/<RUN>/autonomy/mandate avec le header
x-cab-continuity: cab-continuity-v1 et un objet JSON :

```json
{"protocol":"autonomous-change-v1","mandateId":"mission-1","version":1,"sessionId":"ses_example","objective":"Objectif validé","criteria":["Critère observable"],"constraints":["Contraintes applicables"],"decisionsResolved":true,"decisions":["Décision du développeur et référence"],"paths":["src","tests"]}
```

Les chemins RW sont des fichiers ou sous-arbres existants, physiques, sans secret,
lien symbolique ni inode partagé ; créer de nouveaux fichiers dans les sous-arbres
couverts reste libre. Ils doivent être couverts par la réservation et disjoints des
réservations des pairs. Préparer des chemins suffisamment larges pour le change,
sans élargir au projet entier. Refus avant travail si décisions non résolues,
périmètre incohérent, effets en attente ou conflit. Aucun mandat implicite pendant CABU.

## Coordination déléguée

Les nouvelles missions utilisent coordination:true dans le mandat initial ;
les RUN historiques suivent le transfert explicite de [coordination codeur](coder-coordination.md).
Le codeur coordonne ses dépendances sans relais courant par le parent.

## Réalisation sans validation intermédiaire
Le codeur utilise atelier_execute et atelier_status avec les identités du RUN.
Le contrôleur applique le mandat initial ; aucun request_validation, décision LLM,
permission once par opération ou compte rendu intermédiaire n’est nécessaire.
Le lanceur existant fournit les chemins du mandat RW, le reste du projet RO,
les pairs/secrets masqués et le réseau isolé. Le répertoire courant est le projet.
Les essais historiques sans mandat conservent leur atelier RO/RW antérieur.

Le codeur organise lectures, écritures, tests, corrections et constructions dans
ce périmètre ; il n’attend pas l’approbation d’un résultat intermédiaire. Une
commande échouée se diagnostique et se corrige. Le choix des tests et des bancs
couverts par le cadrage appartient au codeur. L’atelier isolé n’accorde pas à lui
seul un accès externe : un banc doit disposer de sa voie technique autorisée et
qualifiée ; aucun shell hôte libre ou socket de contrôle n’est déduit du mandat.

Les reçus connus ne sont pas rejoués, même après perte de réponse. atelier_status
permet de reprendre l’acquittement contrôleur d’un résultat terminal. Un INTENT
non réconcilié bloque les seuls nouveaux effets du RUN ; ne jamais en fabriquer
la fin. La supervision reste passive et ne relance pas le LLM périodiquement.
SGS distingue opérations techniques, mandat initial, exceptions, soumissions et revues.
Après envoi de la mission, l’orchestrateur attend mécaniquement avec :

```text
node scripts/cgpt-approval-bridge-autonomous-wait.mjs --controller http://127.0.0.1:8788 --run RUN
```

Le lanceur installé suit le flux SSE, vérifie le dossier courant et ne rend la
main que sur soumission finale ou exception non décidée. Aucun tour LLM périodique.
Une déconnexion est signalée ; relire l’état durable avant de rétablir l’attente.

## Exceptions, quatre motifs
Le codeur appelle autonomy_exception avec les identités usuelles, request_id,
summary et category : outside-change, outside-framing, missing-tool ou
web-consultation. L’orchestrateur décide dans sa délégation ; le développeur
tranche les extensions réservées. Un accord précise la portée, les ressources
et la durée utile ; une consultation documentaire cohérente ne demande pas une
approbation par page. Les opérations indépendantes continuent.
La réponse est enregistrée par POST /runs/<RUN>/autonomy/exception-decision
avec requestId, decision approved/rejected et scope explicite ; autonomy_status
permet au codeur de la consulter sans nouveau message. Le signalement ne vaut pas accord ; les outils réseau natifs gardent leur voie
explicite. Une extension des chemins/réservations requiert un mandat révisé à
frontière inactive. Une panne irrécupérable est un constat technique documenté,
pas une cinquième validation métier récurrente.

## Bancs externes

Après cadrage initial ou exception approuvée, [le profil externe](external-execution.md)
fournit une voie effective et des reçus corrélés aux tests, sans validation par commande.
L’atelier isolé local ne reçoit aucun accès SSH ou credential par cette délégation.

## Soumission et revue finales
Le codeur appelle autonomy_submit avec identités, request_id et submission :
submissionId, summary, tests et limits. Chaque test fournit criterion (critère du
mandat), requestId de l’essai, receiptDigest renvoyé par le broker (facultatif : résolu par requestId) et outcome
passed/failed/unavailable. Tous les critères sont couverts, avec limites explicites.
Un succès ne peut citer un essai échoué ou une révision antérieure. Le contrôleur
conserve les reçus et l’empreinte des sources ; REVIEW_PENDING interdit les
nouvelles écritures. Les événements autonomy-review-requested et
autonomy-exception-requested réveillent la consultation utile, sans polling LLM.

L’orchestrateur consulte GET /runs/<RUN>/autonomy et les preuves, examine le diff,
la pertinence et la couverture des tests ; un exit0 ne remplace pas cette revue.
Il POST /runs/<RUN>/autonomy/review avec reviewId, submissionDigest,
decision accept ou changes-requested et reason. Un refus regroupe les corrections
et rouvre WORKING ; le codeur revient avec les preuves de la révision corrigée.
L’acceptation exige les contrôles requis réussis et la révision soumise inchangée.
Après acceptation, POST /runs/<RUN>/publish utilise transactionId, version,
submissionDigest et evidence. Ce reçu autorise l’intégration CAB ; le commit,
push, publication CI/CD ou déploiement restent exécutés suivant le mandat métier.
Un changement de sources après revue invalide l’autorisation. Une modification
supplémentaire nécessite une demande de corrections et une nouvelle revue.

## Compatibilité et reprise
Le registre conserve mandat, identités, génération, reçus, dossiers et décisions.
Les anciens RUN restent sous leur profil historique ; ne pas convertir un RUN
actif par une modification de permissions globale. Après transfert ou changement
de génération, le mandat périmé n’est pas utilisable ; réconciliation et
réautorisation explicites à frontière inactive sont nécessaires. Un mandat révisé
fournit replaces égal à inputDigest du précédent ; son historique reste conservé
et aucun remplacement n’est possible avec un effet incertain. Aucun repli vers
les décisions par opération n’est lancé pour une nouvelle mission autonome.
Préserver les suspensions et checkpoints des sessions consommatrices pendant CABU.
Les versions de fichiers et des processus doivent concorder avant leur reprise.
