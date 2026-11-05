## ADDED Requirements

### Requirement: Vérifier le reçu de reprise avant CABU

L’updater MAY reprendre seulement le reçu exact `ROLLBACK_FAILED` causé par `update-controller-start-unconfirmed`, avec un paquet GitHub publié au moins aussi récent et un manifeste cohérent. Il MUST vérifier l’identité OpenCode et l’empreinte `beforeHash` ou `afterHash` de chaque destination. Sous `cab-source`, les fichiers broker MAY aussi correspondre exactement au paquet courant publié. Toute autre divergence est refusée.

#### Scenario: Reprendre en avant le reçu exact après rollback incomplet

- **GIVEN** un reçu `ROLLBACK_FAILED` avec cause contrôleur vérifiée et artefacts connus
- **WHEN** une source GitHub au moins aussi récente et cohérente demande la reprise de cet identifiant exact
- **THEN** le reçu est admis pour une reprise liée, sans arrêter OpenCode ni lire ou modifier les RUN

#### Scenario: Reçu ou artefact divergent

- **GIVEN** un autre état de reçu, une version antérieure, une identité OpenCode modifiée ou une destination hors de ses deux empreintes
- **WHEN** la reprise avant est demandée
- **THEN** l’updater refuse sans écriture ni nouvel arrêt de service

#### Scenario: Source broker locale déjà publiée

- **GIVEN** `brokerPolicy=cab-source` et les trois fichiers broker identiques au paquet GitHub courant
- **WHEN** le reçu d’échec est repris
- **THEN** ces fichiers sont admis comme déjà avancés et revérifiés pendant le nouveau déploiement

#### Scenario: Broker déjà déconnecté par la reprise précédente

- **GIVEN** `brokerState=disabled` et un reçu enfant lié à un reçu parent `SUPERSEDED` avec déconnexion native confirmée et identité OpenCode identique
- **WHEN** le reçu enfant exact est repris en avant
- **THEN** l’updater accepte la transition terminale du parent sans reload global

### Requirement: Préserver les preuves pendant une reprise avant

L’updater MUST conserver l’ancien reçu et ses sauvegardes, puis lier le nouveau reçu au précédent par `recoveryOf`. Il MUST NOT effacer les preuves, fermer OpenCode, recharger ses locations, ni activer une source locale.

#### Scenario: Reçu d’échec conservé

- **WHEN** une reprise en avant est préparée après le contrôle des empreintes
- **THEN** le reçu `ROLLBACK_FAILED` reste archivé `SUPERSEDED` avec sa cause et ses sauvegardes
- **AND** le nouveau reçu est lié à son identifiant exact

#### Scenario: MCP incertain

- **GIVEN** un état MCP `pending`, `failed` ou `needs_auth`, ou une identité OpenCode modifiée
- **WHEN** une reprise en avant est demandée
- **THEN** aucun rechargement global ni changement de reçu n’est effectué
