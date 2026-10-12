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

## ADDED Requirements

### Requirement: URL du contrôleur compatible entre clients locaux
Le superviseur et le healthcheck SHALL accepter `OC_Codex_CONTROLLER_URL`
comme base HTTP ou comme endpoint `/status`, avec slash final facultatif.
Ils SHALL résoudre `/status` une seule fois ; le superviseur SHALL retrouver
la base pour `/job`. Les valeurs par défaut et les alias `OC_CGPT_` SHALL
rester compatibles, sans nouveau paramètre.

#### Scenario: Base HTTP fournie
- **WHEN** la variable contient la base du contrôleur
- **THEN** les deux clients interrogent son endpoint /status et le superviseur interroge /job

#### Scenario: Endpoint de statut fourni
- **WHEN** la variable contient l'endpoint /status, avec ou sans slash final
- **THEN** aucun client n'ajoute un second /status et le superviseur interroge /job depuis la base

#### Scenario: Alias historique ou valeur par défaut
- **WHEN** l'alias OC_CGPT_CONTROLLER_URL est utilisé ou aucune URL n'est fournie
- **THEN** les clients conservent ces modes de configuration et les mêmes endpoints
