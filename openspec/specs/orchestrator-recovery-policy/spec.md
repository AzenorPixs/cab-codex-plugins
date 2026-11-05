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
Le système SHALL clôturer une coordination PREPARED approved sans native/once après revue READ_ONLY explicite, commande et terminal uniques, deux observations stables et policy propriétaire. Les sources épinglées ou la commande inline intégralement revue SHALL être liées. Un parent simplement référencé MAY rester HELD s’il est compatible et strictement inchangé, sans liaison effective. L’issue permission non vérifiée SHALL rester explicite, sans nativeResult/ACK/NO_EFFECT inventé.

#### Scenario: Terminal exact et sources relues
- **GIVEN** une policy reconcile-reviewed-terminal, un shell completed non tronqué, exit entier et revue propriétaire concordante
- **WHEN** la frontière et les sources sont stables
- **THEN** seule la coordination devient COMPLETED et sa réponse exécutable est invalidée, sans rejeu natif

#### Scenario: Code inline revu
- **GIVEN** une commande inline entièrement examinée READ_ONLY et inlineCommand true
- **WHEN** le SHA commande, le call et le digest de part natifs concordent
- **THEN** la liste de sources fichiers peut être vide, sans dispense de revue de tout code ou dépendance exécuté

#### Scenario: Parent référencé sans rattachement
- **GIVEN** un parent unique HELD du même RUN/contexte/version couvrant l’enfant courant mais ne le contenant pas
- **WHEN** la revue terminale est qualifiée et le parent stable
- **THEN** l’enfant devient COMPLETED sans ajout aux operationIds ni modification du parent, des révisions ou des baux

#### Scenario: Preuve ou parent non admissible
- **WHEN** une once/native existe, l’enfant est effectivement attaché, le parent est étranger/non HELD/hors portée/modifié, ou un effet, doublon, source ou digest diverge
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

La voie générique reste sans accès ; l’exception de retrait isolé d’un shell
refusé attaché est définie séparément et ne libère jamais son parent.

#### Scenario: Effet ou permission déjà présent
- **GIVEN** un appel à effet, une permission, une once, un accès ou une frontière divergente
- **WHEN** le retrait est demandé
- **THEN** il est refusé et les protections sont conservées

### Requirement: Retrait autonome documenté d’une unité approuvée avec accès détenu
Le contrat distribué MUST diriger le propriétaire vers locks/release avec
RECONCILED pour une unité obsolète PREPARED/APPROVED et accès HELD avant
émission native. Il MUST distinguer ce cas du retrait sans accès et interdire
le faux NO_EFFECT, le changement de décision historique et le rejeu de once.
Les gardes existantes et les limites du mandat MUST rester opposables.

#### Scenario: Demande d’aide pour une voie déjà disponible
- **GIVEN** une unité approuvée jamais émise dont l’accès est HELD et la frontière native prouvée quiescente
- **WHEN** l’orchestrateur doit retirer cette unité dans son mandat
- **THEN** le skill et la commande le dirigent vers la procédure existante sans solliciter le correcteur ni le développeur

#### Scenario: Signalement PENDING périmé
- **WHEN** un ancien retour PENDING est suivi d’une décision APPROVED durable
- **THEN** l’orchestrateur relit admission et décision sur les mêmes identifiants et ne diagnostique pas une panne à partir de l’ancien retour

#### Scenario: Effet incertain ou résultat de retrait absent
- **WHEN** la frontière ou la réussite du retrait n’est pas prouvée
- **THEN** les protections restent conservées et aucune autorisation, réussite métier ou absence d’effet n’est inventée

### Requirement: Composition autonome du retrait d’un shell approuvé sans accès
Le contrat distribué MUST présenter l’acquisition puis clôture RECONCILED
comme une composition ordinaire conditionnelle pour un shell APPROVED refusé
avant once sans accès lié. Le propriétaire MUST examiner manifeste courant,
révisions et disjonction. Les identités et protections MUST rester conservées ;
aucune nouvelle permission, annulation broker ou absence d’effet ne MUST être
inventée pour satisfaire une branche de récupération inapplicable.

#### Scenario: Manifeste courant et disjoint
- **WHEN** le propriétaire retire dans son mandat une unité shell approuvée jamais émise avec frontière quiescente prouvée
- **THEN** le skill et la commande indiquent la composition ordinaire sans solliciter le correcteur, sous toutes les gardes existantes

