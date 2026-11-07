## ADDED Requirements

### Requirement: Rétention des identités secondaires partagées
Pour un lot fermé, CAB SHALL pouvoir ajouter des identités secondaires à la rétention sur le même reçu avant application, après preuve propriétaire PREPARED et périmètreRUN inchangé. Les RUN/SID primaires SHALL ne pas être modifiés. Projection et absence SHALL préserver ces références partagées. Une phase appliquée ou incertaine SHALL refuser cette réconciliation.

#### Scenario: Lecture historique utilisée par un RUN protégé
- **WHEN** la même identité secondaire apparaît dans le journal d’un RUN conservé
- **THEN** elle est conservée ; la transaction reprend sans élargir les RUN effacés ni supprimer le journal du pair

### Requirement: Transfert frais après projection vérifiée
CAB SHALL réancrer le transfert du même reçu après préparation propriétaire et projection vérifiées, avec PID natif et empreinte du registre inchangés. Ce renouvellement SHALL ne pas rejouer de permission ou d’effet ni modifier les pairs.

#### Scenario: Préparation longue
- **WHEN** la préparation ou projection dépasse le premier bail de transfert
- **THEN** le même transfert est renouvelé à une frontière vérifiée avant reprise des services
