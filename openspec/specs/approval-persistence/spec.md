# approval-persistence Specification

## Purpose
Cette capacité garantit que les états d'approbation et leur historique survivent aux interruptions sans inventer de décision métier.

## Requirements

### Requirement: Persistance durable des approbations
CAB SHALL enregistrer l'état courant des approbations dans un magasin persistant
avant de confirmer une transition métier. Le magasin SHALL garantir
l'exclusivité d'une instance pour un même espace persistant. Cette persistance
SHALL couvrir le RUN et sa reprise après interruption. Lors d'une
réinitialisation globale exclusive CAB, l'orchestrateur SHALL purger les anciens états selon le
contrat de démarrage ; aucune trace ni décision de la session précédente SHALL
être restaurée automatiquement.

#### Scenario: Reprise d'une demande en attente
- **WHEN** le broker redémarre pendant la reprise du même RUN alors qu'une demande est PENDING
- **THEN** la demande reste récupérable avec le même identifiant et le même état métier

#### Scenario: Nouvelle session CAB
- **WHEN** l'orchestrateur démarre une réinitialisation globale exclusive après libération et arrêt des ressources de tous les RUN
- **THEN** les anciens magasin, journal, checkpoints et états de supervision sont purgés ensemble
- **AND** aucune ancienne demande, décision ou trace de codage n'est restaurée

### Requirement: Journal vérifiable
CAB SHALL consigner les transitions métier dans un journal append-only chaîné par SHA-256. Lorsqu'un checkpoint HMAC est configuré, CAB SHALL vérifier son intégrité sans exposer la clé dans ses sorties.

#### Scenario: Intégrité du journal invalide
- **WHEN** le journal ou son checkpoint ne passe pas les vérifications d'intégrité
- **THEN** CAB signale une cause de santé non saine et ne prétend pas que l'état est fiable

### Requirement: Reprise non ambiguë
CAB SHALL seulement réparer automatiquement une divergence technique non ambiguë. Une divergence qui empêcherait d'établir la décision métier SHALL conduire à HUMAN_REQUIRED.

#### Scenario: Décision ambiguë après interruption
- **WHEN** CAB ne peut pas déterminer de manière certaine si une décision terminale a été appliquée
- **THEN** CAB ne crée aucune décision et exige une intervention humaine

### Requirement: Recherches indexées pendant la récupération initiale

CAB SHALL construire un index temporaire des couples `(approval_id, event_type)` depuis
une seule lecture initiale du journal pour les recherches de présence de la première
boucle de réparation après un arrêt non propre. CAB SHALL préserver les validations
d'identifiants, les écritures durables, les contrôles de cohérence et d'intégrité, les
verrous et les règles de reprise existants. CAB SHALL NOT conserver cet index dans un
cache global ou le réutiliser après cette boucle.

#### Scenario: Journal déjà cohérent
- **WHEN** le broker reprend après un arrêt non propre et les événements de création et terminaux des approbations existent déjà
- **THEN** les recherches de présence de la première boucle utilisent l'index sans relire le journal pour chaque approbation
- **AND** aucun événement de création ou terminal supplémentaire n'est ajouté

#### Scenario: Événement manquant
- **WHEN** la récupération initiale rencontre un événement fondamental manquant
- **THEN** CAB le répare selon les règles existantes et actualise l'index seulement après l'écriture durable réussie
- **AND** une répétition de cette réparation ne crée aucun doublon

#### Scenario: Échec de lecture ou d'écriture
- **WHEN** la lecture du journal ou l'écriture d'un événement échoue
- **THEN** CAB propage l'erreur selon le contrat existant et ne considère pas une écriture échouée comme présente dans l'index

#### Scenario: Divergence ambiguë
- **WHEN** le journal contredit le magasin pendant la récupération
- **THEN** CAB conserve les contrôles existants et exige HUMAN_REQUIRED sans inventer de décision métier

