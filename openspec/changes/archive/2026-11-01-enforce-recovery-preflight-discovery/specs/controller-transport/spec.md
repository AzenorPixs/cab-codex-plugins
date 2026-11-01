## MODIFIED Requirements

### Requirement: Admission stricte avant notification
Avant d’accepter `request_validation`, le contrôleur MUST vérifier le préfixe
natif scellé et la forme exacte du wrapper. Toute discovery après `prepare`
MUST rester refusée à l’admission. `complete` MUST répéter la corrélation,
vérifier le préfixe scellé et appliquer les règles strictes des outils, sous
la seule exception de réconciliation historique spécifiée séparément.

#### Scenario: Discovery tardive
- **WHEN** une recherche Code Mode apparait après `prepare` avant le prévol
- **THEN** le contrôleur refuse `request_validation` sans envoyer de notification ni demander une permission

#### Scenario: Recovery historique déjà préparé
- **WHEN** un recovery RUN hérité sans preuve de signature possède une unique discovery native read-only exacte et horodatée avant la demande approuvée
- **AND** les preuves de permission consommée, de commande et de readiness finale sont complètes
- **THEN** `complete` réconcilie ce prévol déjà consommé sans rejouer de demande, once ou commande

#### Scenario: Discovery historique dupliquée ou invalide
- **WHEN** un recovery hérité contient plusieurs discoveries ou une preuve discovery tronquée, divergente ou dépourvue d’horodatage natif
- **THEN** `complete` est refusé sans mutation du job, du RUN ou des permissions natives

#### Scenario: Recovery récente signée
- **WHEN** une recovery porte une signature scellée et son transcript contient une discovery après le préfixe préparé
- **THEN** `complete` reste refusé sans mutation

#### Scenario: Wrapper non retourné
- **WHEN** execute attend `request_validation` sans retourner son résultat ou diverge des métadonnées natives
- **THEN** le contrôleur refuse avant l’admission de la validation

## ADDED Requirements

### Requirement: Réconciliation sans rejeu d’une discovery historique
Pour une recovery RUN legacy sans `requestValidationSignatureHash`, `complete`
MAY réconcilier une discovery native `request_validation` exacte, complète,
non tronquée, read-only et horodatée, où qu’elle apparaisse après `prepare`.
Le hash du préfixe préparé MUST rester valide et chaque partie post-prepare
MUST être contrôlée. Recoveries signées, doublons, divergences, troncatures,
horodatages absents et outils supplémentaires MUST être refusés sans mutation.

#### Scenario: Discovery avant request_validation
- **WHEN** une recovery legacy déjà préparée contient une unique discovery exacte avant le wrapper `request_validation`
- **AND** l’approbation, la permission consommée, `/usr/bin/true` avec exit 0 et la readiness finale sont prouvés
- **THEN** `complete` termine la même recovery sans effet supplémentaire

#### Scenario: Découverte legacy invalide ou répétée
- **WHEN** la discovery est dupliquée, tronquée, divergente ou dépourvue d’horodatages natifs
- **THEN** `complete` est refusé sans changer le job, le RUN ou les permissions

#### Scenario: Discovery après prepare sur recovery signée
- **WHEN** une recovery avec signature scellée contient une discovery après `prepare`
- **THEN** le contrôleur conserve le refus strict sans mutation

### Requirement: Preuves du prévol consommé lors de la complétion
`complete` MUST conserver les preuves de l’approbation originale, de son unique
permission native consommée, de la commande exacte `/usr/bin/true` terminée
avec exit 0 et de la readiness finale `READY` sans pending. Cette compatibilité
MUST NOT créer ou rejouer une demande, décision, permission, retry, commande ou
effet métier.

#### Scenario: Complétion sans rejeu
- **WHEN** une recovery historique est complétée avec les preuves natives originales
- **THEN** la transition réconcilie le même job et n’émet aucune permission ou commande supplémentaire
