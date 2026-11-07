## ADDED Requirements

### Requirement: Entretien explicite des RUN fermés par lot
CAB SHALL accepter un lot explicite de RUN fermés avec liste de RUN protégés et preuve du mandat. Il SHALL refuser tout RUN RESERVED, ressource non soldée ou contexte protégé. Tous les contextes et changes historiques du lot SHALL être inventoriés et leurs jobs désarmés/gates terminaux validés. Aucun état métier SHALL être converti en réussite par cet entretien.

#### Scenario: RUN ancien réutilisé entre changes
- **WHEN** tous ses contextes sont fermés et sélectionnés pour entretien
- **THEN** leurs aliases sont inclus dans la portée authentifiée ; les autres RUN et les chats ouverts sont préservés

### Requirement: Effacement authentifié et conservation des preuves du lot
Le lot SHALL utiliser la transaction existante, son canal propriétaire, les candidats hachés, le réancrage et le certificat/finalize/verify. Rapports métier et statistiques historiques SHALL rester disponibles. Un contexte sans liaison SGS native MAY être retiré sans inventer un rapport ; toute liaison native existante SHALL conserver sa preuve durable avant purge.

#### Scenario: Lot terminé et pair actif
- **WHEN** le lot est effacé et vérifié
- **THEN** seules ses identités/ateliers/états sont absents ; PID OpenCode et identités/décisions/once/baux des pairs restent conservés
