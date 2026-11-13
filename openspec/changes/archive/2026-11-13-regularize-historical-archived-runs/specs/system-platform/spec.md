## ADDED Requirements

### Requirement: Clôture historique explicite sur preuves
CAB MUST permettre au propriétaire d'un RUN direct WORKING ou à un administrateur
de prévisualiser puis confirmer une clôture historique sur archive datée unique.
La confirmation MUST inclure le digest des preuves calculé par CAB, un reçu stable,
une référence d'autorisation développeur explicite et une justification.

#### Scenario: Archive complète sans reçus modernes
- **WHEN** une confirmation autorisée correspond aux preuves inspectées
- **THEN** le seul RUN ciblé devient CLOSED à l'étape11 avec reçu historique et audit

#### Scenario: Confirmation répétée
- **WHEN** le même reçu et les mêmes paramètres sont présentés après perte de réponse
- **THEN** CAB renvoie le reçu initial sans autre effet ; un contenu différent est refusé

#### Scenario: Preuve modifiée ou effet inconnu
- **WHEN** une preuve change après inspection ou une protection est encore active
- **THEN** CAB refuse et conserve l'état, les reçus et les protections

### Requirement: Protection des preuves historiques
CAB MUST vérifier source active absente, proposal/tasks/review non vides,
tâches présentes toutes cochées et STATISTICS.md local lisible.
CAB MUST refuser maintenance, effet non terminal ou inconnu, bail détenu,
période ouverte, archive ambiguë, chemin non sûr et preuves périmées.

#### Scenario: Période ouverte ou archive incomplète
- **WHEN** une période n'est pas terminée ou une tâche est encore décochée
- **THEN** la clôture est refusée sans modifier le RUN

### Requirement: Provenance et limites de la régularisation
Le reçu et l'audit MUST distinguer CLOSED historique d'une acceptation normale.
Tests et livraison MUST rester documentaires, sans qualification rétroactive.
CAB MUST conserver SID, RUN, génération, mandat, gel et anciens reçus ; il MUST NOT
inventer de reçu de test ou rejouer un travail. Les statistiques MUST rester
sous la responsabilité du service CAB.

#### Scenario: Ancienne exécution non démarrée
- **WHEN** un RUN archivé régularisé possède un reçu FAILED_TO_START
- **THEN** il reste inchangé et le reçu de clôture indique normal_acceptance=false
