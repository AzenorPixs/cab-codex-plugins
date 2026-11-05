## ADDED Requirements

### Requirement: Réconciliation terminale depuis le journal durable de session

Après redémarrage, CAB MUST lire le journal natif durable de la session exacte
en mode fini et MUST exiger `log.synced` comme watermark avant de prendre en
compte ses événements. CAB MUST corréler les événements terminaux au même
sessionID, callID, operationId, requestId, approvalId et empreintes durables.
Le journal MUST NOT être utilisé pour inférer un événement `permission.replied`
qu’il ne contient pas.

#### Scenario: Fin d’outil native réussie

- **WHEN** une unique entrée `session.tool.success` correspond au callID et au
  mandat approuvés avant le watermark vérifié
- **THEN** CAB persiste la fin `COMPLETED` et le résultat lié à l’opération
- **AND** il ne répond pas à la permission et ne rejoue pas `once`

#### Scenario: Erreur native ambiguë

- **WHEN** une entrée `session.tool.failed` existe mais son erreur ne prouve pas
  un refus avant effet
- **THEN** CAB conserve `UNKNOWN` et l’accès protégé

#### Scenario: Erreur native reconnue sans effet

- **WHEN** une entrée terminale prouve un refus avant exécution pour le même
  callID et toutes les révisions écrites restent inchangées
- **THEN** CAB peut enregistrer `NO_EFFECT` sans émettre de permission

#### Scenario: Absence d’événement avant watermark

- **WHEN** le journal atteint `log.synced` sans événement terminal pour le
  callID, ou si le watermark manque
- **THEN** CAB conserve `UNKNOWN` et ne déduit pas `NO_EFFECT`

### Requirement: Inconnu terminal protégé après restauration

Si une décision native `APPROVED` et un tool part exact sont terminés mais
qu’aucune fin durable exploitable n’est retrouvée, CAB MUST restaurer la
décision exacte, marquer l’opération `UNKNOWN` et protéger ses ressources
d’origine. L’absence de permission pendante ou `executed=false` MUST NOT
débloquer une écriture ni autoriser un nouvel envoi.

#### Scenario: Permission absente et outil terminé non classifié

- **WHEN** l’approbation exacte est terminée, la permission a disparu et le
  résultat du tool part est non structuré
- **THEN** CAB conserve l’opération et son accès en `UNKNOWN`
- **AND** il n’envoie aucun `once` et ne crée aucune nouvelle demande
