## ADDED Requirements

### Requirement: Détail de la dernière construction d’artefact

La Fabrique MUST présenter par format Debian et Docker la construction la plus récente documentée par un reçu manuel ou une étape native CICD ou CICDF. Son détail MUST indiquer son origine, son état et sa version lorsqu’ils sont connus.

#### Scenario: Construction native après un échec manuel

- **WHEN** une étape native de construction a réussi après un échec manuel du même format
- **THEN** la Fabrique affiche et permet d’ouvrir le reçu de la réussite native

#### Scenario: Échec plus récent ou demande manuelle active

- **WHEN** une tentative plus récente échoue ou qu’une demande manuelle reste active ou indéterminée
- **THEN** la Fabrique affiche cette tentative et conserve ses diagnostics disponibles

#### Scenario: Livraison sans construction commencée

- **WHEN** l’étape native reste en attente
- **THEN** cette étape ne remplace pas un résultat de construction déjà observé
