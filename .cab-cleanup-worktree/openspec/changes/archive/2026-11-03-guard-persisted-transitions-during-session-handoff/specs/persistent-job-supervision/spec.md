## ADDED Requirements

### Requirement: Opposabilité des transitions persistées au handoff
Le handoff MUST refuser un job dont recovery ou modelTransition est présent,
même hors requête inFlight et après redémarrage. Les observations readonly
antérieures MUST rester historiques ; seule la dernière readiness MUST
prouver READY, zéro pending, le RUN et la version courante avant le transfert.

#### Scenario: Transition restaurée hors appel actif
- **WHEN** le contrôleur restaure une récupération ou une transition modèle préparée ou non confirmée
- **THEN** le transfert est refusé sans changer le SID, le checkpoint ou les protections

#### Scenario: Candidate readonly conservée pendant une mise à jour
- **GIVEN** une ancienne readiness readonly liée au même RUN
- **WHEN** la candidate obtient une nouvelle readiness qualifiée à la version courante
- **THEN** cette observation récente permet la préparation dans le même SID, sans transformer l’ancienne en preuve fraîche
