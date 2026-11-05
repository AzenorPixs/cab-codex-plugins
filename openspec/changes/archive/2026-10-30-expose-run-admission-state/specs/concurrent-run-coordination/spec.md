## ADDED Requirements

### Requirement: Observation explicite de l’admission concurrente
CAB MUST exposer un instantané BUSY/STABLE du RUN et une lecture ciblée d’admission d’une demande distinguant propriétaire, validation et décision locale enregistrés. Une demande inconnue MUST rester404 et une cible étrangère MUST être refusée. STABLE MUST NOT constituer autorisation, réservation ou garantie de succès ; chaque décision MUST réexaminer les gardes existantes.

#### Scenario: Demande visible pendant transition
- **WHEN** une transition est encore active après visibilité du propriétaire et de la validation
- **THEN** le GET exposeBUSY et le POST reste refusé sans décision ni once

#### Scenario: Fin de transition et même identité
- **WHEN** la transition se termine et aucune décision n’est enregistrée
- **THEN** le GET exposeSTABLE mais le même POST reste soumis aux identités/révisions/permissions courantes et à l’unicité

### Requirement: Refus de transition non décisionnel explicite
Le409 précoce et le400 tardif run-transition-in-flight MUST conserver leurs gardes/statuts et indiquer admissionBUSY sans enregistrer une nouvelle décision. Le refus précoce MUST exposer decision_recorded local, ounull pour demande inconnue. Une décision déjà enregistrée MUST NOT être rejouée ou reconstruite depuis cet instantané.

#### Scenario: Course après observation stable
- **WHEN** une transition commence avant la décision effective
- **THEN** le POST refuse encore, sans attente serveur ni bypass de garde
