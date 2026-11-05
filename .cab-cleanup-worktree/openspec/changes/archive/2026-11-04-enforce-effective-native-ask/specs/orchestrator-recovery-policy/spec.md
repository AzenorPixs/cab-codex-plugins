## MODIFIED Requirements

### Requirement: Clôturer la coordination d’un terminal de lecture revu sans inventer once
Le système SHALL clôturer une coordination PREPARED approved sans native/once après revue READ_ONLY explicite, commande et terminal uniques, deux observations stables et policy propriétaire. Les sources épinglées ou la commande inline intégralement revue SHALL être liées. Un parent simplement référencé MAY rester HELD s’il est compatible et strictement inchangé, sans liaison effective. L’issue permission non vérifiée SHALL rester explicite, sans nativeResult/ACK/NO_EFFECT inventé.

#### Scenario: Terminal exact et sources relues
- **GIVEN** une policy reconcile-reviewed-terminal, un shell completed non tronqué, exit entier et revue propriétaire concordante
- **WHEN** la frontière et les sources sont stables
- **THEN** seule la coordination devient COMPLETED et sa réponse exécutable est invalidée, sans rejeu natif

#### Scenario: Code inline revu
- **GIVEN** une commande inline entièrement examinée READ_ONLY et inlineCommand true
- **WHEN** le SHA commande, le call et le digest de part natifs concordent
- **THEN** la liste de sources fichiers peut être vide, sans dispense de revue de tout code ou dépendance exécuté

#### Scenario: Parent référencé sans rattachement
- **GIVEN** un parent unique HELD du même RUN/contexte/version couvrant l’enfant courant mais ne le contenant pas
- **WHEN** la revue terminale est qualifiée et le parent stable
- **THEN** l’enfant devient COMPLETED sans ajout aux operationIds ni modification du parent, des révisions ou des baux

#### Scenario: Preuve ou parent non admissible
- **WHEN** une once/native existe, l’enfant est effectivement attaché, le parent est étranger/non HELD/hors portée/modifié, ou un effet, doublon, source ou digest diverge
- **THEN** les protections restent intactes et aucun résultat historique n’est fabriqué
