## ADDED Requirements

### Requirement: Contrat initial de finalisation autonome
CAB MUST conserver un contrat immutable par RUN : nature, critères, vérifications
cadrées, preuves attendues et décisions réservées. Les clients MUST pouvoir le
déclarer au cadrage. Une adoption explicite unique MAY être admise avant tout
effet/revue/gel ; les RUN anciens ou importés MUST NOT être migrés implicitement.

#### Scenario: Cadrage direct ou piloté
- **WHEN** un contrat couvre les critères avec checks ou preuves attendues
- **THEN** CAB le conserve et pilote sa finalisation sans soumission finale du codeur

### Requirement: Registre de preuves authentifiées agnostique
CAB MUST lier chaque preuve à son producteur authentifié, projet, RUN, change,
révision et artefact applicable. Seuls les exécuteurs CAB ou producteurs autorisés
MUST pouvoir fournir des attestations. Une déclaration de codeur ou un document
libre MUST NOT devenir un reçu de test. Aucun couplage métier DIU n'est REQUIRED.

#### Scenario: Reçu réel et doublon
- **WHEN** un reçu réel identique est observé plusieurs fois
- **THEN** une seule preuve est conservée ; même identité et contenu différent sont refusés

#### Scenario: Usurpation ou portée divergente
- **WHEN** un codeur soumet une preuve de producteur ou cible un autre RUN sans habilitation
- **THEN** CAB refuse sans créer ni modifier de reçu d'exécution

### Requirement: Finalisation mécanique et attentes explicites
CAB MUST assembler et vérifier les preuves au fil des événements et au redémarrage.
Le contrat satisfait MUST conduire à CLOSED11/11, périodes et statistiques finalisées,
sans commande finale du LLM. Les validations réservées MUST rester exigées.
Les preuves manquantes ou périmées MUST apparaître en attente explicite.

#### Scenario: Contrat satisfait sans soumission du LLM
- **WHEN** les checks cadrés sont réussis, les preuves attendues reçues et le change archivé
- **THEN** CAB ferme la période du seul RUN sur snapshot réel et émet un reçu unique de clôture

#### Scenario: Reprise ou protection
- **WHEN** le service redémarre, un effet est UNKNOWN ou une source a changé
- **THEN** CAB reprend ses contrôles sans rejouer de travail ni lever de protection

### Requirement: Preuves adaptées à la nature et à la portée
CAB MUST distinguer développement, livraison, activation et service. Une preuve
commune MAY être référencée par plusieurs RUN si son périmètre est explicitement
vérifié, sans duplication d'exécution ni de statistiques. Une fin de tour LLM
ou une inactivité MUST NOT prouver la fin d'une session.

#### Scenario: Activation sans nouvelle exécution de tests
- **WHEN** un RUN d'activation reçoit les preuves d'installation et disponibilité cadrées
- **THEN** CAB le finalise sans inventer de tests de développement

#### Scenario: Service sans preuve de fin
- **WHEN** aucune attestation terminale du service n'est disponible
- **THEN** sa finalisation reste en attente, sans tâche ou résultat supposé
