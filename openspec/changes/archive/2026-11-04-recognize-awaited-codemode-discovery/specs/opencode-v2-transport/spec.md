## ADDED Requirements

### Requirement: Préambule search attendu avant validation littérale
Le client MUST reconnaître await optionnel dans le binding const de search
qualifié précédant un retour MCP direct et littéral. Une validation running
MAY être projetée avant les metadata finales, selon les gardes existantes.
Les entrées observées complètes MUST rester strictement concordantes ; aucun
code supplémentaire, appel dynamique ou effet natif ne MUST être accepté.

#### Scenario: Validation bloquante après search attendu
- **WHEN** un wrapper running emploie const schema = await search avec arguments littéraux puis retourne request_validation littéral
- **THEN** son identité est corrélable sans attendre le timeout du call MCP ni un poll de rattrapage

#### Scenario: Metadata divergente ou suffixe supplémentaire
- **WHEN** l’entrée native diffère, est tronquée ou le wrapper ajoute une instruction non qualifiée
- **THEN** le wrapper reste opaque et aucune permission ou identité ne peut être inventée
