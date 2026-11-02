## MODIFIED Requirements

### Requirement: Distribution des diagnostics avant admission 2.1.12

Les composants versionnés CAB MUST partager la base 2.1.63 et documenter le
diagnostic de notification, les tentatives HTTP avant admission, la réponse de
permission scoped, la projection sûre des opérations durables par RUN et la
restauration exacte d’une décision terminale après redémarrage. Sources,
archivage, publication, activation et qualification opérationnelle MUST rester
distincts. CABU MUST préserver OpenCode, les RUN et leurs preuves et rapporter
les versions réellement chargées avant notification des sessions.

#### Scenario: Distribution et activation vérifiées

- **WHEN** le correctif est qualifié et publié puis sa maintenance coordonnée
  est exécutée
- **THEN** les quatre briques et commandes cibles sont vérifiées
  indépendamment des sources et le résultat réel est transmis aux sessions
