# Spec Delta

## ADDED Requirements

### Requirement: Verrou de clôture de job corrélé
Le contrôleur SHALL exiger un gate terminal local avant de confirmer la
clôture normale d'un job CAB. Le gate SHALL être refusé tant qu'une validation
est active ou en attente, ou tant qu'un état terminal explicite `TERMINÉ` ou
`BLOQUÉ` n'est pas fourni. Il SHALL rester distinct de toute décision de
mandat et ne SHALL jamais approuver une opération OpenCode.

#### Scenario: Clôture prématurée refusée
- **WHEN** une clôture est demandée alors qu'une validation est active ou en attente
- **THEN** le contrôleur la refuse, expose la raison sans secret et conserve le job ouvert

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
