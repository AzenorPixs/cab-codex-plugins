## ADDED Requirements

### Requirement: Signature native avant prepare d'un RUN

Pour une récupération adossée à un RUN, `prepare` MUST exiger une discovery
Code Mode complète et scellée de `request_validation` et MUST capturer le
préfixe natif dans `preparationHistory`. Une discovery absente MUST refuser
avant mutation du job ou révocation de l'ancienne session.

#### Scenario: Préparation complète

- **WHEN** la candidate est idle et une recherche littérale native confirme `request_validation`
- **THEN** le contrôleur scelle le préfixe et prépare le gel

#### Scenario: Signature absente pour un RUN

- **WHEN** la discovery manque
- **THEN** `prepare` est refusé sans modifier le job, le gate ou les validations

### Requirement: Permissions natives de la candidate RUN

Pour une récupération adossée à un RUN, `prepare` MUST exiger les permissions
effectives `shell:ask` et `edit:ask` sur la candidate, avant de modifier le job.

#### Scenario: Permission native absente

- **WHEN** la candidate n'a pas `shell:ask` ou `edit:ask`
- **THEN** `prepare` est refusé sans muter le job ou le gate

### Requirement: Compatibilité des récupérations historiques sans RUN

Un job historique sans RUN MUST conserver son contrat de récupération existant.
Ses gardes de permissions, corrélation et preuve de fin restent applicables.

#### Scenario: Job historique sans RUN

- **WHEN** un job sans RUN utilise le chemin de récupération existant
- **THEN** CAB applique ce contrat sans exiger la nouvelle discovery RUN

#### Scenario: Récupération historique sans RUN

- **WHEN** un job historique non adossé à un RUN suit le chemin de récupération existant
- **THEN** CAB conserve le contrat historique et continue d'exiger les preuves de prévol et de fin déjà applicables

### Requirement: Admission stricte avant notification

Avant d’accepter le `request_validation` de récupération, le contrôleur MUST
vérifier la corrélation du transcript candidat, l’absence de découverte après
le préfixe scellé et la forme native exacte du wrapper. Une divergence MUST
être refusée avant l’enregistrement de validation, notification ou permission.
`complete` MUST répéter la vérification et n’admettre que broker readiness,
request_validation/poll du même approval, une once, `/usr/bin/true` et la
readiness finale.

#### Scenario: Discovery tardive

- **WHEN** une recherche Code Mode apparait après `prepare` avant le prévol
- **THEN** le contrôleur refuse `request_validation` sans envoyer de notification ni demander une permission

#### Scenario: Wrapper non retourné

- **WHEN** execute attend `request_validation` sans retourner son résultat ou diverge des métadonnées natives
- **THEN** le contrôleur refuse avant l’admission de la validation

#### Scenario: Recovery historique déjà préparé

- **WHEN** un recovery hérité sans preuve de signature possède une unique discovery read-only normalisée en dernier, après `/usr/bin/true` et la readiness finale
- **THEN** `complete` peut clôturer ce prévol déjà consommé sans rejouer de demande, once ou commande

### Requirement: Timeout fini du prévol de récupération

Le broker MUST appliquer un timeout fini par défaut à `request_validation` et
refuser `timeout_seconds=0`. Un timeout MUST retourner un état non terminal et
le même approval ID pollable. Notification livrée seule MUST NOT valoir
décision ou approbation.

#### Scenario: Notification livrée, attente sans décision

- **WHEN** aucune décision terminale n’arrive avant le timeout fini
- **THEN** le broker retourne `validation_timeout` et `retry_required` pour le même approval ID sans rester bloqué
