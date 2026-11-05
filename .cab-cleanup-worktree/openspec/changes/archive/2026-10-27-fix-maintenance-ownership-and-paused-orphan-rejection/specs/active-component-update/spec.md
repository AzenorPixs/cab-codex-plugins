## ADDED Requirements

### Requirement: Propriétaires distincts des artefacts et processus
La preuve reuse-readonly MUST accepter les champs optionnels artifactOwnerUid et directoryOwnerUid, entiers positifs ou nuls, limités à l'acteur de maintenance ou expectedUid. expectedUid MUST rester l'UID d'exécution OpenCode/broker. L'omission MUST conserver les vérifications précédentes. La maintenance MUST lier et recontrôler les propriétaires, groupes, modes, empreintes et identités réels et MUST NOT modifier les artefacts broker.

#### Scenario: Modules ADE et broker devops
- **WHEN** les modules exacts cibles appartiennent à l'acteur, leur répertoire au broker et les processus à expectedUid sous un autre compte
- **THEN** la maintenance qualifiée peut recharger le broker par OpenCode sans mutation des modules ou des droits

#### Scenario: Propriétaire tiers ou dérive
- **WHEN** un propriétaire n'est ni l'acteur ni expectedUid, ou une identité/empreinte/propriété change
- **THEN** la maintenance refuse ou conserve son gel selon la frontière franchie, sans élargissement de permission
