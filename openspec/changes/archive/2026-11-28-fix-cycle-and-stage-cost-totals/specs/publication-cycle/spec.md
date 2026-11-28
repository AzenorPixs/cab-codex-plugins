## REMOVED Requirements

### Requirement: Coûts du dernier passage dans le bloc des étapes

**Reason** Le bloc d’étape récapitule toutes ses itérations.
**Migration** Le bloc lit le cumul des coûts persistés par passage.

## ADDED Requirements

### Requirement: Coûts cumulés dans le bloc des étapes

Dans les douze onglets d’étape, le bloc avant Cycle MUST présenter durées, tokens et coûts en trois colonnes équilibrées lorsque la largeur le permet. Une séparation verticale MUST délimiter les groupes de tokens et de coûts. Chaque coût MUST cumuler les passages de l’étape par catégorie et par rôle, selon le même périmètre que les compteurs.

#### Scenario: Plusieurs passages et coûts distincts

- **WHEN** plusieurs passages exécutés ont des montants, y compris des passages annulés après exécution
- **THEN** le bloc additionne ces montants par type de token et par rôle.
- **AND** le tableau Cycle continue d’afficher chaque coût par passage.

#### Scenario: Coût indisponible

- **WHEN** un compteur mesuré a un coût indisponible ou qu'aucun montant n'existe pour la catégorie
- **THEN** le bloc affiche un tiret.
- **AND** une somme connue et nulle est affichée avec quatre décimales.

#### Scenario: Écran étroit

- **WHEN** les trois colonnes ne tiennent plus dans le bloc
- **THEN** elles sont empilées avec une séparation horizontale et restent accessibles.

### Requirement: Périmètre des coûts et compteurs du cycle

CAB MUST limiter les compteurs et les coûts du cycle aux passages exécutés. Les passages Vacante, sautés et non demandés MUST être exclus même s'ils portent des mesures historiques. CAB MUST conserver les mesures natives et masquer uniquement leur projection dans le cycle.

#### Scenario: Mesures historiques sur un passage non exécuté

- **WHEN** une mesure historique se trouve sur un passage non exécuté
- **THEN** elle est exclue des compteurs et des coûts affichés pour le passage, l'étape, le cycle et leurs cumuls.
- **AND** l'absence de coût sur ce passage ne rend aucun des coûts exécutés indisponible.
