# controller-transport Specification

## Purpose
Cette capacité définit le contrôleur CGPT local qui relaie une demande du broker vers CGPT et restitue une décision corrélée.

## Requirements

### Requirement: Interface locale limitée
Le contrôleur SHALL écouter uniquement sur `127.0.0.1` ou `::1`, par défaut
`127.0.0.1`, et SHALL conserver MCP hors de son interface HTTP. Il SHALL
exiger une exécution explicitement déclarée hors sandbox et un workspace de
projet absolu fourni au démarrage. Il SHALL NOT contenir de liste codée en dur
de projets pilotés.

#### Scenario: Démarrage sans autorisation hors sandbox
- **WHEN** le contrôleur démarre sans `OC_Codex_OUTSIDE_SANDBOX=1`
- **THEN** il échoue avant d'ouvrir son interface locale

#### Scenario: Hôte non local refusé
- **WHEN** `OC_Codex_STATUS_HOST` contient une adresse autre que `127.0.0.1` ou `::1`
- **THEN** le contrôleur échoue avant d'ouvrir son interface locale

#### Scenario: Workspace non autorisé refusé
- **WHEN** `OC_Codex_WORKSPACE` est absent ou relatif
- **THEN** le contrôleur échoue avant de lancer Codex App Server

#### Scenario: Workspace absolu générique
- **WHEN** `OC_Codex_WORKSPACE` désigne une racine de projet absolue
- **THEN** le contrôleur l'accepte sans comporter de référence à un projet
  piloté particulier

### Requirement: Contrat HTTP de validation

Le contrôleur SHALL accepter une demande sur `POST /validation/request`, mémoriser une
décision explicite et unique sous le `requestId` de la demande, et la restituer par `GET
/decision/<requestId>`. Toute décision restituée SHALL inclure le même `requestId`,
l'`approval_id` et le `change_id` de la demande notifiée. Le contrôleur SHALL accepter
les décisions `approved`, `rejected` et `needs_clarification` et SHALL refuser une
seconde décision pour le même `requestId`.

#### Scenario: Décision manuelle valide
- **WHEN** une décision `needs_clarification` valide est envoyée sur `POST /decision/<requestId>` pour une demande notifiée en mode manuel
- **THEN** le contrôleur la mémorise une fois avec les identifiants de la demande et répond avec un statut HTTP de création

#### Scenario: Demande manuelle en attente
- **WHEN** une demande valide est envoyée sur `POST /validation/request` avec `OC_Codex_DECISION_MODE=manual`
- **THEN** le contrôleur répond PENDING sans démarrer de tour de décision Codex et `GET /decision/<requestId>` reste indisponible jusqu'à une décision corrélée

#### Scenario: Lecture corrélée d'une décision
- **WHEN** le broker appelle `GET /decision/<requestId>` après qu'une décision a été mémorisée
- **THEN** le contrôleur retourne cette décision et ses identifiants de corrélation sans la substituer par un `approval_id`

#### Scenario: Méthode non admise
- **WHEN** une méthode autre que GET ou POST cible `/decision/<requestId>`
- **THEN** le contrôleur répond HTTP 405

### Requirement: Statut de supervision
Le contrôleur SHALL exposer son état public sur `GET /status`, dont l'état du Codex App Server, du SSE OpenCode et la dernière readiness du broker.

#### Scenario: Lecture du statut
- **WHEN** un healthcheck appelle `GET /status`
- **THEN** il reçoit un objet JSON sans secret ni décision détaillée

### Requirement: Verrou de clôture de job corrélé

Le contrôleur SHALL exiger un gate terminal local avant toute clôture normale.
Il SHALL le refuser tant qu'une validation est active ou indécise localement,
qu'une demande broker est en attente ou qu'un état explicite `TERMINÉ` ou
`BLOQUÉ` manque. Un ancien compteur broker nul SHALL NOT remplacer une décision
locale absente. Le gate SHALL rester distinct des décisions et SHALL NOT
approuver une opération OpenCode.

