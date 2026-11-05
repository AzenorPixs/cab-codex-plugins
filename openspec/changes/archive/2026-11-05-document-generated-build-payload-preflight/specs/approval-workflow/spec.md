## ADDED Requirements

### Requirement: Documentation de prévalidation des payloads générés
Le contrat MUST faire vérifier les octets finaux rendus pour chaque langage
embarqué, sans exécuter les helpers ni charger de secrets. Une syntaxe valide
de l’enveloppe MUST NOT qualifier la syntaxe interne ou le sens des constantes
échappées. La couverture des helpers MUST être explicite avant staging.

#### Scenario: Helper Python invalide dans une enveloppe Bash valide
- **WHEN** bash -n réussit mais le helper Python rendu contient un littéral cassé
- **THEN** le propriétaire corrige le générateur et analyse le helper exact sans lancer de build

### Requirement: Documentation de rapports structurés et effets distingués
Le contrat MUST orienter la sérialisation vers le producteur et conserver un
parseur JSON strict. Un rapport local échoué MUST être distingué des effets
réels du build. Une réutilisation MUST vérifier l’artefact existant sous les
accès appropriés ; elle MUST NOT être remplacée par un rebuild implicite.

#### Scenario: Artefact construit et rapport JSON invalide
- **WHEN** le build est observé mais un champ tabulé non échappé fait échouer le rapport
- **THEN** le propriétaire conserve l’exit global échoué, sérialise correctement, réconcilie et réobserve l’artefact avant la première recette non prouvée