### Requirement: Recherches indexées pendant la liste des approbations

CAB SHALL construire un index temporaire des couples `(approval_id, event_type)` depuis
une seule lecture initiale du journal avant la boucle de réparation de chaque appel de
liste portant sur un magasin non vide. CAB SHALL utiliser cet index pour les recherches
de présence de cette boucle, y compris les éléments exclus du résultat par le filtre ou
la limite.

#### Scenario: Journal cohérent et résultat filtré
- **WHEN** un appel de liste rencontre un magasin non vide et un journal cohérent
- **THEN** ses recherches de présence utilisent une seule lecture initiale sans relire le journal pour chaque approbation
- **AND** les résultats filtrés, le compte total, le tri et la limite restent inchangés
- **AND** aucun événement fondamental supplémentaire n'est ajouté

#### Scenario: Événement manquant et répétition de la liste
- **WHEN** un appel de liste rencontre un événement de création ou terminal manquant
- **THEN** CAB le répare selon les règles existantes et actualise l'index seulement après une écriture durable réussie
- **AND** une répétition de la réparation ou de l'appel ne crée aucun doublon

#### Scenario: Expiration pendant la liste
- **WHEN** un appel de liste rencontre une approbation PENDING expirée
- **THEN** CAB sauvegarde EXPIRED avant la journalisation et ajoute l'événement terminal selon les règles existantes
- **AND** les résultats et le compte tiennent compte du nouvel état

#### Scenario: Échec de lecture ou d'écriture
- **WHEN** la lecture initiale ou l'écriture d'un événement échoue
- **THEN** CAB propage l'erreur selon le contrat existant sans considérer une écriture échouée comme présente dans l'index

#### Scenario: Magasin vide
- **WHEN** un appel de liste rencontre un magasin vide
- **THEN** CAB retourne une liste vide et un compte nul sans lire ni réparer le journal

#### Scenario: Intégrité invalide lors d'une réparation
- **WHEN** un appel de liste tente une réparation sur un journal dont la chaîne est invalide
- **THEN** CAB conserve les contrôles de l'append et propage l'erreur sans ajouter l'événement à l'index

### Requirement: Purge sans consultation de l'historique
La purge de début de session SHALL supprimer le contenu des seuls espaces
runtime CAB résolus, y compris les fichiers de conflit Syncthing, sans lire
leur ancien contenu ni créer une sauvegarde. Elle SHALL NOT toucher les
sources, secrets, configurations, rapports ou historiques natifs des agents.
L'inode du verrou du broker MAY être conservé vide pour assurer l'exclusion
pendant la purge ; ses anciennes métadonnées SHALL être supprimées.

#### Scenario: Journal orphelin ou fichier de conflit
- **WHEN** l'ancien état CAB contient un journal incohérent ou des fichiers sync-conflict
- **THEN** la réinitialisation globale exclusive purge l'intégralité de cet état sans tenter de le réparer ou de rejouer ses décisions

#### Scenario: Fichier extérieur référencé par un lien interne
- **WHEN** l'espace CAB contient un lien symbolique vers un fichier extérieur
- **THEN** la purge supprime le lien sans lire ni supprimer sa cible

### Requirement: Recherches sans index après récupération

Une recherche sans index SHALL conserver son comportement actuel.

#### Scenario: Recherches sans index après récupération
- **WHEN** une recherche est exécutée sans index temporaire
- **THEN** elle conserve son comportement antérieur

### Requirement: Garanties conservées par la liste indexée

CAB SHALL préserver les verrous, les validations d'arguments et d'identifiants, les
expirations sauvegardées avant journalisation, les append durables et leurs contrôles
existants, la propagation des erreurs, le tri, le compte total, le filtre et la limite.
CAB SHALL NOT conserver l'index après l'appel ou le réutiliser dans un autre appel. Les
recherches sans index SHALL conserver leur comportement existant.

