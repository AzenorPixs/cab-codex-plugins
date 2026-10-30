## ADDED Requirements

### Requirement: Diagnostic filtré des refus de décision
Les refus de décision auparavant400 vides MUST retourner HTTP400 JSON avec error, message français fixe et decision_recorded. Le code MUST provenir d’une liste fermée ; une erreur inconnue MUST produire un diagnostic générique. Le corps MUST NOT recopier exception, commande, chemin, ressource, révision ou secret. Les409 et201 existants MUST conserver leur comportement.

#### Scenario: Révision périmée avant approbation
- **WHEN** une décision approved est refusée car une révision a changé depuis la demande
- **THEN** le corps400 indique resource-revision-stale, sans stocker de décision ni transmettre once

#### Scenario: Décision inconnue, invalide ou dupliquée
- **WHEN** le payload est invalide, la validation inconnue ou une décision existe déjà
- **THEN** un code distinct indique le motif et decision_recorded reflète la présence effective de la décision

#### Scenario: Exception imprévue sensible
- **WHEN** le traitement lève une exception non reconnue contenant des données arbitraires
- **THEN** le corps reste générique, borné et sans aucune donnée de cette exception

### Requirement: Conservation des causes sans changement d’autorité
Le contrôle de décision MUST conserver la cause typée d’admission avant et après le contrôle natif asynchrone. Les autres usages booléens MUST garder leur comportement. Un diagnostic MUST NOT autoriser, réessayer ou reconstruire une décision. GETdecision404 et demande indécise MUST rester compatibles lorsqu’aucune décision n’est enregistrée.

#### Scenario: Refus concurrent après contrôle natif
- **WHEN** une transition ou une révision invalide l’opération pendant le contrôle natif
- **THEN** le refus indique son motif sans décision ni effet implicite

#### Scenario: Demande admise non décidée
- **WHEN** le compteur indécis vaut1 et aucune décision n’existe
- **THEN** GETdecision retourne404 et le nouveau diagnostic ne modifie pas cet état
