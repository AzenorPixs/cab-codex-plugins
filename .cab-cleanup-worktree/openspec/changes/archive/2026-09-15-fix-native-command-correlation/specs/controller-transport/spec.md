## ADDED Requirements

### Requirement: Corrélation sûre des commandes Bash instrumentées
Le contrôleur SHALL corréler une permission Bash à la commande approuvée
lorsque OpenCode y ajoute exclusivement une instrumentation de sortie
déterministe connue. Il SHALL vérifier que la commande métier approuvée reste
inchangée et SHALL refuser toute transformation qui ajoute, retire ou modifie
une opération métier. Une permission corrélée SHALL rester consommable une
seule fois.

#### Scenario: Commande exacte
- **WHEN** OpenCode demande une permission Bash dont la commande est identique
  à celle du mandat approuvé
- **THEN** le contrôleur la corrèle à ce mandat et peut transmettre une unique
  réponse `once` après une décision `approved`

#### Scenario: Instrumentation de sortie admise
- **WHEN** OpenCode ajoute uniquement l'instrumentation de sortie déterministe
  reconnue à la fin de la commande approuvée
- **THEN** le contrôleur corrèle la permission à la commande métier approuvée
  sans élargir la portée du mandat

#### Scenario: Transformation métier refusée
- **WHEN** la commande de permission diffère de la commande approuvée autrement
  que par l'instrumentation de sortie reconnue
- **THEN** le contrôleur ne la corrèle pas et ne transmet aucune réponse de
  permission
