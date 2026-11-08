## ADDED Requirements

### Requirement: Projection de nettoyage à parcours borné

CAB MUST éviter les reconstructions et parcours redondants pendant la projection
d’un nettoyage, sans modifier sa portée ni les données protégées. La mesure en
lecture seule MUST rester distincte de la durée constatée d’une reprise réelle.

#### Scenario: Registre contenant des RUN pairs
- **WHEN** CAB projette le retrait d’un RUN clos
- **THEN** les RUN pairs et le résultat fonctionnel sont identiques à ceux de la projection de référence

### Requirement: Reprise optimisée d'un reçu déjà appliqué

Le helper et le broker 2.4.40 MAY reprendre avec les services 2.4.35 un reçu
STOPPING préalablement lié au helper 2.4.38 ou 2.4.39, après vérification de
l’identité du propriétaire, de la portée et des pairs. CAB MUST conserver le
même reçu et MUST aligner ensuite les briques par CABU.

#### Scenario: Reprise après interruption de projection
- **WHEN** la projection a été interrompue avant application côté contrôleur et que le propriétaire est déjà APPLIED
- **THEN** CAB rattache les processus courants et reprend le même reçu avec la projection optimisée
