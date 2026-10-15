# CAB 1.0.0 — pilotage concurrent dans un contexte OpenCode commun

Un processus OpenCode et un broker MCP stdio servent plusieurs sessions.
Le contrôleur et le superviseur isolent leurs jobs par RUN. Le profil initial
utilise un même répertoire ; les worktrees exigent une qualification distincte.

## Identité et sélection

Le RUN parent conserve runId et ownerId pendant son cycle. Chaque change
emploie une nouvelle session OpenCode et un jobId inédit. Consulter GET /runs
et OpenSpec avant sélection. Un change présent n'est pas nécessairement pris
en charge ; une réservation RESERVED appartient exclusivement à son RUN.

Avant création ou préparation, soumettre POST /runs/reserve avec :

```json
{
  "runId": "cismp-example",
  "ownerId": "codex-example",
  "sessionId": "ses_example",
  "directory": "/racine/autorisee",
  "changeId": "change-example",
  "selectionKey": "capacite-exigence-version",
  "resources": [{"key": "file:src/component.py", "mode": "write"}],
  "dependsOn": []
}
```

La clé de sélection représente l'intention avant création du change. Examiner
les dépendances sémantiques, capacités OpenSpec, contrats, lectures, écritures,
migrations, ports, builds et services partagés. Utiliser des clés file:,
capability:, contract: ou resource:, avec mode read ou write. Les chemins sont
relatifs et un répertoire couvre ses descendants. project:* en écriture réserve
les effets inconnus à l'échelle du projet. Aucune indépendance n'est déduite
des seuls fichiers. dependsOn identifie les changes livrés dans le registre ;
Codex vérifie séparément les prérequis historiques établis hors registre.

La réservation atomique retourne version et contextId. Un conflit ne donne
aucune permission : sélectionner un autre candidat compatible ou attendre.
Un RUN ne possède qu'un change réservé à la fois. Après libération contrôlée,
le même RUN peut réserver son change suivant avec une nouvelle session et une
version fraîche ; l'historique et les requestId restent conservés.

## Mandats et routage

Les routes sont /runs/<runId>/status, /runs/<runId>/job/arm, progress, recover,
terminal-gate, disarm et /runs/<runId>/decision/<requestId>. L'armement reprend
exactement session, change et racine de la réservation ; strictCommands=true.
Les décisions restent explicites, unitaires, corrélées et consommables une fois.

Chaque request_validation inclut les champs habituels et run_id,
reservation_version ; une commande déclare aussi resources. Un fichier exige
une ressource file: en écriture. Une commande shell n'est pas analysée pour
deviner ses effets. Codex examine son manifeste avant décision. Une réservation
ne vaut jamais approbation. Garder les permissions natives ask et ne transmettre
aucun outil mutable sans le mandat exact.

Préparer une opération complète et vérifiable par fichier, avec contenu exact,
manifeste et outils disponibles avant armement. Traiter immédiatement demandes
et rapports par le SSE et la boucle existante ; ne pas reformuler le contenu
approuvé, fractionner une édition évitable ou répéter un contrôle sans nouvel
événement. Une seconde opération exige toujours une nouvelle décision et once.

broker_readiness accepte run_id. Les compteurs ciblés ne couvrent que ce RUN ;
les défaillances du magasin, du journal ou du transport commun restent communes.
Les requêtes et permissions d'une autre session ne sont ni consommées ni closes.
Après redémarrage, une ancienne demande sans décision restaurable reste à
réconcilier ; ne pas la rejouer, changer son identité ou inventer son résultat.

## Cycle, extension et intégration

Le checkpoint est output/cismp/<run_id>/state.json pour CISMP et
output/<prompt>/<run_id>/state.json pour les autres orchestrateurs. Un sous-job
hérite de celui de son parent. Le registre CAB attribue les changes ; le
checkpoint conserve les preuves et ne modifie jamais les réservations.

Si le fichier scopé manque lors d'une reprise, lire l'ancien
output/<prompt>-state.json en lecture seule, réconcilier RUN, propriété et
preuves natives, puis migrer seulement ce RUN sans écraser l'état d'un autre.
Un ancien job armé reste en mode historique sous les interfaces sans RUN
jusqu'à clôture réconciliée ; l'ajout de RUN concurrents est alors refusé.
Les anciennes permissions consommées ne sont jamais transposées.

Avant élargissement, fermer le mandat courant puis POST /runs/<runId>/extend
avec version et resources supplémentaires. Réutiliser la version retournée.
Une extension conflictuelle suspend le nouveau périmètre sans toucher aux autres.
Pour réduire la portée, POST /runs/<runId>/resources avec version, resources
et evidence après clôture du mandat et quiescence native. Chaque nouvelle
ressource est incluse dans l'ancienne, sans escalade read vers write ; reprendre
la génération retournée. Retirer les lectures globales devenues inutiles.
L'obligation de publication des écritures antérieures reste conservée.

Dans le répertoire partagé, chaque RUN déclare un jalon stable après ses
validations locales par POST /runs/<runId>/ready avec version et evidence.
L'intégration attend que les RUN métier réservés soient stables, sans mandat,
récupération ou effet en attente. Les validations globales portent sur l'état
combiné de ces changes stables ; chaque RUN conserve ses preuves locales.
La quiescence native couvre aussi les RUN en phase documentaire : une écriture
de rapport en cours doit finir avant acquisition et toute nouvelle édition
attend la levée de l'exclusion.