#### Scenario: Clôture prématurée refusée
- **WHEN** une clôture est demandée alors qu'une validation est active ou en attente
- **THEN** le contrôleur la refuse, expose la raison sans secret et conserve le job ouvert

#### Scenario: Validation manuelle avec ancien compteur nul
- **WHEN** une demande manuelle locale reste sans décision et la dernière readiness indique pending_count zéro
- **THEN** le contrôleur refuse le gate et conserve la demande indécise

#### Scenario: Gate terminal valide
- **WHEN** une clôture normale est demandée avec un état terminal explicite et sans validation active ou en attente
- **THEN** le contrôleur confirme le gate terminal et rend son état observable

### Requirement: État terminal observable

Le contrôleur SHALL exposer sur `GET /status` un résumé non sensible du gate
terminal, comprenant son état, sa raison et l'état terminal déclaré. Une
attente, un silence SSE, un rapport intermédiaire ou la fin d'un tour Codex ne
SHALL jamais être interprété comme un état terminal.

#### Scenario: Jalon intermédiaire non terminal
- **WHEN** le contrôleur observe la fin d'un tour Codex sans état terminal déclaré
- **THEN** son statut indique que le gate terminal n'est pas validé

### Requirement: Corrélation sûre des commandes Bash instrumentées

Le contrôleur SHALL corréler une permission Bash à la commande approuvée lorsque
OpenCode y ajoute exclusivement une instrumentation de sortie déterministe connue. Le
contrôleur SHALL vérifier que la commande métier approuvée reste inchangée et SHALL
refuser toute transformation qui ajoute, retire ou modifie une opération métier. Une
permission corrélée SHALL rester consommable une seule fois.

#### Scenario: Commande exacte
- **WHEN** OpenCode demande une permission Bash dont la commande est identique
  à celle du mandat approuvé
- **THEN** le contrôleur la corrèle à ce mandat et peut transmettre une unique
  réponse `once` après une décision `approved`

#### Scenario: Instrumentation de sortie admise
- **WHEN** OpenCode ajoute uniquement l'instrumentation de sortie déterministe
  reconnue à la fin de la commande approuvée
- **THEN** le contrôleur corrèle la permission à la commande métier approuvée
  sans élargir la portée du mandat

#### Scenario: Transformation métier refusée
- **WHEN** la commande de permission diffère de la commande approuvée autrement
  que par l'instrumentation de sortie reconnue
- **THEN** le contrôleur ne la corrèle pas et ne transmet aucune réponse de
  permission

#### Scenario: Suffixe refusé pour un job strict
- **WHEN** un job déclare `strictCommands: true` et OpenCode ajoute un suffixe,
  y compris l'instrumentation de sortie reconnue, à une commande approuvée de
  la même session et du même répertoire
- **THEN** le contrôleur ne corrèle pas cette permission et ne transmet aucune
  réponse `once`

#### Scenario: Commande exacte consommée une fois pour un job strict
- **WHEN** un job déclare `strictCommands: true` et OpenCode demande une
  permission dont la commande est strictement identique au mandat approuvé
- **THEN** le contrôleur peut transmettre une seule réponse `once` à cette
  permission et ne réutilise pas la décision pour une seconde permission

### Requirement: Réveil corrélé de l'orchestrateur

Le contrôleur SHALL accepter une relance corrélée sur une interface HTTP locale et
vérifier son `requestId`, son `approval_id` et son `change_id` avant toute action. Pour
une relance valide sans décision terminale en mode manuel, le contrôleur SHALL signaler
le rappel corrélé dans son statut sans créer de thread ni de tour Codex App Server.
Cette protection SHALL s'appliquer également aux heartbeats de relance.

#### Scenario: Rappels manuels répétés
- **WHEN** le contrôleur reçoit plusieurs relances corrélées d'une demande
  sans décision avec `OC_Codex_DECISION_MODE=manual`
