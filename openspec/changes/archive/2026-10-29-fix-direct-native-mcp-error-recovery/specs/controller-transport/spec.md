## ADDED Requirements

### Requirement: Retry historique du refus MCP direct sans effet

Le retry du refus access_id vide MAY accepter la provenance native directe qualifiée comme alternative à Code Mode. Il MUST conserver identités et génération exactes, commande /usr/bin/true unique, absence d’enregistrement et d’effet, refus déterministe et lookup natif inconnu corrélé. Une identité de prévol neuve MUST être exigée dans la même candidate. Texte seul, effet inconnu ou permission consommée MUST rester bloquants.

#### Scenario: Refus et lookup directs corrélés
- **WHEN** les deux parties directes sont qualifiées, corrélées et sans effet prouvé
- **THEN** le retry conserve RUN, job et candidate et prépare seulement le prévol neuf

#### Scenario: Preuve insuffisante
- **WHEN** une garde de provenance, identité, refus, lookup, quiescence ou absence d’effet manque
- **THEN** le retry reste refusé sans rejouer once ni altérer l’historique
