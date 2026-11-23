## MODIFIED Requirements

### Requirement: Admission explicite d'un fichier préexistant
CAB MUST permettre une admission ciblée des fichiers réguliers préexistants explicitement autorisés dans un RUN natif. Le propriétaire décide en direct et l’orchestrateur désigné décide en piloté. Un CAS et un reçu idempotent MUST lier contexte et empreintes observés. Baseline, fichiers, index et preuves MUST rester inchangés. La réservation native MUST revérifier le contexte du chemin et tracer l'autorisation.

#### Scenario: Inspection administrative sans contenu
- **WHEN** l’autorité du RUN inspecte des chemins littéraux cadrés
- **THEN** CAB restitue identité du RUN/SID, cadrage, révision, baseline, HEAD, index, statuts et empreintes des fichiers, sans leur contenu ni modification

#### Scenario: DEVOPS.md préexistant explicitement autorisé
- **WHEN** l’autorité du RUN autorise l'état exact de DEVOPS.md dans le mandat après inspection
- **THEN** le codeur peut le réserver dans le même RUN/SID et la baseline initiale reste inchangée

#### Scenario: Source ou contexte modifiés
- **WHEN** le fichier, HEAD, l'index, le cadrage ou la baseline ne correspond plus à l'état autorisé
- **THEN** la prise en charge est refusée, sans adoption implicite ou restauration d'une ancienne autorisation

#### Scenario: Frontière protégée ou donnée étrangère
- **WHEN** un effet est indécis, un bail détenu, un fichier réservé, un gel/import/revue/clôture applicable, un lien ou un contenu déjà modifié dans l'index partagé
- **THEN** l'admission est refusée et les états et données restent protégés

#### Scenario: Répétition administrative
- **WHEN** une demande identique est répétée ou une autre entrée réutilise son request_id
- **THEN** CAB retourne le même reçu dans le premier cas et refuse le conflit dans le second

#### Scenario: Autorité d'écriture en session pilotée
- **WHEN** le codeur piloté veut inclure un fichier préexistant
- **THEN** l’orchestrateur désigné doit approuver son état exact avant réservation
