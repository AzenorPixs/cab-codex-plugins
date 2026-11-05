## ADDED Requirements

### Requirement: Entrée modèle sans variante native implicite
createSession, createProbeSession, prompt et switchModel MUST refuser tout champ propre model.variant avec opencode-model-variant-unsupported et un message français fixe demandant model.reasoning, avant tout appel HTTP. La présence simultanée de reasoning MUST NOT rendre variant valide. Les lectures MUST conserver leur variante native ; un appelant MUST convertir explicitement la forme lue avant écriture. Le niveau omis intentionnellement MUST rester compatible.

#### Scenario: Modèle relu réinjecté sans conversion
- **WHEN** un appel fournit providerID, modelID et variant, seul ou accompagné de reasoning, même nul ou indéfini
- **THEN** le client refuse avant réseau sans créer de session, changer de modèle, transmettre un prompt ou recopier les valeurs du modèle dans l’erreur

#### Scenario: Conversion explicite vers reasoning
- **WHEN** l’appelant prépare providerID, modelID et reasoning à partir de la variante native relue
- **THEN** le client transmet cette valeur comme variante native et conserve le format de lecture existant

#### Scenario: Niveau volontairement absent
- **WHEN** un modèle valide ne fournit ni reasoning ni variant
- **THEN** le client conserve l’omission du niveau dans la requête sans imposer un nouveau défaut
