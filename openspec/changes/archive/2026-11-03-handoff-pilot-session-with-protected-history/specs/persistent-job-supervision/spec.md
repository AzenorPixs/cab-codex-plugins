## ADDED Requirements

### Requirement: Transfert du pilotage avec historique protégé
Le contrôleur MUST offrir une API distincte pour changer le SID courant dans
le même RUN, après décision du propriétaire liée au checkpoint et à deux
frontières natives stables. Les identités métier et les protections historiques
MUST être conservées. Les anciennes autorisations MUST rester non exécutables.
La candidate MUST prouver une readiness CodeMode courante, sans effet métier,
sous ask et avec le même contrat modèle.

#### Scenario: Ancien effet protégé et continuation disjointe
- **GIVEN** un ancien once acquitté avec accès conservé
- **WHEN** le propriétaire change de session à une frontière qualifiée
- **THEN** les ressources historiques restent protégées et les nouveaux mandats disjoints suivent toutes les décisions et permissions ordinaires

#### Scenario: Ancienne approbation ou ressource recouvrante
- **WHEN** une ancienne approbation est présentée dans la candidate ou un nouveau mandat recouvre une protection historique
- **THEN** aucune permission ancienne n'est transférée et le verrouillage ordinaire interdit l'effet recouvrant

### Requirement: Journal durable et reprise sans effet du transfert
Le contrôleur MUST persister l'intention avant la bascule et conserver un
reçu idempotent lié au checkpoint. Une reprise après COMMITTED MUST achever
uniquement les métadonnées attestées, avant toute admission. Une divergence
MUST geler le seul RUN concerné. Les événements historiques MUST rester
observables sans rendre leur session admissible. Aucun rollback, once,
NO_EFFECT ou libération de ressources ne MUST être inventé.

#### Scenario: Réponse perdue ou redémarrage après commit
- **WHEN** la réponse est perdue ou le contrôleur redémarre entre registre et checkpoint
- **THEN** le même identifiant retrouve le reçu et termine la même transition sans permission native ni nouvelle identité

#### Scenario: Permission, call ou checkpoint divergent
- **WHEN** une permission persiste, un nouveau call est actif ou les empreintes changent
- **THEN** la transition n'est pas engagée et les identités et protections restent intactes

#### Scenario: Frontière native occupée ou non qualifiée
- **GIVEN** une session non idle, une permission, un nouveau call actif, une intention sans ACK, une candidate sans ask ou une readiness étrangère
- **WHEN** le transfert est demandé
- **THEN** aucune identité ni autorisation ne change
