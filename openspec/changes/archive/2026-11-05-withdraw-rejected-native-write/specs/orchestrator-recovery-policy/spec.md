## ADDED Requirements

### Requirement: Retrait natif Write V2 refusé sous permission edit
La projection SHALL exposer les calls write et leurs reçus SDK existants sans dépendre de la présence d’un événement journal. La preuve de retrait SHALL qualifier write V2/path+content fermé sous permission edit, avec cible, digests natif et de part, call/permission et ACK204 exacts, deux frontières stables et gardes de parent existantes. Elle SHALL annuler seulement l’enfant, conserver APPROVED et parent, sans conversion, exécution, nativeResult ou once inventés.

#### Scenario: Write divergent et journal manquant
- **GIVEN** un write error/aborted/executed=false rejeté par le client CAB, SID idle sans permission
- **WHEN** le propriétaire qualifie les preuves du même call/fichier et applique le retrait
- **THEN** le diagnostic montre le call write et le reçu ACK204 même sans événement journal, coverage restant manquante
- **AND** l’enfant devient CANCELLED sans égaliser son input au digest approuvé ni modifier le parent

#### Scenario: Preuve ou portée non qualifiée
- **WHEN** reçu absent/non204, call supplémentaire, schéma/cible/digest ou identité divergent, état natif actif ou parent inadmissible
- **THEN** la récupération est refusée avec protections conservées et aucun input rendu exécutable

#### Scenario: Libération et rejeu
- **WHEN** l’enfant est terminal et la libération ordinaire est admissible
- **THEN** release-access reste une action et un reçu distincts sans token public
- **AND** une réponse perdue se reprend par le même reçu, jamais par nouveau write/reject/once
