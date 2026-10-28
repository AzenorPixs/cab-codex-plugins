## ADDED Requirements

### Requirement: Conservation des protections à la fermeture OpenCode
La fermeture technique de CAB après disparition prouvée d’OpenCode MUST conserver les RUN, jobs, réservations, décisions, gates et gels existants. Elle MUST NOT purger, libérer de protection, synthétiser de décision ou de clôture métier, ni rejouer une permission consommée. La reprise MUST rester explicite et soumise à réconciliation ; les effets inconnus MUST rester protégés.

#### Scenario: Plusieurs RUN dont une récupération gelée
- **WHEN** le serveur commun disparaît avec des RUN réservés et un gel de récupération
- **THEN** les composants se ferment et leurs états métier et protections restent conservés
