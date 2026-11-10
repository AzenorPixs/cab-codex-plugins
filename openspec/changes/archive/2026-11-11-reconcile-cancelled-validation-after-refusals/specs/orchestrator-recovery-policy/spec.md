## ADDED Requirements

### Requirement: Annulation native après refus ultérieurs sans effet

Le contrôleur SHALL pouvoir réconcilier une validation PREPARED annulée par OC malgré un suffixe qualifié sans effet, sur preuve des identités, refus et observations natives exactes. Il SHALL préserver les deux lectures stables, la quiescence, l’absence de permission, d’accès et de once, ainsi que les autres demandes. Toute preuve incomplète ou tout effet inconnu SHALL bloquer.

#### Scenario: Atelier refusé et proposition non admise
- **WHEN** l’atelier de la même identité a échoué avant création, son status ultérieur confirme son absence et une proposition distincte est prouvée NOT_ADMITTED sans owner ni opération locale
- **THEN** la validation initiale peut devenir CANCELLED sans décision ni permission et sans modifier la proposition refusée

#### Scenario: Effet ou identité incertaine
- **WHEN** une sortie, identité, preuve de refus, absence d’admission ou frontière native ne peut être vérifiée
- **THEN** la validation reste PREPARED et aucune permission ou décision n’est émise

#### Scenario: Annulation native par retour littéral direct
- **WHEN** le wrapper complet et non tronqué retourne directement l’appel unique `cancel_approval` avec l’identité exacte
- **THEN** sa sortie CANCELLED/cancelled_by=OC peut être examinée sous les mêmes gardes de réconciliation
