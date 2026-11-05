## ADDED Requirements

### Requirement: Assertion littérale du chemin de discovery
Le client MAY qualifier après search une unique assertion comparant
variable.items[0].path par !== à un chemin littéral, suivie de throw new
Error avec message littéral. Le chemin MUST être celui du retour MCP exact
qui suit ; variable et suffixe MUST rester liés à la grammaire qualifiée.
Toute autre logique MUST conserver le wrapper opaque.

#### Scenario: Signature vérifiée avant requête bloquante
- **WHEN** un wrapper running vérifie le chemin fixe request_validation sur sa discovery puis retourne ce call avec arguments littéraux
- **THEN** son identité peut être projetée sans attendre la metadata finale, sans décision ni permission implicite

#### Scenario: Assertion étrangère, dynamique ou code supplémentaire
- **WHEN** la variable, l’index, le chemin, Error ou le suffixe diffère de la forme qualifiée
- **THEN** le wrapper reste opaque et aucune preuve ou autorisation n’est inventée
