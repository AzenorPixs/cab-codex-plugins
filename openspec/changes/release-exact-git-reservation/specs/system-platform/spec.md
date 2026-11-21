## ADDED Requirements

### Requirement: Libération administrative d'une réservation Git précise

CAB MUST permettre à son administrateur système local de libérer une réservation Git active unique, sur autorisation explicite du développeur. L’opération MUST vérifier le projet, le RUN, le SID, la génération, l’index, l’identifiant de réservation, le chemin et la concordance des octets du fichier avec sa version indexée. CAB MUST refuser les effets incertains et vérifier l’empreinte de l’index ainsi que sa référence de conservation sous le verrou Git.

#### Scenario: Libération d'un chemin parmi douze

- **WHEN** l’administrateur soumet la réservation exacte et que l’inspection est toujours valable
- **THEN** CAB libère seulement ce chemin, conserve les onze autres réservations, le fichier et l’index, et enregistre un reçu durable

#### Scenario: Divergence ou effet incertain

- **WHEN** l’identité, l’index ou le fichier diverge, ou qu’un effet est incertain
- **THEN** CAB refuse la libération sans changer les réservations

#### Scenario: Réponse interrompue

- **WHEN** l’administrateur relit l’identifiant d’une libération enregistrée
- **THEN** CAB retourne le même reçu sans nouvelle mutation
