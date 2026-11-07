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
approved non consommée, sans native, résultat ou accès exécutable, lorsque deux
lectures stables prouvent la session idle, zéro permission et aucun appel à
effet postérieur à la demande exacte. L’action SHALL conserver approved et
qualifier seulement COORDINATION_WITHDRAWN_BEFORE_ISSUANCE, sans NO_EFFECT,
nativeResult ou once fabriquée. Les exceptions typées restent distinctes.

#### Scenario: Serveur préparé remplacé avant lancement
- **GIVEN** une policy withdraw-unissued-validation propriétaire et aucune émission native ou accès observés
- **WHEN** les identités, versions, frontières et lectures stables sont vérifiées
- **THEN** seule la coordination devient CANCELLED et l’ancienne réponse locale est retirée sans annulation native ou rejeu

#### Scenario: Parent seulement référencé libéré après rattachement refusé
- **GIVEN** une décision approved, aucun native/nativeResult/once, un parent unique RELEASED de même RUN/contexte/version et aucune appartenance de l’enfant à ses membres
- **WHEN** le reçu de libération, les membres terminaux et deux frontières natives sans effet ni permission sont vérifiés
- **THEN** le propriétaire retire uniquement l’enfant sans modifier la décision, le parent ni les baux
- **AND** les ressources excédentaires du manifeste ne deviennent pas exécutables et une unité corrigée utilise de nouvelles identités

#### Scenario: Effet ou permission déjà présent
- **GIVEN** un appel à effet, une permission, une once, un accès actif non qualifié ou une frontière divergente
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

### Requirement: Retrait natif Write V2 refusé sous permission edit
La projection SHALL exposer les calls write et leurs reçus SDK existants sans dépendre de la présence d’un événement journal. La preuve de retrait SHALL qualifier write V2/path+content fermé sous permission edit, avec cible, digests natif et de part, call/permission et ACK204 exacts, deux frontières stables et gardes de parent existantes. Elle SHALL annuler seulement l’enfant, conserver APPROVED et parent, sans conversion, exécution, nativeResult ou once inventés.

#### Scenario: Write divergent et journal manquant
- **GIVEN** un write error/aborted/executed=false rejeté par le client CAB, SID idle sans permission
- **WHEN** le propriétaire qualifie les preuves du même call/fichier et applique le retrait
- **THEN** le diagnostic montre le call write et le reçu ACK204 même sans événement journal, coverage restant manquante
- **AND** l’enfant devient CANCELLED sans égaliser son input au digest approuvé ni modifier le parent

#### Scenario: Preuve ou portée non qualifiée
- **WHEN** reçu absent/non204, call supplémentaire, schéma/cible/digest ou identité divergent, état natif actif ou parent inadmissible
- **THEN** la récupération est refusée avec protections conservées et aucun input rendu exécutable

#### Scenario: Libération et rejeu
- **WHEN** l’enfant est terminal et la libération ordinaire est admissible
- **THEN** release-access reste une action et un reçu distincts sans token public
- **AND** une réponse perdue se reprend par le même reçu, jamais par nouveau write/reject/once

### Requirement: Documentation des sources courantes
Le contrat MUST orienter l’orchestrateur vers les surfaces courantes du RUN et
les états MCP/natifs structurés. Il MUST distinguer timestamps historiques,
cache monitor périmé,état broker,décision locale et permission native. Un signal
historique seul MUST NOT créer un blocage ou un accord opérationnel.

#### Scenario: Tour rejeté et ancien timestamp busy
- **WHEN** la session est absente de l’API active avec part terminale et permissions vides
- **THEN** les procédures utilisent leurs preuves courantes sans imposer l’ordre historique busy/idle

### Requirement: Documentation de la couverture propriétaire
Le contrat MUST distinguer présence de policy et couverture de l’action cible.
Dans le change autorisé, l’orchestrateur MUST pouvoir cadrer sa policy bornée
sans nouvelle demande humaine, puis prélever un plan frais. Les ressources et
les gardes existantes MUST rester inchangées.

#### Scenario: Policy présente mais insuffisante
- **WHEN** policySetupRequired=false et l’action cible porte orchestrator-policy-required
- **THEN** la procédure fait vérifier action et ressources avant une policy neuve strictement bornée

