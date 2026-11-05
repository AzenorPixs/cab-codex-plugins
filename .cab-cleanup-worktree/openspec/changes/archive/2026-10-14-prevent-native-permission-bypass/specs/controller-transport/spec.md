## ADDED Requirements

### Requirement: Permission native vérifiée avant approbation exécutable
Pour un job armé, le contrôleur MUST vérifier par HTTP la session et le répertoire du mandat avant admission et avant enregistrement d'une décision approved. La dernière règle couvrant le type natif bash ou edit MUST avoir pattern `*` et action ask. Les jokers du nom de permission MUST être pris en compte. Une règle absente, malformée, plus spécifique en dernière position ou une réponse indisponible MUST refuser l'opération avec un diagnostic explicite sans décision implicite.

#### Scenario: Outil réactivé en allow
- **WHEN** une validation exécutable de job armé vise une session dont la dernière règle native est allow
- **THEN** le contrôleur refuse avant enregistrement de la validation et ne transmet aucune permission

#### Scenario: Règle modifiée avant décision
- **WHEN** la règle devient allow après admission mais avant une décision approved manuelle ou automatique
- **THEN** aucune décision approved n'est enregistrée et un refus explicite reste possible

#### Scenario: Ancien usage sans job armé
- **WHEN** une validation est utilisée sans job armé
- **THEN** sa compatibilité historique est préservée

### Requirement: Garde natif lors du prévol et de la transmission
Les contrôles de récupération MUST vérifier la règle Bash ask de la candidate avant prévol. Avant de transmettre once pour un job armé, le contrôleur MUST vérifier de nouveau les règles de la session. Après chaque contrôle asynchrone, il MUST réévaluer l'admission et l'absence de décision concurrente. Un échec MUST conserver les décisions antérieures, le gel éventuel et l'absence de consommation.

#### Scenario: Candidate permissive
- **WHEN** prepare vise une candidate sans règle Bash ask vérifiable
- **THEN** prepare est refusé sans modifier le job ni approuver le prévol

#### Scenario: Dérive avant once
- **WHEN** une règle permissive apparaît avant la transmission native
- **THEN** once n'est pas transmis et l'approbation historique reste intacte
