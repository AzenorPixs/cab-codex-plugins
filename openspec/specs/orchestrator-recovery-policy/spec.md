# orchestrator-recovery-policy Specification

## Purpose

Définir les diagnostics et récupérations CAB limités au propriétaire, au RUN et aux ressources autorisés, avec preuves natives, décisions explicites et reçus durables, sans rejeu d’effet ni gel des travaux indépendants.

## Requirements

### Requirement: Aperçu de récupération typé et local au RUN

CAB MUST exposer incidents, ressources, actions et preuves manquantes par RUN. Le décideur dans le périmètre validé MUST être l’orchestrateur, y compris quand une politique manque ou qu’une preuve exige un diagnostic. Une demande humaine MUST désigner une extension hors périmètre. L’aperçu MUST conserver les protections et montrer les continuations compatibles, sans libération par délai.

#### Scenario: Opération incertaine et travail disjoint
- **WHEN** une opération protège une ressource et un travail indépendant reste possible
- **THEN** l’aperçu conserve la protection, identifie sa portée et propose la progression compatible

#### Scenario: Preuve technique insuffisante dans le mandat
- **WHEN** le RUN manque d’un reçu natif et une investigation reste dans son périmètre
- **THEN** CAB propose le diagnostic à l’orchestrateur et ne classe pas cette seule absence comme décision humaine

### Requirement: Autonomie déléguée sans transfert d’autorité

La politique MUST lier actions, propriétaire, RUN et périmètre autorisés.
Les diagnostics sans effet MAY être automatiques. L’orchestrateur MAY choisir
une récupération comprise dans son mandat ; chaque mutation MUST vérifier les
gardes et produire un reçu idempotent. Une extension de périmètre ou destruction
non autorisée MUST demander une décision humaine.

#### Scenario: Reçu périmé ou propriétaire divergent
- **WHEN** une récupération utilise une ancienne frontière ou le RUN d’un autre propriétaire
- **THEN** CAB refuse la mutation et conserve les accès et décisions

### Requirement: Récupération sans décision ou effet implicite

Une politique de récupération MUST NOT approuver un mandat, rejouer once,
modifier le choix LLM, transférer un RUN ou effacer une preuve. Les actions
métier supplémentaires MUST avoir leur mandat et leurs permissions propres.

#### Scenario: Tentative de rejeu sous une politique de récupération
- **WHEN** une action tente de réutiliser une once consommée ou d’étendre une ancienne décision
- **THEN** CAB refuse l’effet et conserve la décision historique

### Requirement: Quarantaine et compensation explicites

Une quarantaine MUST conserver l’incertitude et la protection contre les effets
incompatibles ; elle MAY autoriser une continuation prouvée compatible. Une
compensation ou un environnement de remplacement MUST être une nouvelle
opération mandatée et traçable. L’opération historique MUST NOT être déclarée
terminée ou sans effet par cette seule continuation.

#### Scenario: Ressource jetable indisponible
- **WHEN** le mandat autorise une ressource de remplacement indépendante
- **THEN** l’orchestrateur peut préparer son nouveau mandat sans libérer ni réinterpréter l’effet historique

### Requirement: Corruption locale isolée du RUN

Un checkpoint privé invalide attribuable à un RUN MUST conserver ses effets
protégés et exposer une récupération nécessaire sans empêcher les RUN
indépendants de communiquer. Les méthodes de ce contexte MUST refuser toute
nouvelle permission tant que la cohérence n’est pas prouvée. Une corruption
du registre partagé MUST garder sa protection globale d’intégrité.

#### Scenario: Deux RUN et un checkpoint privé illisible
- **WHEN** un seul checkpoint de communication est invalide
- **THEN** ce RUN expose sa cause, son diagnostic reste accessible et le pair indépendant continue ses mandats autorisés

### Requirement: Récupération sans recopie des jetons

Une action déléguée MUST être liée à une politique, un propriétaire, une
génération et un digest de frontière courants. Le contrôleur MAY fournir aux
gardes internes les jetons de la seule ressource autorisée. Les aperçus et
reçus publics MUST NOT exposer ces jetons. Toute frontière périmée, action
hors politique ou cible étrangère MUST être refusée avant mutation.

#### Scenario: Action sur une attente de test propre au RUN
- **WHEN** la politique autorise l’annulation de cette attente et la frontière est inchangée
- **THEN** les gardes existantes sont appliquées avec les identités internes exactes et le reçu public ne contient aucun jeton

### Requirement: Reçu durable des actions de récupération

Une action MUST conserver un actionId immuable, une intention durable et son
résultat filtré avant acquittement HTTP. Une réponse perdue MUST permettre la
relecture du même reçu sans nouvelle mutation. Après crash entre l’effet de
coordination et son reçu, une preuve du registre MAY réconcilier le résultat ;
une issue non prouvée MUST rester explicitement indéterminée sans rejeu.