- **THEN** il retourne une réponse non décisionnelle, rend le rappel observable
  et ne lance aucun `thread/start` ni `turn/start`
- **AND** `GET /decision/<requestId>` reste indisponible

#### Scenario: Décision explicite après un rappel manuel
- **WHEN** l'orchestrateur principal publie une décision valide sur
  `POST /decision/<requestId>` après un rappel manuel
- **THEN** le contrôleur mémorise cette décision une seule fois avec les
  identifiants de la demande
- **AND** une seconde décision ou une relance terminale est refusée

#### Scenario: Événement structuré transmis
- **WHEN** le contrôleur reçoit une relance corrélée en mode automatique et
  sa tâche orchestratrice persistante est disponible
- **THEN** il transmet `requestId`, `change_id`, session OpenCode, âge,
  opération et dernier état connu sans créer de décision

#### Scenario: Réveil indisponible
- **WHEN** le contrôleur en mode automatique ne peut pas transmettre
  l'événement ni planifier son heartbeat
- **THEN** il conserve une notification locale persistante pour
  l'orchestrateur et retourne un état de relance non décisionnel

### Requirement: Contrat de supervision de job local

Le contrôleur SHALL accepter et exposer exclusivement sur son interface locale un
contrat de supervision de job non secret, corrélé à une session OpenCode et à son gate
terminal. Le contrôleur SHALL refuser un contrat incomplet, une substitution implicite
de session sur /job/arm, ou une désactivation sans gate terminal validé. Seule la
récupération explicite /job/recover définie ci-dessous MAY remplacer la session.

#### Scenario: Tentative de désarmement prématuré

- **WHEN** un client demande le désarmement d'un job dont le gate terminal est
  ouvert
- **THEN** le contrôleur refuse la demande et conserve le contrat observable

#### Scenario: Type invalide pour la corrélation stricte
- **WHEN** un client arme un job avec une valeur non booléenne de
  `strictCommands`
- **THEN** le contrôleur refuse le contrat et ne l'arme pas

### Requirement: Interface explicite de récupération
POST /job/recover MUST accepter prepare, retry, reconcile et complete, corrélés par jobId, expectedSessionId, sessionId, recoveryId et preflightRequestId uniques. Le contrôleur MUST refuser les mutations concurrentes pendant la transition. Il MUST NOT désarmer le job, purger le RUN, fabriquer une décision ou valider le gate pour ce remplacement.

#### Scenario: Transition concurrente
- **WHEN** une mutation est demandée pendant un contrôle asynchrone de récupération
- **THEN** elle est refusée sans modifier le contrat

### Requirement: Préconditions techniques de récupération
prepare, retry et complete MUST vérifier un job armé avec gate OPEN, mandat courant clôturé, aucune demande indécise, aucun rappel, aucune permission native ni transmission en cours. Seule la reprise humaine attestée décrite ci-dessous MAY déroger au statut armé et au gate OPEN. Via OpenCode dans directory, ils MUST vérifier santé, chemin, MCP connecté et les deux sessions inactives dans cette racine. Un contrôle indisponible ou divergent MUST refuser la transition.

#### Scenario: Précondition manquante
- **WHEN** une permission, une session occupée, une demande indécise ou un contexte divergent est observé
- **THEN** la transition est refusée sans transfert ni approbation implicite

### Requirement: Gel et persistance de récupération
prepare MUST persister un gel observable sans contenu de projet ni secret et invalider les autorisations exécutables de l'ancienne session sans modifier les décisions historiques. Le gel et les sessions révoquées MUST survivre à un redémarrage. Un échec de complete MUST conserver le gel.

#### Scenario: Redémarrage pendant une récupération
- **WHEN** le contrôleur redémarre après prepare et avant complete
- **THEN** le gel est restauré et aucune ancienne autorisation n'est exécutée