### Requirement: Documentation des formes et empreintes
Le contrat MUST séparer arguments MCP,descripteur de stage et checkpoint. Il
MUST imposer des empreintes prélevées programmatiquement depuis leur source,
sans transcription ni confusion plan/preuve native. Les erreurs locales de
lecture MUST être distinguées d’une issue serveur inconnue.

#### Scenario: Métadonnées de checkpoint supplémentaires
- **WHEN** une comparaison globale diffère uniquement par les métadonnées locales
- **THEN** l’orchestrateur compare les champs du schéma revu sans réécrire le mandat natif

### Requirement: Documentation de clôture broker après retrait
Le contrat MUST décrire la clôture propriétaire d’une demande broker encore
PENDING après retrait local CANCELLED et accès RELEASED, avec identité exacte,
quiescence et absence de native/nativeResult/once. Il MUST conserver les reçus
et l’APPROVED local historique ; un brokerAPPROVED reste non annulable.

#### Scenario: Réponse exécutable retirée et demande PENDING
- **WHEN** la décision exécutable est absente et les preuves complètes de retrait et libération concordent
- **THEN** le propriétaire peut clore uniquement la demande encore PENDING par son cancel natif unique, puis vérifier état/readiness sans nouvel effet

### Requirement: Documentation de terminalité et lecture ciblée
Skill,plugin et commande MUST orienter vers les seules références du cas. Le
contrat MUST distinguer diagnostic BLOCKED/HUMAN_REQUIRED et gate terminal
validé selon le prompt. Une récupération dans le change MUST rester décidée
par l’orchestrateur, sans permission ou clôture métier déduite d’un diagnostic.

#### Scenario: Faux blocage local
- **WHEN** un helper local refuse un objet conforme ou lit un état historique
- **THEN** l’orchestrateur corrige son interprétation et suit la voie qualifiée sans relâcher les gardes serveur ni redémarrer le RUN

### Requirement: Documentation des niveaux de preuve d’exécution
Le contrat MUST distinguer booléen executed,diagnostic conservateur et résultat
durable corrélé. executed=false seul MUST NOT autoriser NO_EFFECT ou un rejeu.
Une clôture normale MUST suivre ses gardes et preuves d’effet ; les vrais
reçus de rejet avant once MUST NOT être inventés après une exécution.

#### Scenario: Shell terminé et diagnostic conservateur
- **WHEN** une part expose executed=false mais une fin native et un résultat durable completed/exit0 correspondent à la once exacte
- **THEN** l’orchestrateur suit la clôture normale sous ses gardes, sans rejouer ni réécrire le diagnostic UNVERIFIED

### Requirement: Retirer une décision rejetée jamais émise
Le propriétaire SHALL pouvoir retirer une opération PREPARED dont la décision
est rejected, sans native, nativeResult, once ou accès lié, par la récupération
qualifiée withdraw-unissued-validation. Le contrôleur SHALL conserver les
guardes de propriétaire/policy, identité et deux lectures natives stables.
Seule la coordination SHALL devenir CANCELLED ; rejected SHALL rester historique.

#### Scenario: Rejet terminal sans émission empêchant la clôture
- **WHEN** la décision rejetée exacte est terminale, le SID courant idle, sans permission ni effet, et la frontière reste stable
- **THEN** le retrait retire la réponse locale inexécutable et conserve la décision rejected dans le registre et le reçu après redémarrage

### Requirement: Retrait sur référence d’accès déjà libéré
Un parent seulement référencé puis RELEASED SHALL être admissible au retrait
sans émission avec reçu de libération valide, membres terminaux et absence de
membership de l’enfant. Le contrôleur SHALL vérifier les identités, deux
frontières natives sans effet ni permission et l’empreinte stable du parent.
La décision, le parent et les baux SHALL rester inchangés.

#### Scenario: Manifeste enfant excédant l’ancien parent
- **WHEN** le rattachement a été refusé avant once et les préconditions du retrait sont prouvées
- **THEN** seule la coordination enfant devient CANCELLED sans rendre ses ressources exécutables

### Requirement: Retraite historique non exécutable
CAB SHALL permettre le retrait propriétaire d’une opération PREPARED/REJECTED
de génération antérieure dans le même RUN et contexte, sous identité persistée
exacte, ressources couvertes et autorité courante. Le retrait MUST NOT créer
une opération, once, accès ou résultat et SHALL conserver la décision et la
génération historiques. Native, résultat, once ou accès lié SHALL interdire
cette admission historique.