#### Scenario: Recouvrement, base périmée ou acquisition non détenue
- **WHEN** le scope est incompatible ou périmé, ou l’acquisition ne devient pas HELD
- **THEN** le contrat interdit de forcer la clôture HELD ou de modifier les ressources pour contourner le refus

### Requirement: Retrait isolé d’un shell refusé attaché
Le contrôleur SHALL retirer uniquement l’enfant PREPARED/APPROVED sans native/nativeResult/once sur preuve qualifiée de rejet shell/edit et ACK204 exact. Deux frontières stables SHALL vérifier SID idle, zéro permission et parent HELD inchangé. Les lectures natives prouvées sans mutation SHALL rester distinctes des effets. Un historique d’autre SID SHALL être admis seulement CANCELLED sans native/nativeResult/once, mêmes RUN/contexte/version. APPROVED et protections SHALL rester conservés.

#### Scenario: Sous-opération sur parent protégé
- **GIVEN** un parent unique HELD du même RUN/contexte/version couvrant l’enfant courant et une autre opération historique
- **WHEN** le propriétaire retire le shell ou edit refusé à la frontière qualifiée
- **THEN** seule la coordination ciblée devient CANCELLED et sa réponse exécutable locale est invalidée
- **AND** le parent, ses token/fencing, autres opérations, révisions et baux restent strictement identiques

#### Scenario: Historique annulé après changement de session
- **GIVEN** une ancienne opération d’autre SID annulée avant émission, sans native, nativeResult ni once, dans le même accès et la même génération
- **WHEN** l’enfant courant dispose d’une preuve de rejet qualifiée
- **THEN** l’ancien SID historique ne bloque pas le retrait ciblé, sans changement de cette ancienne opération ni de l’accès
- **AND** les gardes d’émission sur accès historique restent inchangées, aucune nouvelle once ne vient du retrait

#### Scenario: Ancien SID non admissible
- **GIVEN** un enfant d’ancien SID, un historique étranger ou un historique d’autre SID non CANCELLED ou présentant native, résultat ou once
- **WHEN** le retrait est demandé
- **THEN** CAB refuse sans mutation de l’enfant ni du parent

#### Scenario: Preuve ou parent non admissible
- **GIVEN** un reçu absent, input/cible divergent du rejet qualifié, effet supplémentaire, once, résultat, parent absent/multiple/étranger/non HELD ou frontière modifiée
- **WHEN** le retrait est demandé
- **THEN** il est refusé sans libérer ni réconcilier le parent

#### Scenario: Lectures natives après le rejet
- **GIVEN** l’edit ciblé refusé et des read V2 terminés executed=false avec provenance native, path et fenêtre de lecture valides, sans troncature
- **WHEN** CAB qualifie les candidats d’effet avant le retrait
- **THEN** ces lectures sont reconnues comme observations et l’edit reste l’unique effet candidat
- **AND** la normalisation dérive la provenance du nom natif read, jamais d’une métadonnée libre

#### Scenario: Lecture non qualifiée ou effet supplémentaire
- **GIVEN** une lecture active, échouée, tronquée, executed=true, input inconnu ou outil imitant read, ou un shell/write supplémentaire
- **WHEN** CAB examine la frontière de retrait
- **THEN** l’appel reste à qualifier et la frontière insuffisante est refusée sans mutation ni once

#### Scenario: Réponse perdue et permission tardive
- **GIVEN** un retrait qualifié durable et une réponse perdue ou un redémarrage
- **WHEN** la même action est relue ou répétée
- **THEN** le même reçu est restauré sans effet ni modification du parent
- **AND** toute permission tardive pour l’opération annulée reste refusée

### Requirement: Retrait d’une préparation dont le broker refuse définitivement l’admission
Le propriétaire SHALL pouvoir retirer une préparation sans décision, accès ou effet via withdraw-unissued-validation sur preuve native NOT_ADMITTED exacte et fraîche, deux frontières stables, SID idle et zéro permission. Seule la coordination SHALL devenir CANCELLED ; le terminal natif et l’absence de décision restent conservés. La reprise SHALL restituer le même reçu sans rejeu.

#### Scenario: Terminal broker et préparation locale sans effet
- **GIVEN** la même identité de demande/opération/RUN/SID et une lecture get_approval NOT_ADMITTED complète de moins de cinq minutes
- **WHEN** le propriétaire retire la coordination sur la frontière qualifiée
- **THEN** l’opération devient CANCELLED sans décision inventée, native/nativeResult/once ni permission
- **AND** le reçu reste identique après perte de réponse ou redémarrage
- **AND** les protections indépendantes sont inchangées et le mandat suivant exige des identifiants neufs