### Requirement: Prévol natif avant transfert
complete MUST exiger une décision locale approved, une réponse MCP APPROVED corrélée au preflightRequestId réservé, une unique permission /usr/bin/true consommée et une commande exacte terminée exit 0. Les messages natifs OpenCode MUST ensuite prouver broker_readiness READY pending_count 0. Une affirmation du client, une preuve absente ou divergente, ou un autre outil natif exécuté MUST refuser le transfert.

#### Scenario: Polling corrélé après délai MCP
- **WHEN** request_validation expire côté client et poll_approval ou get_approval retourne une réponse APPROVED réellement corrélée avant la commande
- **THEN** complete MAY accepter cette réponse native après vérification de toutes les autres preuves

#### Scenario: Prévol non prouvé
- **WHEN** le client affirme une réussite mais les messages natifs ne la prouvent pas
- **THEN** complete refuse le transfert et conserve le gel

### Requirement: Frontière des diagnostics de préparation
prepare MUST persister count et empreinte des seules parties MCP diagnostiques ou de réconciliation technique déjà présentes dans la candidate. complete MUST vérifier ce préfixe intact avant le prévol. Aucun outil natif ni approve/reject ne peut être masqué. Pour une récupération héritée, seuls les diagnostics terminés avant preparedAt et avant la demande réservée MAY être exclus ; l'historique complet reste conservé.

#### Scenario: Diagnostics puis prévol strict
- **WHEN** des diagnostics techniques précèdent prepare puis un prévol conforme suit la frontière
- **THEN** complete vérifie l'historique intact sans compter ces diagnostics comme effets natifs

### Requirement: Autorisation de reprise humaine attestée
complete MAY recevoir restoredPreflightProof uniquement avec developerAuthorization spécifique, pour le même job désarmé avec gate persistant VALIDATED/BLOQUÉ postérieur au prévol et candidate non révoquée. Ce gate atteste la consommation préalable ; une affirmation de consommation seule MUST NOT suffire. Toutes les autres préconditions techniques restent obligatoires.

#### Scenario: Gate absent ou différent
- **WHEN** le gate attestant la consommation manque ou sa référence diverge
- **THEN** complete refuse sans réarmer ni transférer

### Requirement: Preuves strictes de restauration humaine
La reprise humaine MUST vérifier empreinte canonique du préfixe natif, décision originale, identités, réponse APPROVED avec reviewer CGPT, absence de tools.bash=true pendant le prévol, commande exacte exit 0 et READY sans attente après la commande. Toute preuve absente ou divergente MUST conserver le gel, le job et les décisions.

#### Scenario: Preuve native divergente
- **WHEN** l'empreinte, la décision, l'identité, la commande, l'attestation de consommation ou la readiness manque ou diverge
- **THEN** complete refuse sans restaurer de décision ni accorder de permission

### Requirement: Restauration consommée sans rejeu
Après preuves, la reprise humaine MUST réarmer seulement le même job, restaurer sa décision corrélée comme déjà consommée, persister références et empreintes d'audit puis effectuer le transfert normal avec gate OPEN. Elle MUST NOT transmettre once, exécuter une commande, modifier les messages natifs ou assouplir retry/reconcile.

#### Scenario: Maintenance et reprise autorisées
- **WHEN** le développeur autorise la reprise du même job désarmé et que le prévol déjà consommé est intégralement prouvé
- **THEN** complete restaure ces preuves comme consommées et transfère la candidate sans nouvelle permission ni rejeu

### Requirement: Conservation du même job
Après complete, le contrôleur MUST conserver jobId, directory, changeId, criteria, lastProvenMilestone et strictCommands, remplacer uniquement la session, persister l'historique non secret des récupérations et conserver gate OPEN. Les sessions révoquées MUST rester sans permission exécutable même après désarmement.

#### Scenario: Transfert prouvé
- **WHEN** les préconditions et le prévol sont prouvés
- **THEN** complete remplace la session et conserve le périmètre, le dernier jalon et le gate OPEN