Le profil optimisé soumet d'abord POST /runs/<runId>/integration-request avec
version et evidence. GET /runs expose integrationQueue, FIFO durable par
contexte. Dès qu'une demande existe, terminer seulement l'opération autorisée
en cours, traiter son rapport, atteindre le prochain jalon sûr puis déclarer
/ready. Un RUN stable attend alors sans nouveau mandat. Les nouvelles
réservations attendent ; seule la tête peut acquérir après les contrôles natifs.
Une annulation explicite utilise la même route avec cancel=true, version et
evidence ; elle ne libère ni réservation ni effet. La réconciliation d'une
référence ne change pas la position en file. Aucun timeout ne décide ni ne
libère. Le mode historique sans file reste disponible.

Pour publier dans la référence commune, obtenir POST /runs/<runId>/integration
avec version et acquire=true. Revalider la base courante et les résultats
combinés, synchroniser et archiver sous autorisations explicites. Préparer les
agrégats statistiques avant acquisition. Les opérations Git restent soumises
à une autorisation distincte.
Pendant l'exclusion, les nouvelles opérations des autres RUN sont suspendues.
Le propriétaire peut déclarer project:* en lecture pour ses tests globaux.
Libérer avec acquire=false, published (booléen) et, si true, evidence après
publication prouvée ou abandon réconcilié. La version referenceVersion évolue
à chaque libération ; les autres RUN attendent la réconciliation par POST
/runs/<runId>/reconcile avec version, referenceVersion et evidence. Recontrôler
les empreintes et validations affectées sans rejouer les effets déjà prouvés,
puis utiliser la nouvelle version de réservation retournée. Une réservation
avec écritures ne peut être livrée sans publication sous cette barrière.
Ni CAB ni le superviseur ne valident les preuves à la place de Codex.

Après publication prouvée, libérer l'exclusion avant la rédaction finale du
rapport, puis POST /runs/<runId>/closing avec version, evidence et reportFile
égal à openspec/changes/archive/<date>-<changeId>/STATISTIQUES.md. La phase
REPORT est irréversible dans ce contexte : elle abandonne les autres ressources
et n'autorise que ce fichier. Conserver la génération retournée. Les pairs
réconcilient immédiatement la référence et reprennent ; les éditions natives
du rapport restent suspendues pendant toute autre exclusion et soumises à once.
Une référence ultérieure ne défait pas la publication figée de cette phase.
Sans closing, le mode historique conserve les gardes de référence existantes.

Après gate individuel, désarmement et réconciliation, POST /runs/<runId>/release
porte version, delivered (booléen) et evidence (références non secrètes des
preuves). delivered=true exige un gate TERMINÉ, la livraison et le rapport
prouvés. Une attente ou un effet inconnu ne libère jamais le change.

Sans candidat disponible, distinguer attente de dépendance, conflit de ressources
et absence de travail restant prouvée. Seul ce dernier constat, sans autre RUN
actif ni exigence restante, permet une fin globale. Les sous-jobs rendent le
contrôle au cycle parent et n'arrêtent pas l'infrastructure commune.

## Statistiques intégrées

La collecte du contrôleur est automatique pour chaque contexte concurrent ;
elle consomme transitions CAB et métadonnées SSE déjà reçues, sans RUN d'audit,
appel LLM ni historique brut supplémentaire. GET /statistics donne les agrégats
globaux ; GET /runs/<runId>/statistics donne ceux du contexte courant. Ajouter
contextId pour une génération de change antérieure, y compris après livraison.
format=markdown fournit le brouillon à six sections, prêt à examiner avant
mandat de publication. Préparer le brouillon en continu, compléter les bornes
après archive et les preuves accessibles, puis publier le seul rapport via CAB.

Les corps, commandes, URL et sorties sont exclus de la collecte. Les éléments
absents restent N/A motivés ; les relevés natifs de quotas et sondes existants
restent à la charge de l'orchestrateur, sans nouvel agent d'observation. Busy
ne prouve pas du codage productif. Les catégories reservation/native incluent
RSMP et inventaires ; changes/nativeChanges les excluent. Les prévols sont
exclus des quatre catégories. ZERO et INCONNU restent distincts. Les quantiles
médiane/p95 portent sur les dernières 2048 observations, avec compteur total.
Les tentatives HTTP, y compris avant admission, ne sont pas des refus distincts
de permission ; leurs bornes ne constituent pas une durée causale exhaustive.

La persistance statistique est regroupée et indépendante des décisions ;
une erreur est visible dans l'export. Ni l'export ni le brouillon ne valide les
tests, l'archive ou le rapport, et aucun quota partagé n'est ventilé arbitrairement.
Le rapport vérifié reste obligatoire avant gate TERMINÉ et /release.

## Récupération, purge et arrêt

Un démarrage rejoint l'infrastructure saine sans purge ni reconnexion globale.
Une récupération conserve le RUN, le change, les preuves et la candidate après
prévol divergent refusé sans effet ; utiliser prepare/retry/complete du même job.
Après transfert, relire GET /runs pour la nouvelle version avant tout mandat.
Une autre session réservée ne peut servir de candidate. Le prévol /usr/bin/true
doit être couvert par un manifeste sans effet, par exemple une lecture de la
capacité concernée ; il reste soumis à la décision CAB et à once.

/cab stop cible le RUN et ne ferme pas OpenCode. Arrêter les services communs,
déconnecter le broker, utiliser /instance/dispose ou purger exige la quiescence
et la réconciliation de tous les RUN affectés. Le script de purge refuse un
registre RESERVED ou invalide même si ses processus sont arrêtés. Le healthcheck
ne redémarre aucun service ; une action de cycle de vie reste coordonnée.

La sélection ne dépasse pas les spécifications et autorisations déjà validées.
Les sondes et compactages restent attribués à chaque RUN ; les quotas partagés
ne sont jamais présentés comme sa consommation exclusive sans preuve.
CISM, CAISM et les prompts directs ne participent pas à ce pilotage et ne sont
pas lancés en concurrence avec les sessions pilotées.
