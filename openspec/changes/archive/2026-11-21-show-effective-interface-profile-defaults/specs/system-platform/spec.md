## ADDED Requirements

### Requirement: Affichage des références effectives par résolution

Les réglages d’interface MUST présenter les valeurs de référence du profil
sélectionné et indiquer celles calculées automatiquement. Le rendu 4K MUST
rester la référence. Les réglages enregistrés MUST garder leur priorité.

#### Scenario: Valeur de référence responsive
- **WHEN** un administrateur consulte une résolution sans personnalisation
- **THEN** le formulaire affiche la valeur fixe appliquée ou indique un calcul automatique
- **AND** le navigateur conserve le rendu existant sans persister une valeur du catalogue.