#### Scenario: Annulation effectuée et réponse perdue
- **WHEN** une attente est déjà annulée après l’intention de récupération
- **THEN** le résultat est observé sans attribuer une causalité non prouvée et sans annuler une seconde fois

### Requirement: Annulation revue d’une validation non consommée

Une politique MAY autoriser le propriétaire à annuler sa validation PREPARED approuvée, sans native, accès ni once consommée, après revue de lecture liée au digest de commande et aux sources. CAB MUST vérifier annulation native exacte, refus audités des calls concernés et double observation stable. Il MUST conserver approved, tracer l’autorité de revue et l’exécution historique indéterminée, retirer la réponse exécutable et MUST NOT fabriquer un exit ou NO_EFFECT natif.

#### Scenario: Deux refus programmatiques d’une sonde de lecture
- **WHEN** le propriétaire fournit une revue exacte, les références des deux refus HTTP204 et que les observations confirment la frontière non consommée et l’annulation native
- **THEN** la validation CAB devient CANCELLED avec reçu de revue, sans nouvelle permission ni conclusion sur l’exécution historique

#### Scenario: Opération exécutée ou revue divergente
- **WHEN** une once est consommée, un accès existe, un autre outil intervient ou les identités/digests divergent
- **THEN** CAB refuse l’annulation revue et préserve l’effet protégé

### Requirement: Diagnostic natif sans effet par opération

CAB MUST proposer un diagnostic authentifié, borné et filtré de la seule opération du RUN. Il MUST distinguer transcript, outils concernés, permissions pendantes, reçus de refus et couverture du journal. Un watermark synchronisé sans événements concernés MUST NOT prouver une absence d’exécution. Le diagnostic MUST NOT décider, exécuter, relancer once ou exposer commandes, tokens ou secrets.

#### Scenario: Journal vide avec watermark
- **WHEN** le journal est synchronisé mais ne couvre pas les calls concernés
- **THEN** le diagnostic indique cette lacune et ses prochaines vérifications, sans NO_EFFECT

### Requirement: Réconciliation bornée d’un port local quarantiné

Une politique MAY réconcilier un port quarantiné après revue bornée et deux sondes natives distinctes exit0. CAB MUST vérifier commande, nonce, instance, namespaces, port libre et processus absents ; toute lacune MUST refuser la mutation. Seuls l’opération et son accès ciblés MUST être clôturés en RECONCILED, once conservée. L’issue historique MUST rester non observée, sans exit ou NO_EFFECT inventé.

#### Scenario: Processus disparu et port quiescent
- **WHEN** deux sondes indépendantes du compte natif prouvent la quiescence après revue du serveur Vite et de son scope
- **THEN** l’accès ciblé est RECONCILED, l’ancienne once reste acquittée et aucun exit historique ou NO_EFFECT n’est inventé

#### Scenario: Processus actif ou namespace inaccessible
- **WHEN** une sonde voit un listener, un processus candidat, une couverture incomplète ou une identité divergente
- **THEN** CAB conserve la quarantaine et propose à l’orchestrateur un diagnostic ou une ressource disjointe

### Requirement: Projection de transport relue sans admission implicite

Une revue MAY couvrir le code exact d’un wrapper de validation. CAB MUST vérifier son digest, le retour natif non modifié et une liste fermée d’appels de transport. Une request_validation NOT_ADMITTED ne peut être écartée qu’avec identité concordante et absence d’admission locale ; un appel exécutant un outil ou attribuant une décision MUST rester refusé. La projection MUST être auditée comme revue de l’orchestrateur, pas comme nouvelle preuve serveur.

#### Scenario: Nouvelle demande refusée avant annulation de l’ancienne
- **WHEN** un wrapper NOT_ADMITTED non enregistré localement sépare deux refus audités de l’annulation native exacte
- **THEN** sa projection relue n’empêche pas l’annulation locale de l’ancienne validation non consommée et ne crée aucune nouvelle demande autorisée

### Requirement: Restaurer une validation PENDING propriétaire sans nouvelle demande
Le système SHALL permettre au propriétaire de restaurer la communication de
la même approval PENDING quand l’opération durable PREPARED n’a ni décision,
native ni accès, après vérification native fraîche, non expirée, double
observation stable et identité/ressources/contexte actuels. Cette action SHALL
persister un reçu sans créer de décision, demande MCP ou permission.