### Requirement: Session admise pour les validations
Pour un job armé, le contrôleur MUST refuser toute nouvelle validation dont la session ou directory diverge du contrat. Pendant la récupération, il MUST admettre uniquement le preflightRequestId réservé, files vide et commands contenant /usr/bin/true seul, dans la session candidate et directory du job.

#### Scenario: Mauvaise session
- **WHEN** une demande vise une session ou un répertoire non admis
- **THEN** le contrôleur refuse la validation sans décision ni permission

### Requirement: Prévol strict et autorisations invalidées
La commande réservée MUST être corrélée exactement sans suffixe, quelle que soit strictCommands, et nécessiter une décision explicite unique. Une décision consommée ou invalidée MUST NOT répondre once de nouveau ; la décision historique MUST rester inchangée.

#### Scenario: Suffixe ou ancienne décision
- **WHEN** une permission ajoute un suffixe au prévol ou vise une autorisation invalidée de l'ancienne session
- **THEN** aucune permission once n'est transmise

### Requirement: Restauration explicite du job au démarrage

Le contrôleur MUST valider puis restaurer le contrat persistant selon les
formats supportés. La racine MUST être un objet JSON non nul, distinct d'un
tableau, avec les champs obligatoires et types attendus. Seul ENOENT MAY
permettre un démarrage sans job. La restauration valide MUST préserver
jalons, gate et métadonnées de récupération sans les réinitialiser.

#### Scenario: Fichier absent
- **WHEN** le fichier de contrat est absent
- **THEN** le contrôleur peut démarrer sans job enregistré

#### Scenario: Contrat valide
- **WHEN** le fichier contient un contrat valide avec un gate ouvert et des métadonnées de récupération
- **THEN** le contrôleur restaure ce contrat sans inventer de jalon ni d'état terminal

#### Scenario: Racine JSON invalide pour un contrat
- **WHEN** le fichier contient null, un booléen, un nombre, une chaîne ou un tableau JSON
- **THEN** le contrôleur refuse la restauration sans assimiler ce contenu à un fichier absent

#### Scenario: Objet incomplet ou types invalides
- **WHEN** un objet JSON omet un champ obligatoire du format supporté ou présente un type incompatible
- **THEN** le contrôleur refuse la restauration sans réparer le contrat

#### Scenario: Format historique supporté
- **WHEN** un contrat valide d'un format supporté omet un champ historiquement facultatif
- **THEN** le contrôleur conserve sa compatibilité et ne réinitialise pas ses jalons, son gate ou ses preuves

### Requirement: Refus des erreurs de restauration du job

Un JSON malformé, un contrat invalide ou une erreur de lecture autre que
ENOENT MUST arrêter le démarrage avec un code non nul avant HTTP et toute
interaction OpenCode ou Codex App Server. Le fichier persistant MUST rester
inchangé, sans suppression ni réparation automatique.

#### Scenario: JSON malformé
- **WHEN** le fichier de contrat ne peut pas être décodé comme JSON
- **THEN** le contrôleur échoue au démarrage sans interaction externe et conserve le fichier intact

#### Scenario: Erreur de lecture
- **WHEN** la lecture du fichier de contrat échoue avec une erreur autre que ENOENT
- **THEN** le contrôleur échoue au démarrage sans assimiler cette erreur à un job absent

#### Scenario: Contrat décodé mais invalide
- **WHEN** le JSON est décodé mais sa structure ne satisfait pas le format de contrat supporté
- **THEN** le contrôleur échoue avant toute interface ou interaction externe et conserve le fichier intact

### Requirement: Diagnostic de restauration sans contenu persistant

Un refus de restauration MUST distinguer JSON malformé, lecture impossible
et contrat invalide. Le diagnostic MUST NOT reprendre le contenu persistant,
le message brut de l'exception ou le chemin runtime.

#### Scenario: Contenu non exposé
- **WHEN** un contrat malformé contient un marqueur synthétique
- **THEN** le diagnostic identifie l'échec de décodage sans afficher ce marqueur ni le chemin runtime

