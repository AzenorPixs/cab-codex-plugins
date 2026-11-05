## ADDED Requirements

### Requirement: Payload Bash scellé sans recopie modèle
CAB MUST permettre le staging d’un payload Bash UTF-8 revu et son SHA256, immuable et lié aux identités RUN/job/SID/version/requête/opération. Le staging MUST NOT créer validation, décision, accès ou exécution. Le modèle MUST pouvoir transmettre seulement l’invocation courte scellée ; décision exacte, accès HELD et once natifs MUST rester requis.

#### Scenario: Préparation revue et idempotence
- **WHEN** l’orchestrateur dépose le corps et hash vérifiés à une frontière sûre
- **THEN** CAB retourne le même transport pour le même stage exact et refuse une substitution ou un contexte étranger

### Requirement: Revue du corps derrière le transport
La décision MUST porter sur l’invocation et le corps scellé exact. Le mode de décision automatique MUST recevoir le corps et son hash depuis le stage privé correspondant, jamais depuis un texte libre du modèle. La réponse de staging MUST rester non autorisante ; le codeur MUST NOT être chargé de recopier le long corps après revue.

#### Scenario: Décision automatique sur le transport
- **WHEN** la demande correspond aux identités et à l’invocation d’un stage
- **THEN** le validateur reçoit le payload scellé pour examen, distinct du transport court confié au codeur

### Requirement: Vérification et livraison native du corps exact
La livraison MUST être liée à l’opération approuvée et au contexte natif en exécution, sans accès restauré/inconnu. Le lanceur MUST vérifier longueur, SHA256, UTF-8 et CWD avant Bash, sans fichier mutable ni retry. Une altération ou réponse invalide MUST terminer avant payload. Les plafonds existants MUST rester inchangés ; aucun mandat historique MUST être réinterprété.

#### Scenario: Corps long et modèle absent du transport
- **WHEN** l’invocation courte approuvée reçoit once
- **THEN** le corps scellé exact est exécuté par le shell natif sans que le modèle ait recopié ses octets

#### Scenario: Transport ou corps divergent
- **WHEN** le corps, le hash ou le contexte ne correspond plus
- **THEN** le payload ne s’exécute pas et la réconciliation conserve les preuves sans once rejouée