#### Scenario: Génération étendue après rejet
- **WHEN** un rejet jamais émis de génération N est retiré sous autorité N+1 avec deux frontières natives stables
- **THEN** seule sa coordination devient CANCELLED et les identités restent inchangées

#### Scenario: Identité étrangère ou émission
- **WHEN** le contexte, propriétaire ou digest divergent, ou un effet est lié
- **THEN** CAB refuse sans modifier les protections

### Requirement: Preuve de retrait corrélée au mandat
Le retrait SHALL qualifier un unique call cible par entrée native, contenu,
identité et reçu de rejet exact. Dans une frontière comportant des calls candidats, les appels indépendants SHALL être exclus
seulement sous corrélation persistée et preuve native terminale vérifiée.
CAB MUST NOT tronquer le transcript au prochain mandat ou ignorer un appel
ambigu ; les deux frontières complètes SHALL rester stables.

#### Scenario: Plusieurs mandats successifs
- **WHEN** un call refusé exact est suivi d’appels de mandats indépendants terminalement prouvés
- **THEN** le retrait cible est admissible sans modifier ces autres opérations

#### Scenario: Candidat ou mandat ambigu
- **WHEN** plusieurs calls cibles ou un appel non attribué restent présents
- **THEN** le retrait reste refusé

### Requirement: Réconciliation de port après reboot noyau
Une opération locale de port en timeout SHALL pouvoir être réconciliée après
preuve d’un reboot du noyau strictement postérieur au call historique, sous
revue existante, deux sondes natives complètes et fraîches du port/processus,
identités/espaces courants concordants et doubles frontières stables. CAB MUST
conserver le résultat historique inconnu et MUST NOT substituer un ancien PID.

#### Scenario: Reboot qualifié et ressource quiescente
- **WHEN** les captures natives prouvent le même reboot postérieur au timeout et les deux sondes prouvent la quiescence
- **THEN** le reçu indique HISTORICAL_OUTCOME_UNOBSERVED_RESOURCE_QUIESCENT sans résultat historique fabriqué

#### Scenario: Simple changement de processus ou preuve partielle
- **WHEN** seul le PID change, le reboot précède le call, une capture diverge ou un listener/processus reste actif
- **THEN** CAB conserve la protection et refuse la réconciliation

### Requirement: Sondes du SID courant sur un port historique
Après preuve de reboot, le contrôleur SHALL pouvoir préparer une sonde exacte
pour le SID courant du même RUN/contexte. Seul son mandat neuf explicitement
approuvé, limité à la lecture du port, SHALL traverser la quarantaine ancienne.
La préparation SHALL lier commande, nonce, cible, session et empreinte de
l’opération historique. Les autres lectures inter-SID SHALL rester refusées.

#### Scenario: SID source historique révoqué
- **WHEN** le contrôleur prépare le probe de reboot exact et le SID courant l’exécute sous nouveau mandat et once
- **THEN** les deux captures sont vérifiées dans le SID courant et les preuves historiques restent dans leur SID source

#### Scenario: Commande ou identité différente
- **WHEN** la commande, ressource, nonce ou SID ne correspond pas à la préparation exacte
- **THEN** aucune compatibilité de lecture de la quarantaine n’est accordée

### Requirement: Séquence native rejetée sans call cible
Pour une préparation rejetée jamais émise, CAB SHALL pouvoir qualifier la
séquence native depuis request_validation jusqu’au rejet exact observé et
à sa fin stop postérieure à la décision durable. Les parents natifs, sessions,
messages, dates et le message utilisateur suivant SHALL être vérifiés. Tout
call environnemental dans cette séquence ou enfant tardif de ses parents SHALL
interdire cette preuve.

#### Scenario: Attente puis rejet dans une continuation native
- **WHEN** les échanges request/get/poll de même identité se terminent après le rejet durable sans call environnemental
- **THEN** seule la coordination rejetée est retirée et les messages ultérieurs restent inclus dans les empreintes

#### Scenario: Effet pendant l’attente ou source incomplète
- **WHEN** un call environnemental précède le rejet observé, la parenté diverge, une fin manque ou une frontière change
- **THEN** CAB conserve la préparation et ses protections sans inventer de preuve de rejet

