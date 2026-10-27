## MODIFIED Requirements

### Requirement: Exclusion globale exceptionnelle
CAB MUST limiter le gel global à `GLOBAL_RECONCILIATION`, `SHARED_MAINTENANCE`,
`GLOBAL_PAUSE` ou `GLOBAL_STOP`, avec cause, portée et autorité persistées.
Une pause ou un arrêt de RUN MUST rester local sauf cible globale explicite.
Le processus ordinaire `/CAB update` MUST NOT lire ou modifier les états RUN,
permissions ou coordinations globales et MUST NOT demander `SHARED_MAINTENANCE`.
Il arrête directement les trois unités systemd CAB, remplace les fichiers des
quatre briques et redémarre ces unités. Les autres opérations CAB conservent les
contrats de coordination globale définis ici.

#### Scenario: Mise à jour pendant plusieurs RUN
- **WHEN** le développeur demande `/CAB update` alors que plusieurs RUN sont
  réservés
- **THEN** CAB ne lit ni ne modifie la cohorte et n'émet aucune requête de
  suspension ou de coordination globale

#### Scenario: Validation OpenSpec
- **WHEN** un RUN lance `openspec validate --all --strict`
- **THEN** il protège les entrées OpenSpec et n'acquiert aucun gel global

#### Scenario: Arrêt ciblé
- **WHEN** le développeur demande l'arrêt de A
- **THEN** B conserve ses accès et son activité

#### Scenario: Pause globale
- **WHEN** le développeur demande explicitement une pause de tous les RUN
- **THEN** CAB draine puis confirme le gel après vérification des effets et
  permissions

#### Scenario: Transaction globale déjà en cours
- **WHEN** une coordination globale autre que celle de l'update est déjà
  `DRAINING` ou `HELD`
- **THEN** l'update ne remplace ni ne libère cette coordination et ne modifie
  aucun RUN
