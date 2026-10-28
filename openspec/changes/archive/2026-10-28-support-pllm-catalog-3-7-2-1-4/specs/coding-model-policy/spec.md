## ADDED Requirements

### Requirement: Formats publics PLLM explicitement compatibles
CAB MUST accepter le catalogue schéma 2 avec exactement six politiques et le schéma 3 avec exactement sept politiques. Il MUST refuser les autres couples. Les priorités MUST couvrir une seule fois 1..N et correspondre à modeN. Les gardes de dates, sélection unique Valide évaluée dans la publication, fournisseur, raisonnement et prévol natif MUST être conservées. Le catalogue MUST NOT être réécrit pour adapter son format.

#### Scenario: Catalogue historique 2/6
- **WHEN** un catalogue valide de schéma 2 comporte six politiques
- **THEN** la préparation et la sélection conservent leur comportement compatible

#### Scenario: Catalogue courant 3/7
- **WHEN** un catalogue valide de schéma 3 comporte sept politiques
- **THEN** la préparation réussit et la sélection peut examiner mode7 dans l’ordre publié

#### Scenario: Couple ou structure incohérente
- **WHEN** le schéma est inconnu, le compte ne correspond pas ou les priorités et modes divergent
- **THEN** CAB refuse avec pllm-catalog-invalid avant armement sans transformer le catalogue

#### Scenario: Sélection ou dates non admissibles
- **WHEN** une sélection est historique, ambiguë, invalide ou ses dates sont incohérentes
- **THEN** les refus actuels restent applicables aux deux formats sans modèle inventé
