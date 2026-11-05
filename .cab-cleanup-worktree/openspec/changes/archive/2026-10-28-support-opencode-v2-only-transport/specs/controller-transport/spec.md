## MODIFIED Requirements

### Requirement: Préconditions techniques de récupération
prepare, retry et complete MUST vérifier un job armé avec gate OPEN, mandat courant clôturé, aucune demande indécise, aucun rappel, aucune permission native ni transmission en cours. Via l'API OpenCode V2 authentifiée dans la location `directory`, ils MUST vérifier `/api/info` et sa version majeure 2, le chemin/location, le MCP connecté, les sessions inactives et l'absence de permissions natives. Un contrôle indisponible, non authentifié ou divergent MUST refuser la transition sans route V1 de repli.

#### Scenario: Précondition manquante
- **WHEN** une permission, une session occupée, une demande indécise ou un contexte divergent est observé
- **THEN** la transition est refusée sans transfert ni approbation implicite

#### Scenario: Réconciliation héritée sans preuve V2
- **WHEN** la récupération historique cherche une preuve fondée sur le champ `tools` d'un message utilisateur et que le transcript V2 ne l'expose pas
- **THEN** CAB refuse la réconciliation avec une erreur explicite, conserve le job et n'infère ni autorisation ni exécution native

Les métadonnées V2 arbitraires MUST NOT être interprétées comme le champ V1 `tools`.
