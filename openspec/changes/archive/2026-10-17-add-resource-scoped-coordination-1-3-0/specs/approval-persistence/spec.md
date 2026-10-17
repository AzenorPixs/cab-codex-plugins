# Persistance de coordination — delta 1.3.0

## MODIFIED Requirements

### Requirement: Persistance partagée des RUN concurrents
Démarrer ou clore un RUN MUST conserver magasin, journal, décisions et protections des pairs. La purge MUST refuser toute réservation, acquisition active ou état invalide. Les identités de demandes et opérations admises MUST survivre au crash sans rejeu de permission.

#### Scenario: Isolation concurrente
- **WHEN** un deuxième RUN rejoint le broker
- **THEN** les preuves et protections existantes restent intactes

## ADDED Requirements

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