#### Scenario: Preuve inadmissible
- **GIVEN** une preuve PENDING/APPROVED, étrangère, périmée ou tronquée, une décision, un accès, une permission ou un effet
- **WHEN** le retrait de préparation est demandé
- **THEN** il est refusé sans mutation des protections

### Requirement: Retrait refusé sur parent seulement référencé
Le contrôleur SHALL permettre au propriétaire de retirer un enfant PREPARED/APPROVED refusé avant once référençant un parent HELD unique sans membership, sous preuve native ACK204 et deux frontières stables. Il SHALL vérifier identités, couverture et membres historiques, conserver le parent inchangé et ne créer aucun rattachement, nativeResult ou permission. Les digests exacts SHALL rester exigés pour toute exécution future.

#### Scenario: Edit divergent refusé sans liaison
- **GIVEN** un edit aborted, rejet ACK204 exact, SID idle sans permission et parent référencé compatible
- **WHEN** le propriétaire applique withdraw-unissued-validation dans son mandat
- **THEN** seule la coordination enfant devient CANCELLED, décision APPROVED historique conservée
- **AND** parent, membres, révisions, accès, baux et historique restent identiques sans once ni attachement rétroactif

#### Scenario: Preuve ou parent divergent
- **WHEN** le reçu manque, un effet/permission existe, ou parent, identité, couverture, empreinte ou membres divergent
- **THEN** le retrait est refusé sans changement des protections et aucun consentement n’est inventé

### Requirement: Libération owner d’un accès sans token de contexte
La récupération SHALL proposer release-access au propriétaire sous policy du même RUN pour un accès HELD non restauré/non quarantiné aux membres terminaux. Elle SHALL lier token/fencing et empreinte en interne puis appliquer locks/release avec ses gardes natives inchangées, seulement COMPLETED ou RECONCILED. Aucun token public, rotation, NO_EFFECT fictif ni libération de bail SHALL être produit. La reprise SHALL exiger le releaseDigest exact.

#### Scenario: Token perdu après compactage
- **GIVEN** le propriétaire valide les preuves terminales et l’issue d’un accès éligible
- **WHEN** il soumet recovery/action avec action release-access et digests frais sans token
- **THEN** le contrôleur recontrôle l’accès et les preuves natives avant la libération ordinaire ciblée
- **AND** le reçu public filtre le token, les once/résultats et autres protections restent conservés

#### Scenario: Frontière ou preuve non qualifiée
- **WHEN** l’accès change, est restauré/quarantiné, un membre reste actif/inconnu ou les gardes ordinaires échouent
- **THEN** la libération est refusée sans forçage et l’effet incertain reste protégé

#### Scenario: Réponse perdue
- **WHEN** l’intention existe sans preuve d’effet
- **THEN** la reprise reste outcome-unverified sans seconde mutation
- **WHEN** l’accès est RELEASED avec releaseDigest exact du reçu
- **THEN** le même reçu est finalisé sans rejeu ni exposition du token

### Requirement: Retrait du membre refusé d’un accès dédié
La récupération SHALL admettre withdraw-unissued-validation pour l’unique membre PREPARED/APPROVED d’un accès HELD dédié de même identité, non restauré/non quarantiné, sans native/nativeResult/once, sous rejet natif ACK204 et deux frontières stables. Elle SHALL annuler seulement le membre, conserver APPROVED et l’accès inchangé. La libération SHALL rester une action release-access distincte sous ses gardes et son propre reçu, sans token public ni rejeu.

#### Scenario: Retrait puis libération avec token perdu
- **GIVEN** un edit divergent refusé, un accès dédié à ce seul membre et un SID idle sans permission
- **WHEN** le propriétaire applique le retrait sur preuves exactes
- **THEN** le membre devient CANCELLED et le parent HELD/token/fencing/membership/révisions/baux restent identiques
- **WHEN** il choisit ensuite une libération ordinaire admissible sur le plan frais
- **THEN** un second reçu constate RELEASED sans exposition de token ni nouvelle once/résultat natif

#### Scenario: Frontière non qualifiée
- **WHEN** une identité, un ACK, un outil, un effet, une permission ou l’empreinte diverge, ou l’accès dédié est restauré/quarantiné
- **THEN** le retrait reste refusé et les protections sont conservées
