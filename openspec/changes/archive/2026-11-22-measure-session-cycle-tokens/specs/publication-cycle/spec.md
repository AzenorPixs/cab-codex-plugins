## ADDED Requirements

### Requirement: Tokens observés du cycle de session

CAB MUST conserver dans une table PostgreSQL les comptes entiers de tokens entrants, sortants et lus depuis le cache, associés au projet, au change, à la session et au RUN. Il MUST distinguer le codeur et l’orchestrateur et conserver une mesure native une seule fois.

#### Scenario: Cumul par rôle

- **WHEN** une mesure native est attribuable à une action d’une étape du cycle
- **THEN** elle contribue au cumul de cette action, de son étape, de l’itération, de la session et du change, sous le même rôle
- **AND** la répétition de la collecte ne modifie pas les cumuls

#### Scenario: Mesure absente ou attribution partielle

- **WHEN** le compteur natif manque ou son attribution à une action est ambiguë
- **THEN** CAB laisse le compteur indisponible à la granularité non mesurée et conserve la contribution aux niveaux attestés

#### Scenario: Actualisation des compteurs

- **WHEN** une mesure observée est persistée
- **THEN** les tableaux concernés et Résumé se mettent à jour via Electric
- **AND** Résumé expose la durée et le triplet de tokens du dernier cycle et le cumul de tous les cycles
- **AND** les tableaux utilisent Te, Ts, Tc et ajoutent le triplet de l’orchestrateur en mode piloté
- **AND** la présentation emploie K, M ou B selon le seuil et au plus deux décimales

### Requirement: Ajout tracé de mandats à un RUN actif

L’autorité du RUN MUST pouvoir ajouter des mandats explicitement autorisés par le développeur pendant une session active et avant le gel. CAB MUST conserver le cadrage et les validations antérieures, puis journaliser l’ajout, l’autorité et la référence de l’autorisation sur l’étape courante. Les opérations autorisées restent soumises à leurs contrôles propres.

#### Scenario: Ajout après l’initialisation

- **WHEN** le propriétaire direct ou l’orchestrateur désigné ajoute un mandat autorisé à un RUN éligible
- **THEN** le catalogue expose la liste effective et l’étape courante affiche les ajouts
- **AND** une répétition de la même demande restitue le même reçu

#### Scenario: Autorité insuffisante ou CABU

- **WHEN** un autre acteur demande un ajout ou tente d’intégrer CABU au cycle
- **THEN** CAB refuse la demande sans modifier la liste
