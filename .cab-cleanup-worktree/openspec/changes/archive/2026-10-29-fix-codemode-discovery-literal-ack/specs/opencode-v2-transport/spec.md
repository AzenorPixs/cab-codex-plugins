## ADDED Requirements

### Requirement: Découverte Code Mode à acquittement littéral non autorisant

CAB MAY reconnaître un unique search à objet de données littérales suivi du retour d'une chaîne littérale. Il MUST vérifier la liste native exacte, les arguments concordants, la fin et l'absence de troncature. La projection MUST rester diagnostique, avec empreinte de l'enveloppe. Son texte MUST NOT établir une décision, un état métier ou une autorisation. Tout appel ajouté ou toute expression inconnue MUST rester bloquant.

#### Scenario: Acquittement fixe après découverte

- **WHEN** le programme appelle seulement search sur un objet littéral puis retourne une chaîne fixe avec métadonnées natives concordantes
- **THEN** CAB conserve un diagnostic de découverte sans autorité, quel que soit le texte de cette chaîne

#### Scenario: Expression ou effet supplémentaire

- **WHEN** le programme ajoute un appel, retourne une variable ou diverge des métadonnées natives
- **THEN** CAB refuse la projection sans attribuer de droit au résultat
