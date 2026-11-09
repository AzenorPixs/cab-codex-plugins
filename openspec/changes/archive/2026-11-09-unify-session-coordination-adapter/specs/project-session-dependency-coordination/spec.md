## ADDED Requirements

### Requirement: Découverte de l'adaptateur commun
CAB SHALL exposer `cab-session-coordination-1` et ses opérations par une action de découverte sans création de magasin ni démarrage de service. La réponse SHALL distinguer disponibilité de la boîte et admission native par tentative. Les clients SHALL vérifier le contrat plutôt qu'une seule version de paquet.

#### Scenario: Découverte avant inscription
- **WHEN** un client demande les capacités sans identité ni magasin
- **THEN** il reçoit le contrat, les modes et opérations sans écriture de runtime

### Requirement: Propriétaire unique et frontières communes
En direct, l'agent SHALL posséder sa boîte ; en pilotage, l'orchestrateur SHALL la posséder. Le codeur ACSP SHALL transmettre ses dépendances et preuves au parent sans publication concurrente. Entrée, reprise, déclaration, validation, consultation et clôture SHALL utiliser les mêmes identités et garanties. La politique SCMP SHALL conserver les obligations SCM.

#### Scenario: Résultat du codeur piloté
- **WHEN** un codeur ACSP rapporte une preuve validable
- **THEN** son parent la valide puis publie l'avis sous sa propre identité sans double publication

#### Scenario: Client direct et client piloté
- **WHEN** une dépendance précise reçoit un avis dans l'un des deux modes
- **THEN** le destinataire peut consulter, revalider puis acquitter sans changer sa pause ni une permission
