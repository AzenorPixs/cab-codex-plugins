## MODIFIED Requirements

### Requirement: Refus natif sans effet avant retry
retry MUST vérifier les préconditions techniques et le refus sans consommation de chaque demande enregistrée de la tentative précédente. Il MUST accepter REJECTED direct ou obtenu par poll_approval/get_approval corrélé après timeout MCP, avec décision locale rejected non consommée. Un délai seul, une preuve absente/divergente, approved, une commande ou un autre outil natif MUST refuser retry. Les preuves historiques MUST rester intactes.

#### Scenario: Refus enregistré
- **WHEN** une réponse native REJECTED correspond à une décision locale rejected non consommée
- **THEN** retry MAY réserver un essai neuf dans la même candidate après réconciliation

#### Scenario: Refus obtenu après timeout
- **WHEN** request_validation expire puis poll_approval ou get_approval retourne REJECTED pour la même demande enregistrée, avec identités et opération corrélées et décision locale rejected non consommée
- **THEN** retry accepte cette preuve après vérification des autres préconditions, sans désarmement ni remplacement de candidate

#### Scenario: Polling intermédiaire
- **WHEN** un polling corrélé retourne PENDING avant un REJECTED corrélé
- **THEN** seul le refus terminal prouve la fin sans effet ; PENDING seul ne permet pas retry

#### Scenario: Polling divergent ou absent
- **WHEN** la réponse modifie requestId, approval_id, session_id, directory, change_id, files ou commands, précède sa demande, ou ne confirme aucun refus terminal
- **THEN** retry refuse et conserve le gel et la réservation actuelle

#### Scenario: Refus avant enregistrement
- **WHEN** une erreur native MCP -32602 prouve un rejet de paramètres avant enregistrement, sans validation locale ni effet
- **THEN** retry MAY conserver cette preuve et réserver un essai neuf

#### Scenario: Effet ou décision non prouvé
- **WHEN** la tentative est approuvée, consommée, en attente, seulement interrompue, en erreur générique ou privée de sa décision locale
- **THEN** retry refuse et le gel reste conservé
