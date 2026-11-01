## ADDED Requirements

### Requirement: Corrélation d'un appel CodeMode brut terminé

Le contrôleur MUST corréler une notification si le transcript natif contient
un wrapper `execute` V2 non exécuté, terminé, complet et non tronqué, dont le
dernier appel natif unique est `cgpt-validation.request_validation` terminé
avec une identité intégralement identique à la notification. Un unique appel
`search` terminé peut le précéder. Cette corrélation MUST NOT créer ou modifier
une décision, une permission ou un `once`.

#### Scenario: Appel natif terminé et identique

- **WHEN** les métadonnées natives complètes du wrapper brut attestent l'unique appel `request_validation` terminé avec les arguments exacts
- **THEN** le contrôleur corrèle la notification et conserve le flux normal de décision CAB


#### Scenario: Preuve brute terminée incomplète ou divergente

- **WHEN** le wrapper est exécuté, tronqué, comporte un autre appel, un appel répété ou une identité différente
- **THEN** le contrôleur refuse `native-validation-not-correlated` sans décision ni permission
