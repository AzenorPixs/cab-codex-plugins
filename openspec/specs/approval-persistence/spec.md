# approval-persistence Specification

## Purpose
Cette capacité garantit que les états d'approbation et leur historique survivent aux interruptions sans inventer de décision métier.

## Requirements

### Requirement: Persistance durable des approbations
CAB SHALL enregistrer l'état courant des approbations dans un magasin persistant avant de confirmer une transition métier. Le magasin SHALL garantir l'exclusivité d'une instance pour un même espace persistant.

#### Scenario: Reprise d'une demande en attente
- **WHEN** le broker redémarre alors qu'une demande est PENDING
- **THEN** la demande reste récupérable avec le même identifiant et le même état métier

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
CAB SHALL construire un index temporaire des couples `(approval_id, event_type)`
depuis une seule lecture initiale du journal pour les recherches de présence
de la première boucle de réparation après un arrêt non propre. CAB SHALL
préserver les validations d'identifiants, les écritures durables, les contrôles
de cohérence et d'intégrité, les verrous et les règles de reprise existants.
CAB SHALL NOT conserver cet index dans un cache global ou le réutiliser après
cette boucle. Une recherche sans index SHALL conserver son comportement actuel.

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
