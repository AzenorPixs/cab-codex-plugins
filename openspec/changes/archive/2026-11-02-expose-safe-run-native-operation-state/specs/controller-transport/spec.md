## ADDED Requirements

### Requirement: Projection sûre des opérations natives par RUN

`GET /runs/<runId>/operations` MUST retourner un instantané en lecture seule
des opérations durables du seul RUN ciblé. L’instantané MUST être borné,
indiquer son compte et sa troncature, et permettre un filtre exact par
`operationId`. Il MUST NOT exposer bearer token, contenu de fichier, commande,
ressource détaillée ou texte libre, et MUST NOT modifier le registre, une
décision, une permission ou un accès.

#### Scenario: Isolation du RUN et confidentialité

- **WHEN** le RUN possède plusieurs opérations et un autre RUN possède aussi
  des opérations
- **THEN** seul le RUN ciblé apparaît et la limite de liste est explicite
- **AND** aucun token, commande, chemin de fichier ou contenu n’est retourné

#### Scenario: RUN sans opération ou RUN inconnu

- **WHEN** le RUN existe sans opération ou le RUN est inconnu
- **THEN** la route retourne une vue vide pour le RUN existant ou un refus sans
  entrée étrangère pour le RUN inconnu

### Requirement: Accusé once durable et absence de preuve implicite

Pour une opération portant une entrée native, la projection MUST retourner
`onceAcknowledged` vrai si l’accusé a été persisté, faux sinon ; elle retourne
`null` sans entrée native. La valeur décrit l’accusé durable de CAB et MUST NOT
prouver à elle seule l’absence d’un effet natif.

#### Scenario: Accusé once absent ou présent

- **WHEN** une opération durable possède une entrée native avant ou après
  persistance de l’accusé
- **THEN** l’instantané rapporte son état et `onceAcknowledged` faux ou vrai
- **AND** un état `false` conserve les protections jusqu’à une preuve native
  suffisante de frontière sûre
