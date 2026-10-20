# Conception

## Catalogue commun

Le module distribué `cgpt-approval-bridge-run-steps.mjs`, version 1.5.0,
définit la source commune des identifiants, noms et positions.

| Position | Identifiant | Nom |
| --- | --- | --- |
| 1 | INITIALIZATION | Initialisation |
| 2 | PREFLIGHT | Prévol |
| 3 | ANALYSIS | Analyse |
| 4 | SCOPING | Cadrage |
| 5 | SPECIFICATION | Spécification |
| 6 | IMPLEMENTATION | Implémentation |
| 7 | VERIFICATION | Vérifications |
| 8 | REVIEW | Revue |
| 9 | ARCHIVING | Archivage |
| 10 | STATISTICS | Statistiques |
| 11 | CLOSURE | Clôture |

Ces positions ne représentent ni un nombre d'étapes définitivement validées,
ni une durée. Toute étape antérieure peut être reprise explicitement tant que
le job est non terminal. Une étape déjà couverte ou non applicable conserve
sa position et un état explicite. Attente, pause et blocage restent des états
transversaux ; ils ne créent aucune douzième étape.

## Contrat de progression et persistance

POST /job/progress et sa route par RUN acceptent stepId, stepStatus et
expectedStepSequence. stepStatus vaut IN_PROGRESS, ALREADY_COVERED ou
NOT_APPLICABLE ; IN_PROGRESS est le défaut d'une déclaration. La séquence
attendue protège contre une déclaration concurrente périmée ; une répétition
identique de la dernière déclaration est idempotente. La séquence initiale
vaut zéro lorsque le job ne porte aucune étape.

Le job conserve lifecycle, schéma 1, avec sequence et au plus 100 entrées
history contenant sequence, id, status et at. La dernière entrée détermine
l'étape courante. La date est attribuée côté contrôleur. Aucun libellé libre,
preuve inventée ou commande n'est accepté dans ce contrat. Une étape inconnue,
une déclaration partielle ou une séquence périmée est refusée avant mutation.
Après validation du gate, aucune nouvelle déclaration d'étape n'est acceptée.
L'état de clôture et les permissions restent exclusivement régis par les
contrats existants ; CLOSURE ne ferme aucun gate.

Les appels historiques sans ces nouveaux champs conservent leur comportement.
Les jobs anciens sans lifecycle restent lisibles et affichent une étape
inconnue. Un lifecycle présent mais malformé refuse la restauration selon le
contrat de démarrage existant, sans réparation. Un réarmement du même job
conserve son historique ; une récupération du même RUN le conserve également.
Un nouveau job démarre sans déclaration d'étape.

## Observation et interface

Le contrôleur publie lifecycle et un événement lifecycle-step-changed limité
aux identifiants et enums fermés. Le moniteur projette le catalogue commun,
l'étape courante et son historique vers sa vue JSON/SSE. La page présente ETAT, ÉTAPE et les tâches X/Y ; elle conserve la phase
technique dans le détail du RUN et y propose le cycle et les passages.
ETAT est dérivé des observations fraîches : RUNNING, WAITING, PAUSED, STOPPED,
BLOCKED, DEGRADED, DONE, RELEASED, IDLE ou UNKNOWN. Une attente de ressource
ou de décision donne WAITING ; elle ne change pas l’étape courante.
L’ancienne colonne ÉTAT OBSERVÉ et PHASE sont regroupées dans la colonne ETAT. Une ancienne source ne devient pas une preuve d'étape actuelle.

Les versions sont prises depuis status.version du contrôleur et du
superviseur, brokerReadiness.server_version et global/health.version
d'OpenCode. Le moniteur fournit sa propre version. Seules les versions au
format SemVer borné sont exposées ; l'absence reste indisponible. Les dates
et l'état de fraîcheur déjà existants s'appliquent aussi aux versions.

## Livraison et validation

La livraison reste une préparation source 1.5.0 ; aucun cache installé ou
service actif n'est modifié. Pas de nouvelle dépendance. Le repli consiste
à ne pas déclarer d'étape et conserver les consultations existantes. Tests de
catalogue, retours 8→6, idempotence, concurrence, redémarrage, absence de phase
inventée, versions distinctes et inconnues, gates inchangés ; qualification
Chromium/Firefox avec phase en détail et colonnes ETAT/ÉTAPE et mises à jour sans rechargement.


La surbrillance concerne uniquement la ligne du job dans Espace de travail :
WAITING en jaune et BLOCKED en rouge. Le code ETAT reste affiché et la sélection
possède un repère distinct. Une source ancienne donnant UNKNOWN retire la
surbrillance d'état courant. Aucun autre panneau n'est coloré selon ce contrat.