### Requirement: Conservation du suffixe après preuve de rejet
Le transcript complet SHALL rester scellé sur les deux frontières de retraite.
Les effets des séquences ultérieures MUST NOT être déclarés sans effet ni
perdre leurs protections par le retrait de la coordination rejetée.

#### Scenario: Activité ultérieure indépendante
- **WHEN** le retrait qualifie une séquence rejetée close suivie d’autres échanges
- **THEN** le reçu conserve les empreintes du suffixe et ne modifie aucune autre opération ou protection

### Requirement: Attribution structurelle des processus natifs dans une sonde
La sonde SHALL distinguer les ancêtres attestés et le client interactif du
serveur natif par identité, filiation et topologie réseau/terminal stables.
Elle MUST NOT exclure par nom seul. Tout autre processus du scope SHALL rester
candidat ; une couverture inaccessible SHALL rester non qualifiée. Les deux
sondes et protections existantes SHALL rester requises.

#### Scenario: Client interactif attesté et ancêtres du serveur
- **WHEN** des identités stables prouvent la filiation native et le client partage parent, exécutable, terminal et connexion API loopback appariée
- **THEN** ces seuls processus sont attribués à l’infrastructure native et les autres candidats restent contrôlés

#### Scenario: Nom ressemblant ou topologie incertaine
- **WHEN** un processus s’appelle opencode sans preuve complète ou une identité change pendant la capture
- **THEN** il n’est pas exclu et la sonde ne déclare pas la quiescence

### Requirement: Diagnostics de processus bornés
La sonde SHALL limiter ses diagnostics aux PID, startTime, PPID, comm et cwd
relatif nécessaires. Elle MUST NOT lire cmdline ou environ.

#### Scenario: Candidat non attribuable
- **WHEN** un candidat du workspace n’est pas exclu par preuve structurelle
- **THEN** son diagnostic borné permet la revue et la sonde reste non quiescente

### Requirement: Sceau limité à une connexion native pertinente
L’attribution d’un client interactif SHALL vérifier ses identités, exécutable,
terminal et au moins une paire TCP réciproque possédée et présente aux deux
observations. Les sockets tiers SHALL NOT faire partie de ce sceau. Aucune
connexion pertinente stable ou une identité divergente SHALL maintenir le refus.

#### Scenario: Connexions API tierces apparaissant pendant une sonde
- **WHEN** une paire serveur/client attestée reste présente et des sockets tiers changent
- **THEN** ce bruit ne suffit pas à invalider la preuve ; les autres candidats et identités restent vérifiés

### Requirement: Sonde quarantinée livrée par carrier scellé
Le contrôleur SHALL préparer le payload du seul générateur qualifié de sonde
et lier son carrier au nonce/opération future, à l’opération historique, au
SID courant, à la génération et au seul port en lecture. Tout payload libre,
stage ambigu ou liaison divergente SHALL être refusé. Stage seul MUST NOT
valoir décision, accès ou once.

#### Scenario: Deux mandats de sonde sans recopie du corps
- **WHEN** le propriétaire prépare deux stages exacts et approuve chaque lanceur avec ses identités et ressources
- **THEN** chaque once ne délivre que son corps scellé et la réconciliation vérifie les deux calls distincts et les mêmes protections

#### Scenario: Lanceur ou payload d’une autre opération
- **WHEN** un stage, une identité ou une ressource ne correspond pas au permit du générateur
- **THEN** aucune admission spéciale ni délivrance du payload n’est accordée

### Requirement: Capacité bornée du carrier sans purge implicite
Le registre de stages SHALL accepter jusqu’à512entrées avec le plafond global
16Mio et64Kio par corps inchangés. Dépasser un plafond SHALL refuser sans
mutation ni purge. Les entrées existantes SHALL rester lisibles et intactes.

#### Scenario: Registre historique au plafond128
- **WHEN** de nouvelles sondes scellées sont préparées dans un registre de128stages
- **THEN** elles peuvent être ajoutées dans les bornes512/16Mio sans retirer les preuves précédentes

