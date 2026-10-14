## MODIFIED Requirements

### Requirement: Verrou de clôture de job corrélé

Le contrôleur SHALL exiger un gate terminal local avant toute clôture normale.
Il SHALL le refuser tant qu'une validation est active ou indécise localement,
qu'une demande broker est en attente ou qu'un état explicite `TERMINÉ` ou
`BLOQUÉ` manque. Un ancien compteur broker nul SHALL NOT remplacer une décision
locale absente. Le gate SHALL rester distinct des décisions et SHALL NOT
approuver une opération OpenCode.

#### Scenario: Clôture prématurée refusée
- **WHEN** une clôture est demandée alors qu'une validation est active ou en attente
- **THEN** le contrôleur la refuse, expose la raison sans secret et conserve le job ouvert

#### Scenario: Validation manuelle avec ancien compteur nul
- **WHEN** une demande manuelle locale reste sans décision et la dernière readiness indique pending_count zéro
- **THEN** le contrôleur refuse le gate et conserve la demande indécise

#### Scenario: Gate terminal valide
- **WHEN** une clôture normale est demandée avec un état terminal explicite et sans validation active ou en attente
- **THEN** le contrôleur confirme le gate terminal et rend son état observable

### Requirement: État terminal observable

Le contrôleur SHALL exposer sur `GET /status` un résumé non sensible du gate
terminal, comprenant son état, sa raison et l'état terminal déclaré. Une
attente, un silence SSE, un rapport intermédiaire ou la fin d'un tour Codex ne
SHALL jamais être interprété comme un état terminal.

#### Scenario: Jalon intermédiaire non terminal
- **WHEN** le contrôleur observe la fin d'un tour Codex sans état terminal déclaré
- **THEN** son statut indique que le gate terminal n'est pas validé
