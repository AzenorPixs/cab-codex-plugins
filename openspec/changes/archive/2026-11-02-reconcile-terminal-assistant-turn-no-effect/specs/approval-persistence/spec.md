## ADDED Requirements

### Requirement: NO_EFFECT depuis un tour assistant terminal sans appel natif d’effet

Après restauration, CAB MAY clôturer `NO_EFFECT` une opération approuvée sans
callID natif uniquement si le contrat de preuve distinct ci-dessous est
satisfait. Il MUST invalider l’accord local avant la libération. Toute garde
absente ou divergente conserve `UNKNOWN`. Cette voie locale exacte MAY
s’exécuter même si la readiness globale du broker n’est pas `READY`; les autres
récupérations restent fermées.

#### Scenario: Tour complet sans permission ni appel d’effet

- **WHEN** une demande `request_validation` exacte figure dans un wrapper Code Mode achevé, non tronqué et `executed=false`, suivie dans le même tour utilisateur d’un assistant `finish=stop`; deux lectures complètes du transcript et du journal V2 `log.synced` sont identiques; la session est idle, sans permission pendante, appel shell/édition ni événement natif d’effet dans le tour; l’opération n’a aucun permissionId, callID, état natif ou `once`, son accès UNKNOWN ne contient qu’elle, aucune opération sœur n’est active sur la session et les révisions sont inchangées
- **THEN** CAB invalide l’accord local, clôture `NO_EFFECT`, libère l’accès sans modifier les révisions et n’émet ni permission ni `once`

#### Scenario: Frontière ambiguë ou effet natif présent

- **WHEN** le wrapper/transcript est incomplet, le tour n’est pas terminal, une permission/callID/événement d’effet existe, une opération sœur est active ou les révisions diffèrent
- **THEN** CAB conserve l’opération et l’accès `UNKNOWN` sans nouvel envoi

#### Scenario: Broker global bloqué par un autre RUN

- **WHEN** la preuve terminale locale est complète et stable tandis que la readiness globale reste bloquée pour une cause étrangère à cette opération
- **THEN** CAB invalide puis clôt uniquement cette opération `NO_EFFECT` sans changer la readiness, l’autre RUN ou ses accès

#### Scenario: Opération sœur active sur la session

- **WHEN** une autre opération du RUN et de la session reste active ou indécise
- **THEN** CAB conserve l’opération courante et son accès `UNKNOWN`

#### Scenario: Aucun événement ne prouve une réponse de permission

- **WHEN** le journal ne contient aucun événement `permission.replied` mais qu’une autre garde de preuve manque
- **THEN** CAB conserve `UNKNOWN` sans déduire que la permission a été consommée ou refusée

