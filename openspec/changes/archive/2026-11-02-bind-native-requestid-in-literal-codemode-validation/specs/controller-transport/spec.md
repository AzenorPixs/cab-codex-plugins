## MODIFIED Requirements

### Requirement: Normalisation bornée des littéraux request_validation Code Mode

Le client MAY normaliser un wrapper terminal direct `request_validation` lorsque son objet contient des données littérales, y compris des templates sans interpolation. Il MAY aussi accepter une unique déclaration `const` à string littérale en tête, utilisée une fois comme seul élément de `commands`. Dans ce mode littéral, une unique recherche `search` terminée peut précéder l’appel. Pour un wrapper à `requestId` variable, le seul identifiant JavaScript nu autorisé est dans le champ racine `requestId`, lié à la valeur chaîne du `toolCalls` natif unique `request_validation`, sans autre call. Le client MUST vérifier le wrapper non exécuté, complet et non tronqué, l’input natif complet et l’égalité structurelle de l’objet reconstruit. Il MUST conserver l’ordre des tableaux et MUST refuser toute autre valeur dynamique, expression, statement ou tool additionnel, troncature ou divergence.

#### Scenario: Template littérale exacte

- **WHEN** le wrapper terminal contient une template sans interpolation dans l'unique entrée `commands`
- **AND** le tool call natif unique est complet et porte le même objet
- **THEN** CAB normalise et corrèle `request_validation`

#### Scenario: Constante string strictement bornée

- **WHEN** une unique constante string littérale en tête est référencée une seule fois comme unique élément de `commands`
- **AND** aucune autre instruction ou tool n'apparait et les métadonnées correspondent
- **THEN** CAB normalise et corrèle `request_validation`

#### Scenario: requestId lié au call natif exact

- **WHEN** le wrapper contient un appel direct unique et non exécuté à `request_validation`, son objet contient uniquement des données littérales sauf un identifiant nu au champ `requestId`, et le call natif complet fournit la même valeur chaîne ainsi que les autres arguments exacts
- **THEN** CAB projette l’appel natif avec son input résolu et l’empreinte de l’enveloppe
- **AND** cette projection n’ajoute ni décision ni permission

#### Scenario: variable hors requestId ou valeur divergente

- **WHEN** une autre propriété utilise une variable, le `requestId` natif ne correspond pas ou l’objet reconstruit diverge d’un champ natif
- **THEN** le wrapper reste `execute` et aucune notification n’est admise

#### Scenario: Expression ou tool additionnel

- **WHEN** le wrapper contient une interpolation, une valeur dynamique hors `requestId`, un statement supplémentaire ou des métadonnées divergentes
- **THEN** il reste `execute` non admis et CAB ne notifie aucune validation

### Requirement: Corrélation d'un appel CodeMode brut terminé

Le contrôleur MUST corréler une notification si le transcript natif contient un wrapper `execute` V2 non exécuté, terminé, complet et non tronqué, dont le dernier appel natif unique est `cgpt-validation.request_validation` terminé avec une identité complète identique à la notification. Il MUST comparer l’identité comme des données structurées : l’ordre des clés d’objets n’a pas de portée, tandis que les valeurs, la structure et l’ordre des tableaux MUST rester exacts. Un unique appel `search` terminé peut le précéder. Cette corrélation MUST NOT créer ou modifier une décision, permission ou `once`. Les digests persistés et les décisions MUST conserver leur format actuel.

#### Scenario: Appel natif terminé et identique

- **WHEN** les métadonnées natives complètes attestent l’unique appel `request_validation` terminé avec les arguments exacts
- **THEN** le contrôleur corrèle la notification et conserve le flux normal de décision CAB

#### Scenario: Objets équivalents avec clés réordonnées

- **WHEN** le call natif et la notification contiennent les mêmes champs d’identité et valeurs, avec des clés d’objets imbriqués insérées dans un ordre différent
- **THEN** le contrôleur les corrèle sans élargir les ressources ou les révisions

#### Scenario: Preuve brute terminée incomplète ou divergente

- **WHEN** le wrapper est exécuté, tronqué, comporte un autre appel, un appel répété, une valeur différente, un ordre de tableau divergent ou une identité incomplète
- **THEN** le contrôleur refuse `native-validation-not-correlated` sans décision ni permission
