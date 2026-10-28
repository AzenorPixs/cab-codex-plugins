## MODIFIED Requirements

### Requirement: Variante native ou historique corrélée
Le prévol MUST corréler session, utilisateur, réponse, modèle, variante et dates. Les variantes parent présentes MUST être cohérentes avec l’assistant. CAB MAY admettre un parent V2 sans modèle ni variante uniquement par une preuve native d’échange unique complet. Une déclaration partielle ou contradictoire MUST être refusée. Les gardes de fournisseur, modèle, date, fin stop et absence d’outil MUST être conservées.

#### Scenario: Prévol natif imbriqué et preuve historique
- **WHEN** la variante parent imbriquée ou historique correspond au choix et aux champs assistant disponibles
- **THEN** CAB peut qualifier la preuve sans modifier les variantes demandées ou les contrats historiques

#### Scenario: Contradiction ou prévol incomplet
- **WHEN** les variantes divergent, manquent ou la réponse est tronquée, en erreur ou contient un outil
- **THEN** CAB refuse la preuve sans permission implicite ni repli spéculatif

#### Scenario: Rejet natif de medium
- **WHEN** une erreur de paramètre reconnue et corrélée prouve l'indisponibilité de medium pour la candidate automatique
- **THEN** CAB examine la politique de priorité suivante et exige son prévol réussi, sans considérer auth, quota ou réseau comme preuve

#### Scenario: Utilisateur natif sans modèle dans un échange unique
- **WHEN** le transcript complet contient un utilisateur précédant un seul assistant dont le modèle et la variante exacts sont observés, sans outil et aux dates admissibles
- **THEN** CAB peut valider le prévol sans ajouter de modèle ou de variante au parent utilisateur

#### Scenario: Fausse provenance ou échange ambigu
- **WHEN** une métadonnée prétend établir la provenance, le transcript est partiel, contient plusieurs échanges ou un parent contradictoire
- **THEN** CAB refuse cette preuve et ne produit aucune autorisation

#### Scenario: Modèle ou variante de session divergent
- **WHEN** la session expose un modèle ou une variante différents du choix vérifié
- **THEN** CAB refuse le prévol malgré une réponse assistant antérieure conforme
