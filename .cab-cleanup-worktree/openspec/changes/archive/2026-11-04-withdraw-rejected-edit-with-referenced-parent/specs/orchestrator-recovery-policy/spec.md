## ADDED Requirements

### Requirement: Retrait refusé sur parent seulement référencé
Le contrôleur SHALL permettre au propriétaire de retirer un enfant PREPARED/APPROVED refusé avant once référençant un parent HELD unique sans membership, sous preuve native ACK204 et deux frontières stables. Il SHALL vérifier identités, couverture et membres historiques, conserver le parent inchangé et ne créer aucun rattachement, nativeResult ou permission. Les digests exacts SHALL rester exigés pour toute exécution future.

#### Scenario: Edit divergent refusé sans liaison
- **GIVEN** un edit aborted, rejet ACK204 exact, SID idle sans permission et parent référencé compatible
- **WHEN** le propriétaire applique withdraw-unissued-validation dans son mandat
- **THEN** seule la coordination enfant devient CANCELLED, décision APPROVED historique conservée
- **AND** parent, membres, révisions, accès, baux et historique restent identiques sans once ni attachement rétroactif

#### Scenario: Preuve ou parent divergent
- **WHEN** le reçu manque, un effet/permission existe, ou parent, identité, couverture, empreinte ou membres divergent
- **THEN** le retrait est refusé sans changement des protections et aucun consentement n’est inventé
