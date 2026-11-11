## ADDED Requirements

### Requirement: Réconciliation d’un échec de prévol externe avant envoi

CAB MUST permettre une réconciliation propriétaire d’une intention externe uniquement sur preuves natives complètes d’un échec reconnu avant envoi distant. La décision MUST conserver l’intention et distinguer la coordination d’un résultat de test. L’absence de reçu ne MUST NOT suffire ; aucun faux reçu ni rejeu de la même identité ne MUST être autorisé.

#### Scenario: Prévol privé refusé avant transport
- **WHEN** l’appel unique, son empreinte, le RUN, la session, la génération, le bail, les artefacts déployés et la continuité du processus sont vérifiés sur deux observations fraîches et stables et démontrent l’erreur avant transport
- **THEN** le propriétaire peut enregistrer une clôture de coordination auditée sans déclarer de test exécuté ni restituer le bail

#### Scenario: Envoi ou identité incertain
- **WHEN** une preuve manque, les observations divergent ou une autre tentative pourrait avoir émis un effet
- **THEN** l’intention et le bail restent protégés sans rejeu

### Requirement: Diagnostic d’un effet externe non résolu

Lorsqu’une soumission est refusée en raison d’un effet externe non résolu, le broker MUST transmettre ce code précis au codeur sans exposer d’information sensible ni affaiblir le refus.

#### Scenario: Soumission avec effet externe incertain
- **WHEN** le contrôleur refuse la soumission avec `external-effects-unresolved`
- **THEN** le broker conserve ce code et aucune soumission n’est acceptée

### Requirement: Attestation immédiate du prévol externe

Le broker MUST signaler au contrôleur un échec de son état privé après premier grant et avant transport, par le canal propriétaire authentifié. Le contrôleur MUST conserver une fin de coordination auditée sans créer de reçu de test ni autoriser le rejeu de la même identité.

#### Scenario: État privé refusé après premier grant
- **WHEN** le broker authentifié établit que le contrôle privé a échoué avant tout transport et que l’identité et le bail du premier grant concordent
- **THEN** le contrôleur enregistre l’échec de prévol sans résultat d’essai et conserve le bail

#### Scenario: Grant antérieur ou réponse incertaine
- **WHEN** le grant n’est pas le premier ou que l’attestation n’est pas acquittée
- **THEN** aucune preuve rétroactive de non-émission n’est déduite et les protections applicables restent en place