#### Scenario: Garanties conservées par la liste indexée
- **WHEN** deux appels successifs de liste réparent un événement manquant
- **THEN** chaque appel utilise son propre index et conserve verrous, expirations, erreurs, tri, total, filtre et limite

### Requirement: Persistance partagée des RUN concurrents
Démarrer ou clore un RUN MUST conserver magasin, journal, décisions et protections des pairs. La purge MUST refuser toute réservation, acquisition active ou état invalide. Les identités de demandes et opérations admises MUST survivre au crash sans rejeu de permission.

#### Scenario: Isolation concurrente
- **WHEN** un deuxième RUN rejoint le broker
- **THEN** les preuves et protections existantes restent intactes

### Requirement: Attribution durable avant réponse
CAB MUST persister identités, propriétaires, générations, demandes en attente et ensembles attribués avant réponse de succès. Une transaction répétée identique MUST restituer son résultat courant sans nouvelle attribution ; un contenu divergent MUST être refusé. Une erreur de persistance MUST refuser toute permission dépendante.

#### Scenario: Réponse d'acquisition perdue
- **WHEN** l'acquisition réussit mais sa réponse est perdue
- **THEN** sa répétition identique ne crée pas un second ensemble et expose son état courant

#### Scenario: Transaction divergente
- **WHEN** le même identifiant est réutilisé avec un autre manifeste
- **THEN** CAB refuse sans modifier le premier résultat

### Requirement: Fin durable et effet incertain
Les effets connus, révisions et libérations correspondantes MUST être persistés ensemble. Une fin inconnue MUST conserver les protections jusqu'à réconciliation. Timeout, expiration d'approbation, silence et redémarrage MUST NOT libérer ces protections.

#### Scenario: Crash après écriture
- **WHEN** une écriture a commencé sans preuve durable de fin
- **THEN** la reprise conserve les protections et vérifie les effets sans rejouer la permission

#### Scenario: Échec avec effets
- **WHEN** une commande échoue après avoir modifié une ressource
- **THEN** la libération exige la preuve des effets et l'avancement de sa révision

### Requirement: Formats de coordination compatibles
Les lecteurs MUST vérifier versions de schéma et capacités avant mutation. Une migration MUST conserver demandes consommées, réservations, preuves et reçus. Un format inconnu ou un jeu mixte MUST être refusé sans réparation ni rétrogradation implicite.

#### Scenario: Ancien composant après migration
- **WHEN** un composant ne comprend pas le format de coordination courant
- **THEN** il refuse la mutation sans supprimer l'état ni transmettre une permission

### Requirement: Reçu durable de notification réconciliée
CAB MUST conserver propriétaire, identité intégrale de l'opération et reçu de réconciliation filtré. Le reçu MUST lier transaction, RUN, génération, job, recovery, candidate, demande et empreintes d'autorisation et de preuves. Une répétition identique MUST restituer le reçu sans nouvel effet ; une divergence MUST être refusée. Le verrou rejet seul MUST survivre au redémarrage.

#### Scenario: Réponse perdue
- **WHEN** une transaction de réconciliation est répétée avec le même contenu
- **THEN** son reçu durable reste identique sans suppression de propriétaire ni nouvelle permission

#### Scenario: Panne de persistance
- **WHEN** l'enregistrement durable échoue
- **THEN** aucune validation exploitable ni permission n'est créée et le registre refuse les mutations suivantes

### Requirement: Fermeture du transport MCP
Le broker MUST terminer et libérer son verrou sur fermeture de son entrée MCP, y compris avec une demande en attente. Il MUST conserver le magasin durable et MUST NOT inventer de décision ou purger les approbations pour terminer.

#### Scenario: EOF avec demande en attente
- **WHEN** le transport MCP ferme pendant une attente de validation
- **THEN** le processus termine, le verrou devient réacquérable et la demande reste récupérable sans approbation inventée
