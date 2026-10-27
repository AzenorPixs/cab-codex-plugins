## REMOVED Requirements

### Requirement: Raisonnement high puis xhigh puis politique inférieure
Cette règle est remplacée par un défaut medium unique. Les niveaux explicites
du prompt restent prioritaires ; l'indisponibilité de medium fait examiner la
candidate PLLM suivante au lieu d'essayer un autre niveau pour la même
candidate.

## ADDED Requirements

### Requirement: Raisonnement medium par défaut et niveau explicite prioritaire
Un niveau de raisonnement explicitement donné par le prompt MUST prévaloir.
Sans niveau explicite, CAB MUST choisir medium si disponible. Si medium est
indisponible ou rejeté par preuve native, une candidate automatique suivante
MUST être examinée selon la priorité PLLM. CAB MUST vérifier les variantes
réellement publiées. Une erreur d'authentification, quota ou réseau MUST NOT
être assimilée à une incompatibilité de raisonnement.

#### Scenario: Défaut medium
- **WHEN** une candidate automatique expose medium et aucun niveau n'est fixé par le prompt
- **THEN** CAB choisit medium, même lorsque d'autres variantes sont exposées

#### Scenario: Niveau explicite conservé
- **WHEN** le prompt fixe explicitement un niveau pris en charge
- **THEN** CAB prévole exactement ce niveau sans le remplacer par medium

#### Scenario: Medium indisponible
- **WHEN** une candidate automatique ne prend pas en charge medium
- **THEN** CAB examine la candidate suivante selon la priorité PLLM sans sélectionner une autre variante sur la candidate courante

#### Scenario: Modèle imposé incompatible
- **WHEN** un modèle explicite ne prend pas en charge le niveau de raisonnement requis
- **THEN** CAB refuse la sélection sans remplacer silencieusement le modèle

### Requirement: Négociation du protocole 1.10.6
Tout nouveau job piloté par CAB 1.10.6 MUST négocier pllm-auto-v1 avant
l'armement. La préparation source MUST NOT modifier les agents, fournisseurs
ou services actifs. Les jobs déjà armés MUST conserver leur sélection
persistée.

#### Scenario: Défaut appliqué à un nouveau job
- **WHEN** un nouveau job 1.10.6 est résolu sans niveau explicite
- **THEN** il reçoit medium et exige un prévol exact avant armement

## MODIFIED Requirements

### Requirement: Repli après incompatibilité native prouvée
CAB MAY écarter medium uniquement après preuve native corrélée d'une erreur
de paramètre de raisonnement reconnu. La preuve MUST correspondre au modèle,
à medium et à l'évaluation courante. Les erreurs 401, 403, 429, réseau ou
paramètres étrangers MUST NOT autoriser ce repli. CAB MUST conserver seulement
les références filtrées, sans corps d'erreur brut.

#### Scenario: Medium refusé par le fournisseur
- **WHEN** un prévol natif prouve le rejet de medium pour la candidate automatique
- **THEN** CAB examine la politique de priorité inférieure et exige son prévol réussi

#### Scenario: Quota épuisé pendant un prévol
- **WHEN** le fournisseur renvoie 429 plutôt qu'une incompatibilité de raisonnement
- **THEN** CAB bloque sans faire de repli de candidate

### Requirement: Variante native ou historique corrélée
Le prévol et l'indisponibilité MUST lire parent.info.model.variant ou
parent.info.variant, avec au moins un champ parent valide. Tous les champs
parent présents et assistant.info.variant présent MUST être identiques. Une
absence, valeur invalide ou contradiction MUST refuser. Les gardes session,
répertoire, parent, fournisseur, modèle, date, achèvement et absence d'outil
MUST être conservés. Un rejet prouvé de medium MUST faire examiner la
candidate PLLM suivante, sans choisir un autre niveau sur la même candidate.
Les erreurs auth, quota ou réseau MUST NOT établir cette indisponibilité.

#### Scenario: Prévol natif imbriqué et preuve historique
- **WHEN** la variante parent imbriquée ou historique correspond au choix et aux champs assistant disponibles
- **THEN** CAB peut qualifier la preuve sans modifier les variantes demandées ou les contrats historiques

#### Scenario: Rejet de medium
- **WHEN** une erreur native corrélée prouve le rejet de medium pour une candidate automatique
- **THEN** CAB examine la candidate suivante et exige son propre prévol réussi

#### Scenario: Quota pendant le prévol
- **WHEN** le fournisseur renvoie 429 plutôt qu'une incompatibilité de raisonnement
- **THEN** CAB bloque sans faire de repli de candidate

### Requirement: Prévol exact et reprise du choix conservé
L'armement négocié MUST vérifier un prévol natif réussi sans outils pour le
fournisseur, modèle et raisonnement exacts. Il MUST persister la sélection et
sa preuve. Le superviseur MUST réutiliser explicitement ces valeurs lors des
reprises. Un armement répété MUST NOT modifier le choix d'un job existant. Le
broker et le moniteur MUST rester sans sélection LLM ; le validateur Codex
MUST conserver son rôle distinct.

#### Scenario: Réponse sur une autre variante
- **WHEN** le prévol correspond au même modèle mais porte un niveau différent de celui retenu
- **THEN** l'armement refuse cette preuve sans adopter le modèle

#### Scenario: Reprise après redémarrage
- **WHEN** le superviseur reprend un job dont la sélection validée est persistée
- **THEN** il transmet le fournisseur, modèle et raisonnement conservés plutôt que le défaut courant d'OpenCode