### Requirement: Retrait délégué avant émission native
La policy propriétaire MAY permettre release-access RECONCILED pour un parent HELD dont les membres sont terminaux ou PREPARED sans entrée native/nativeResult. Mandat clos, SID quiescent, zéro permission et gardes ordinaires SHALL rester exigés. Le token SHALL être traité uniquement en interne, jamais fourni ou retourné dans une sortie publique.

#### Scenario: Token d’un accès non commencé exposé
- **WHEN** le propriétaire décide le retrait après qualification de la frontière
- **THEN** il obtient la clôture par la route existante sans nouvelle once ; un accès restauré est d’abord réconcilié

### Requirement: Réconciliation sans auto-blocage des préparations non émises
La réconciliation d’un accès restauré SHALL ignorer uniquement les demandes enregistrées du même RUN/contexte, APPROVED sans native, nativeResult ni once. Tout mandat ouvert, demande indécise, réconciliation, permission non appariée ou effet inconnu SHALL bloquer. Deux frontières natives stables, identité, empreinte et fencing SHALL rester exigés ; aucune demande n’est exécutée ni décision modifiée.

#### Scenario: Accès restauré avec sa propre préparation approuvée
- **WHEN** l’accès est réconcilié et les seules préparations restantes sont enregistrées, approuvées et non émises dans le même contexte
- **THEN** la qualification native peut aboutir sans nouvelle permission ni once et sans ignorer une demande étrangère ou indécise

### Requirement: Preuve ciblée de rejet natif
Pour un retrait qualifié, CAB MAY lire le reçu de rejet identifié explicitement par workspace, session et permission. La même identité SHALL être liée à la frontière observée et aux deux lectures de l'action. Le reçu ciblé SHALL être intègre et satisfaire tous les contrôles natifs existants. Les autres reçus inconnus SHALL rester conservés ; aucune décision ni permission SHALL être rejouée.

#### Scenario: Reçu exact valide et enveloppe étrangère invalide
- **WHEN** le propriétaire fournit l'identité exacte d'un reçu valide et qu'une autre enveloppe est illisible
- **THEN** le reçu exact peut être vérifié pour la seule action ciblée sans modifier l'enveloppe étrangère

#### Scenario: Reçu exact absent ou divergent
- **WHEN** le reçu exact est absent, invalide ou ne correspond pas aux preuves natives de l'opération
- **THEN** le retrait est refusé et les protections restent en place

### Requirement: Rejet attesté avant redémarrage du processus
Pour une récupération ciblée, CAB MAY prendre en compte un reçu ACK de rejet émis par l'ancienne instance OpenCode si son PID a disparu, la nouvelle instance et la même session sont vérifiées, et toutes les preuves exactes de call, cible, dates et absence d'effet restent cohérentes. CAB SHALL lier la preuve de disparition et l'identité courante à la frontière lue deux fois. Une identité ambiguë SHALL refuser le retrait.

#### Scenario: Rejet attesté et ancien processus disparu
- **WHEN** le reçu exact ACK correspond au call natif non exécuté, l'ancien PID est absent et la session appartient au même workspace sous une nouvelle instance vérifiée
- **THEN** le propriétaire peut utiliser ce reçu dans la seule récupération qualifiée sans rejouer le rejet ni l'effet

### Requirement: Appels d'atelier indépendants après un rejet
CAB MAY distinguer les essais d'atelier confinés d'un effet projet refusé si leurs identités, leurs reçus terminaux et leur entrée exacte sont vérifiés. CAB SHALL conserver une preuve de ces effets d'atelier distincte de l'absence d'effet projet. Un appel non vérifiable SHALL continuer à bloquer la réconciliation.

#### Scenario: Essai d'atelier terminal vérifié
- **WHEN** un essai postérieur est lié au même RUN, à sa session et à son reçu d'exécution confiné et terminal
- **THEN** il ne devient pas un second write projet et sa preuve reste présente dans la réconciliation

### Requirement: Lecture native à sortie tronquée
CAB MAY reconnaître une lecture native explicite et terminée comme non mutante même si sa sortie est tronquée, lorsque son outil, son identité et son entrée sont vérifiés. CAB SHALL NOT utiliser la sortie tronquée comme preuve du contenu complet lu.

#### Scenario: Résultat de lecture tronqué
- **WHEN** un appel native read terminé possède une entrée valide et indique une sortie tronquée
- **THEN** il reste distingué d'une écriture sans attester le contenu complet