#### Scenario: Notification perdue mais identité durable vérifiée
- **GIVEN** une policy propriétaire autorisant restore-pending-validation et une lecture get_approval fraîche PENDING concordante
- **WHEN** la double frontière native est stable et la validation manque
- **THEN** le contexte restaure la même identité sans modifier l’opération et une décision distincte reste nécessaire

#### Scenario: Identité, temps ou effet contradictoire
- **GIVEN** un terminal contradictoire, une lecture périmée, un effet correspondant, une autre validation active ou une révision divergente
- **WHEN** la restauration est demandée
- **THEN** elle est refusée sans décision, accès ou permission créé

### Requirement: Clôturer la coordination d’un terminal de lecture revu sans inventer once
Le système SHALL permettre une clôture propriétaire bornée après revue READ_ONLY
liée à la commande, aux sources épinglées et à un unique terminal natif exact,
quand PREPARED approved n’a ni native ni accès. Il SHALL conserver l’issue
NATIVE_TERMINAL_OBSERVED_PERMISSION_UNVERIFIED et ne fabriquer ni once, ni
nativeResult, ni NO_EFFECT. Une policy et deux observations stables sont requises.

#### Scenario: Terminal exact et sources relues
- **GIVEN** une policy reconcile-reviewed-terminal et un terminal shell completed non tronqué avec exit entier et revue propriétaire concordante
- **WHEN** la frontière native et les sources sont stables
- **THEN** seule la coordination devient COMPLETED et la réponse exécutable locale est invalidée sans rejeu natif

#### Scenario: Preuve manquante ou effet hors revue
- **GIVEN** une once, un accès, une autre commande à effet, un doublon ou une source divergente
- **WHEN** la clôture est demandée
- **THEN** les protections restent intactes et aucun résultat historique n’est fabriqué

### Requirement: Reprendre les reçus des frontières de validation sans effets natifs
Le système SHALL persister l’intention et l’observation avant toute mutation de
contexte ou registre. La relecture du même actionId SHALL réconcilier les
seules écritures techniques manquantes après crash sans nouvelle commande,
décision ou permission ; une identité réutilisée avec un contenu différent
SHALL être refusée.

#### Scenario: Réponse perdue ou interruption entre écritures
- **GIVEN** un reçu préparé correspondant à la frontière et à la preuve enregistrée
- **WHEN** son propriétaire relit le même actionId après interruption
- **THEN** le résultat est retrouvé ou la reprise technique exacte est proposée sans exécution native

### Requirement: Réutiliser uniquement les anciens appels déjà réconciliés par revue
Le système SHALL pouvoir qualifier un terminal de lecture dans un historique
contenant des refus antérieurs déjà couverts par un reçu DONE du même
propriétaire, RUN et contexte. Il SHALL vérifier l’opération close, son digest,
la demande native d’origine et chaque call ou wrapper réutilisé ; les parties
inconnues ou divergentes SHALL rester bloquantes. Le diagnostic complet et
l’issue historique indéterminée SHALL être conservés.

#### Scenario: Deux refus clos puis un terminal actuel
- **GIVEN** deux calls aborted déjà revus dans une validation CANCELLED et un unique terminal actuel exact
- **WHEN** le propriétaire demande reconcile-reviewed-terminal avec une nouvelle revue et des observations stables
- **THEN** les anciennes preuves sont référencées dans le reçu sans transformer leur issue et seule la coordination actuelle est clôturée

#### Scenario: Ancienne preuve divergente ou incomplète
- **GIVEN** un reçu non DONE, un autre contexte, un digest divergent, un call dupliqué ou modifié ou un effet non couvert
- **WHEN** le réemploi est envisagé
- **THEN** les protections sont conservées sans exécution native, permission ou résultat inventé

### Requirement: Retirer une coordination approuvée jamais émise
Le système SHALL permettre au propriétaire de retirer une validation PREPARED
approved non consommée, sans native, résultat ou accès, lorsque deux lectures
stables prouvent la session idle, zéro permission et aucun appel à effet
postérieur à la demande native exacte. L’action SHALL conserver approved
historique et qualifier seulement COORDINATION_WITHDRAWN_BEFORE_ISSUANCE,
sans preuve NO_EFFECT, nativeResult ou once fabriquée.

#### Scenario: Serveur préparé remplacé avant lancement
- **GIVEN** une policy withdraw-unissued-validation propriétaire et aucune émission native ou accès observés
- **WHEN** les identités, versions, frontières et lectures stables sont vérifiées
- **THEN** seule la coordination devient CANCELLED et l’ancienne réponse locale est retirée sans annulation native ou rejeu

#### Scenario: Effet ou permission déjà présent
- **GIVEN** un appel à effet, une permission, une once, un accès ou une frontière divergente
- **WHEN** le retrait est demandé
- **THEN** il est refusé et les protections sont conservées
