## ADDED Requirements

### Requirement: Documentation exacte du digest natif write

Le protocole MUST documenter le schéma natif write et le calcul de `tool_input_sha256` par le calculateur distribué, y compris la sérialisation JavaScript compacte et l’absence de normalisation du contenu. Un vecteur synthétique MUST permettre de vérifier le résultat sans exposer de données projet.

#### Scenario: Argument write avec retour à la ligne et Unicode
- **WHEN** le propriétaire calcule le digest à partir de l’objet natif complet
- **THEN** le résultat correspond au calculateur distribué et distingue les octets de contenu modifiés

#### Scenario: Digest historique divergent
- **WHEN** l’objet source de ce digest n’est pas prouvé
- **THEN** le protocole ne déduit pas sa cause et ne l’utilise pas comme autorisation
