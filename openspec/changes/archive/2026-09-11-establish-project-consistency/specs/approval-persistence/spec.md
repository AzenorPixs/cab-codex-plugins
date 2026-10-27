## Purpose

Cette capacité garantit que les états d'approbation et leur historique survivent aux interruptions sans inventer de décision métier.

## ADDED Requirements

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