#### Scenario: Contrat invalide non divulgué
- **WHEN** un objet de contrat invalide contient un marqueur synthétique
- **THEN** le diagnostic indique un contrat invalide sans exposer le marqueur, le chemin ou l'exception brute

### Requirement: URL du contrôleur compatible entre clients locaux
Le superviseur et le healthcheck SHALL accepter `OC_Codex_CONTROLLER_URL`
comme base HTTP ou comme endpoint `/status`, avec slash final facultatif.
Ils SHALL résoudre `/status` une seule fois ; le superviseur SHALL retrouver
la base pour `/job`. Les valeurs par défaut et les alias `OC_CGPT_` SHALL
rester compatibles, sans nouveau paramètre.

#### Scenario: Base HTTP fournie
- **WHEN** la variable contient la base du contrôleur
- **THEN** les deux clients interrogent son endpoint /status et le superviseur interroge /job

#### Scenario: Endpoint de statut fourni
- **WHEN** la variable contient l'endpoint /status, avec ou sans slash final
- **THEN** aucun client n'ajoute un second /status et le superviseur interroge /job depuis la base

#### Scenario: Alias historique ou valeur par défaut
- **WHEN** l'alias OC_CGPT_CONTROLLER_URL est utilisé ou aucune URL n'est fournie
- **THEN** les clients conservent ces modes de configuration et les mêmes endpoints

### Requirement: Retry explicite dans la candidate conservée
retry MUST conserver jobId, expectedSessionId, sessionId et recoveryId. Il MUST exiger previousPreflightRequestId égal à la réservation courante et preflightRequestId inédit. Il MUST conserver gel, gate, jalons et critères, réserver seulement le nouvel essai et persister son historique sans modifier les décisions antérieures.

#### Scenario: Identité périmée ou session différente
- **WHEN** retry réutilise un identifiant, change de session ou présente une réservation périmée
- **THEN** le contrôleur refuse sans changer le job

### Requirement: Refus natif sans effet avant retry
retry MUST vérifier les préconditions techniques et le refus sans consommation de chaque demande enregistrée de la tentative précédente. Il MUST accepter REJECTED direct ou obtenu par poll_approval/get_approval corrélé après timeout MCP, avec décision locale rejected non consommée. Un délai seul, une preuve absente/divergente, approved, une commande ou un autre outil natif MUST refuser retry. Les preuves historiques MUST rester intactes.

#### Scenario: Refus enregistré
- **WHEN** une réponse native REJECTED correspond à une décision locale rejected non consommée
- **THEN** retry MAY réserver un essai neuf dans la même candidate après réconciliation

#### Scenario: Refus obtenu après timeout
- **WHEN** request_validation expire puis poll_approval ou get_approval retourne REJECTED pour la même demande enregistrée, avec identités et opération corrélées et décision locale rejected non consommée
- **THEN** retry accepte cette preuve après vérification des autres préconditions, sans désarmement ni remplacement de candidate

#### Scenario: Polling intermédiaire
- **WHEN** un polling corrélé retourne PENDING avant un REJECTED corrélé
- **THEN** seul le refus terminal prouve la fin sans effet ; PENDING seul ne permet pas retry

#### Scenario: Polling divergent ou absent
- **WHEN** la réponse modifie requestId, approval_id, session_id, directory, change_id, files ou commands, précède sa demande, ou ne confirme aucun refus terminal
- **THEN** retry refuse et conserve le gel et la réservation actuelle

#### Scenario: Refus avant enregistrement
- **WHEN** une erreur native MCP -32602 prouve un rejet de paramètres avant enregistrement, sans validation locale ni effet
- **THEN** retry MAY conserver cette preuve et réserver un essai neuf

#### Scenario: Effet ou décision non prouvé
- **WHEN** la tentative est approuvée, consommée, en attente, seulement interrompue, en erreur générique ou privée de sa décision locale
- **THEN** retry refuse et le gel reste conservé

