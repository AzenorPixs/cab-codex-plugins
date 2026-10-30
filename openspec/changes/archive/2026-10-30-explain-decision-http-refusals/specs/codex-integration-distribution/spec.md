## ADDED Requirements

### Requirement: Distribution des diagnostics de décision2.1.16
La distribution MUST aligner composants et commandes sur2.1.16 et documenter les codes de refus400, decision_recorded et la distinction entre demande et décision. Les tests MUST préserver succès, rejets, gardes natives et absence d’exposition sensible. La source qualifiée MUST précéder CABU et la notification des versions effectivement activées.

#### Scenario: Livraison source puis activation
- **WHEN** les sources2.1.16 sont qualifiées et archivées
- **THEN** les versions actives sont vérifiées séparément avant information des sessions
