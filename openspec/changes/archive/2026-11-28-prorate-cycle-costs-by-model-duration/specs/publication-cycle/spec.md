## MODIFIED Requirements

### Requirement: Coûts des passages calculés en direct

CAB MUST calculer le montant en dollars par rôle et catégorie du passage à partir des tokens natifs déclarés et du tarif catalogue par million du modèle et du fournisseur applicables. CAB MUST stocker les montants par RUN et passage dans `sessions.token_costs`. Le chargement du tableau Cycle et du bloc de coûts de l’étape MUST lire cette projection persistée. Electric MUST signaler toute mise à jour de cette projection via le RUN. Les montants affichés MUST avoir au plus deux décimales.

#### Scenario: Modèles successifs dans un même passage
- **WHEN** CAB observe plusieurs réglages de modèle successifs pour un rôle dans un passage
- **THEN** le premier segment commence au début exact du passage, chaque changement termine le segment précédent et commence le suivant, et le dernier se termine à la fin exacte du passage
- **AND** un modèle qui revient après un autre reste une ligne distincte
- **AND** le tableau Agents conserve les quatre colonnes tarifaires alignées sur les colonnes de coût du tableau Cycle.

#### Scenario: Montant de plusieurs modèles
- **WHEN** des mesures de tokens appartiennent à différents segments
- **THEN** CAB répartit les tokens déclarés pour chaque catégorie au prorata de la durée des segments du rôle, applique le tarif de chaque segment et arrondit seulement la somme avant de l’enregistrer et de la diffuser via Electric
- **AND** une catégorie reste sans montant si des tokens positifs rencontrent un segment de durée positive dont le tarif est indisponible, tandis que zéro token déclaré produit un montant nul.