### Requirement: Frontière native vérifiée entre tentatives
retry MUST persister une empreinte du préfixe des parties tool natives et les identifiants antérieurs sans contenu de message. retry et complete MUST vérifier que ce préfixe reste identique et contrôler le nouvel essai après cette frontière. Les identifiants de requête et approbation antérieurs MUST NOT être réutilisés.

#### Scenario: Historique altéré ou tronqué
- **WHEN** une partie native antérieure est perdue, changée ou réordonnée
- **THEN** la transition refuse sans transfert ni autorisation implicite

#### Scenario: Nouveau prévol exact
- **WHEN** les preuves historiques sont intactes et le nouvel essai satisfait les contrôles stricts existants
- **THEN** complete accepte le même job et la même candidate sans compter les refus précédents comme des exécutions

### Requirement: Mode manuel et décision HTTP explicite

Le mode de décision SHALL être `manual` par défaut. Lorsque
`OC_Codex_DECISION_MODE=manual`, le contrôleur SHALL conserver la demande en attente et
SHALL attendre une décision valide envoyée sur `POST /decision/<requestId>` sans lancer
de décision automatique.

#### Scenario: Mode manuel et décision HTTP explicite
- **WHEN** une demande est notifiée en mode manuel sans décision
- **THEN** le contrôleur attend POST /decision/<requestId> sans lancer de décision automatique

### Requirement: Commandes strictes dans le contexte du job

Pour un job déclarant `strictCommands: true`, le contrôleur SHALL exiger une commande de
permission strictement identique à celle du mandat et SHALL refuser également
l'instrumentation de sortie reconnue. Cette restriction SHALL s'appliquer à la session
et au répertoire du contrat de job ; son absence SHALL préserver la corrélation
instrumentée existante.

#### Scenario: Commandes strictes dans le contexte du job
- **WHEN** un job strict demande une permission avec le suffixe de sortie reconnu
- **THEN** le contrôleur refuse la corrélation dans la session et le répertoire de ce job

### Requirement: Neutralité et réveil automatique corrélé

La demande SHALL rester indécise jusqu'à une décision HTTP explicite et corrélée de
l'orchestrateur principal. En mode automatique, le contrôleur SHALL conserver son chemin
existant de transmission structurée à la tâche orchestratrice persistante, de heartbeat
lié à cette tâche et de notification locale persistante lorsque le réveil est
indisponible. Une relance SHALL NOT créer, modifier ou consommer une décision ou une
permission.

#### Scenario: Neutralité et réveil automatique corrélé
- **WHEN** un rappel automatique ne peut être transmis à la tâche persistante ni à son heartbeat
- **THEN** le contrôleur conserve une notification locale sans créer ou consommer de décision ni de permission

### Requirement: Statut du job et option de commandes strictes

Le statut public du contrôleur SHALL résumer le job armé et son gate sans exposer le
contenu du projet ni une décision CAB. Le champ facultatif `strictCommands` SHALL être
booléen, valoir `false` par défaut et être conservé dans le contrat persistant et son
état public. Le contrôleur SHALL refuser toute autre valeur avant d'armer le job.

#### Scenario: Statut du job et option de commandes strictes
- **WHEN** un client arme un job avec strictCommands non booléen
- **THEN** le contrôleur refuse le contrat avant armement ; un contrat valide conserve son option et expose son gate sans contenu du projet

### Requirement: Contextes de contrôleur isolés par RUN
Le contrôleur MUST héberger plusieurs contextes de job isolés. Les routes /runs/<runId>/job/... et /runs/<runId>/decision/<requestId> MUST cibler un seul contexte. Une mutation sans cible ambiguë MUST être refusée. Une récupération MUST conserver le propriétaire du change et invalider les anciennes permissions.

#### Scenario: Isolation concurrente
- **WHEN** A possède une validation indécise et B termine
- **THEN** le gate de B ne dépend pas du compteur métier de A

