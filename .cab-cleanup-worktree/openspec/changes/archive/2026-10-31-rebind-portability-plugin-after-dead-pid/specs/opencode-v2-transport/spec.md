## ADDED Requirements

### Requirement: Liaison du plugin au processus OpenCode courant
Le plugin de contexte MAY se rattacher au processus OpenCode courant si son PID configuré diffère uniquement lorsque le système prouve que l’ancien PID n’existe plus. Le plugin MUST NOT se rattacher si l’ancien PID répond encore ou si son existence ne peut pas être déterminée. Les règles de portabilité MUST rester identiques ; le changement de PID ne modifie ni session, fournisseur, modèle, connexion ni messages ciblés.

#### Scenario: Redémarrage après fin de l’ancien processus
- **WHEN** OpenCode charge le plugin dans un nouveau processus et que la vérification du PID configuré renvoie ESRCH
- **THEN** le plugin utilise le PID du processus courant et conserve les règles existantes

#### Scenario: Ancien processus encore actif
- **WHEN** le PID configuré répond encore au contrôle de présence
- **THEN** le plugin refuse l’activation avec cab-context-process-changed

#### Scenario: État du PID indéterminé
- **WHEN** le contrôle échoue pour une cause autre que PID absent
- **THEN** le plugin refuse l’activation en fail-closed sans inscrire de hook
