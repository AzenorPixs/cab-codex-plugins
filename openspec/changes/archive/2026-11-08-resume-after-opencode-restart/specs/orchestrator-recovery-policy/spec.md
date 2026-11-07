## ADDED Requirements

### Requirement: Rejet attesté avant redémarrage du processus
Pour une récupération ciblée, CAB MAY prendre en compte un reçu ACK de rejet émis par l'ancienne instance OpenCode si son PID a disparu, la nouvelle instance et la même session sont vérifiées, et toutes les preuves exactes de call, cible, dates et absence d'effet restent cohérentes. CAB SHALL lier la preuve de disparition et l'identité courante à la frontière lue deux fois. Une identité ambiguë SHALL refuser le retrait.

#### Scenario: Rejet attesté et ancien processus disparu
- **WHEN** le reçu exact ACK correspond au call natif non exécuté, l'ancien PID est absent et la session appartient au même workspace sous une nouvelle instance vérifiée
- **THEN** le propriétaire peut utiliser ce reçu dans la seule récupération qualifiée sans rejouer le rejet ni l'effet

### Requirement: Appels d'atelier indépendants après un rejet
CAB MAY distinguer les essais d'atelier confinés d'un effet projet refusé si leurs identités, leurs reçus terminaux et leur entrée exacte sont vérifiés. CAB SHALL conserver une preuve de ces effets d'atelier distincte de l'absence d'effet projet. Un appel non vérifiable SHALL continuer à bloquer la réconciliation.

#### Scenario: Essai d'atelier terminal vérifié
- **WHEN** un essai postérieur est lié au même RUN, à sa session et à son reçu d'exécution confiné et terminal
- **THEN** il ne devient pas un second write projet et sa preuve reste présente dans la réconciliation

### Requirement: Lecture native à sortie tronquée
CAB MAY reconnaître une lecture native explicite et terminée comme non mutante même si sa sortie est tronquée, lorsque son outil, son identité et son entrée sont vérifiés. CAB SHALL NOT utiliser la sortie tronquée comme preuve du contenu complet lu.

#### Scenario: Résultat de lecture tronqué
- **WHEN** un appel native read terminé possède une entrée valide et indique une sortie tronquée
- **THEN** il reste distingué d'une écriture sans attester le contenu complet