### Requirement: Réconciliation humaine du prévol exécuté sans permission native
La phase reconcile de /job/recover MUST être explicitement demandée par l'orchestrateur avec developerAuthorization, une référence non vide à l'accord spécifique du développeur. Elle MUST conserver job, RUN, candidate, gel et critères. Elle MUST vérifier les préconditions techniques, les identités de récupération, previousPreflightRequestId et un preflightRequestId inédit. Le retry ordinaire MUST conserver ses refus existants.

#### Scenario: Prévol inoffensif exécuté sous allow
- **WHEN** l'historique natif prouve que le message utilisateur parent du prévol portait tools.bash=true, une réponse MCP APPROVED corrélée avec reviewer CGPT, exactement une commande /usr/bin/true terminée exit 0 après cette réponse, puis broker_readiness READY sans attente
- **THEN** reconcile MUST exiger la règle native finale bash ask dans la candidate, refuser toute consommation locale connue et réserver uniquement un essai neuf
- **AND** reconcile MUST conserver l'empreinte et les identifiants de l'ancien essai avec outcome EXECUTED_WITHOUT_NATIVE_ONCE, horodatage et référence d'autorisation, sans modifier la décision précédente ni prétendre que once a été consommée

#### Scenario: Historique natif utilisable après redémarrage coordonné
- **WHEN** les décisions locales ne sont plus disponibles après un redémarrage du contrôleur et l'accord humain spécifique ainsi que toutes les preuves natives du cas allow sont vérifiés
- **THEN** reconcile MAY conserver cette frontière historique sans reconstruire une décision locale, consommer une permission ou valider complete
- **AND** le nouvel essai MUST encore prouver sa propre décision locale, sa réponse MCP, une permission once consommée, exit 0 et READY avant complete

#### Scenario: Effet ou preuve non conforme
- **WHEN** l'accord manque, la candidate reste sous allow, l'historique est altéré, une permission est consommée localement, la commande diverge ou un autre outil natif est observé
- **THEN** reconcile MUST refuser la transition sans invalider l'ancien mandat ni lever le gel

### Requirement: Permission native vérifiée avant approbation exécutable
Pour un job armé, le contrôleur MUST vérifier par HTTP la session et le répertoire du mandat avant admission et avant enregistrement d'une décision approved. La dernière règle couvrant le type natif bash ou edit MUST avoir pattern `*` et action ask. Les jokers du nom de permission MUST être pris en compte. Une règle absente, malformée, plus spécifique en dernière position ou une réponse indisponible MUST refuser l'opération avec un diagnostic explicite sans décision implicite.

#### Scenario: Outil réactivé en allow
- **WHEN** une validation exécutable de job armé vise une session dont la dernière règle native est allow
- **THEN** le contrôleur refuse avant enregistrement de la validation et ne transmet aucune permission

#### Scenario: Règle modifiée avant décision
- **WHEN** la règle devient allow après admission mais avant une décision approved manuelle ou automatique
- **THEN** aucune décision approved n'est enregistrée et un refus explicite reste possible

#### Scenario: Ancien usage sans job armé
- **WHEN** une validation est utilisée sans job armé
- **THEN** sa compatibilité historique est préservée

### Requirement: Garde natif lors du prévol et de la transmission
Les contrôles de récupération MUST vérifier la règle Bash ask de la candidate avant prévol. Avant de transmettre once pour un job armé, le contrôleur MUST vérifier de nouveau les règles de la session. Après chaque contrôle asynchrone, il MUST réévaluer l'admission et l'absence de décision concurrente. Un échec MUST conserver les décisions antérieures, le gel éventuel et l'absence de consommation.

#### Scenario: Candidate permissive
- **WHEN** prepare vise une candidate sans règle Bash ask vérifiable
- **THEN** prepare est refusé sans modifier le job ni approuver le prévol

#### Scenario: Dérive avant once
- **WHEN** une règle permissive apparaît avant la transmission native
- **THEN** once n'est pas transmis et l'approbation historique reste intacte
