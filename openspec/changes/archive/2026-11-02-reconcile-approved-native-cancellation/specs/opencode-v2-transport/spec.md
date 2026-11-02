## MODIFIED Requirements

### Requirement: Réconciliation d’une validation annulée par OpenCode

Le contrôleur MAY clore une validation PREPARED sans décision ou approuvée non consommée sur preuve native CANCELLED/OC. Il MUST vérifier identité exacte, double lecture stable, session inactive et absence de permission, entrée native et accès lié. Il MUST conserver la décision historique, persister CANCELLED et sa preuve, retirer toute réponse exécutable et ne créer aucun once. Une divergence MUST préserver les protections ; une fin native MUST déclencher la vérification.

#### Scenario: Annulation OpenCode stable sans effet

- **WHEN** la demande exacte est terminale CANCELLED par OpenCode et deux lectures natives identiques prouvent l’identité exacte, session idle et absence d’effet
- **THEN** l’opération devient CANCELLED sans créer de décision, accès ou permission et le RUN peut préparer une autre demande distincte

#### Scenario: Approbation locale non consommée annulée

- **GIVEN** une décision approved historique, une opération PREPARED sans entrée native ni accès
- **WHEN** une preuve CANCELLED/OC exacte et stable est qualifiée sur fin native ou après reconnexion
- **THEN** CAB conserve approved dans le ledger, clôt CANCELLED et retire la réponse exécutable, y compris après un autre redémarrage

#### Scenario: Annulation divergente ou frontière native active

- **WHEN** l’identité, le transcript, la session, la permission ou l’état de l’opération diverge ou reste actif
- **THEN** CAB conserve l’état protégé sans libérer de ressource ni créer de décision

#### Scenario: Attente métier d’un autre RUN

- **GIVEN** une infrastructure native joignable et une readiness BLOCKED due à une décision en attente
- **WHEN** l’annulation exacte d’une opération PREPARED sans effet est qualifiée
- **THEN** CAB peut clôturer cette annulation sans décision de substitution ni permission, en conservant les autres protections
