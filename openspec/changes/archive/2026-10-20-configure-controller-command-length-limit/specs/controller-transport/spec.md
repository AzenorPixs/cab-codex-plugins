## ADDED Requirements

### Requirement: Limite configurable de commande unitaire

Le contrôleur MUST résoudre au démarrage `OC_Codex_MAX_COMMAND_LENGTH`, ou son alias `OC_CGPT_MAX_COMMAND_LENGTH` si le nom principal est absent. Il MUST utiliser 16 384 lorsque les deux noms sont absents. La limite MUST être commune à tous les contextes du processus.

#### Scenario: Défaut et bornes
- **WHEN** aucune variable de limite n'est fournie et une commande contient 16 383, 16 384 ou 16 385 unités UTF-16
- **THEN** les deux premières passent le contrôle de longueur et la troisième est refusée

#### Scenario: Configuration et alias
- **WHEN** le nom principal est absent et l'alias vaut 2000
- **THEN** le seuil est 2 000, avec admission à 1 999 et 2 000 et refus à 2 001

#### Scenario: Priorité explicite
- **WHEN** les deux noms sont présents
- **THEN** le nom principal prévaut, y compris lorsque sa valeur est invalide

### Requirement: Validation de la configuration de longueur

Une valeur fournie MUST contenir uniquement des chiffres ASCII et représenter un entier strictement positif et sûr JavaScript. Une valeur invalide MUST faire échouer le démarrage avant ouverture HTTP, modification du registre ou lancement de Codex, sans afficher sa valeur.

#### Scenario: Configuration invalide
- **WHEN** la valeur fournie est vide, zéro, signée, fractionnaire, espacée, exponentielle, non numérique ou supérieure au maximum entier sûr
- **THEN** le démarrage échoue avec un diagnostic nommant la variable sans exposer sa valeur

### Requirement: Refus explicite des commandes trop longues

Pour les demandes et rappels, sur les routes historiques, resource et par RUN, le contrôleur MUST comparer la longueur de commande à la limite en unités UTF-16, sans modifier son contenu. Un dépassement MUST retourner HTTP 400 JSON contenant `error=command-too-long`, un message construit depuis les longueurs, `maxLength`, `actualLength` et `unit=utf16`. Le diagnostic MUST NOT exposer le contenu de la commande. Les limites de transport MUST rester indépendantes.

#### Scenario: Dépassement sans effet
- **WHEN** une demande ou un rappel porte une commande de longueur L+1 pour une limite L
- **THEN** le contrôleur retourne le refus structuré avec les deux longueurs sans enregistrer d'opération ni de validation

#### Scenario: Unicode
- **WHEN** une commande contient des caractères BMP et hors BMP
- **THEN** leur comptage suit String.length, avec deux unités pour un caractère hors BMP

### Requirement: Refus de longueur sans autorisation implicite

Le contrôle de longueur MUST refuser avant enregistrement de l'opération, appropriation du requestId ou création de validation. Ce refus MUST NOT créer de décision, permission native ou tour Codex. Une commande longue admise MUST conserver les règles existantes de corrélation et de consommation unique.

#### Scenario: Refus avant enregistrement
- **WHEN** la commande dépasse la limite
- **THEN** aucune opération, identité de requête ou validation n'est enregistrée et aucune décision ou permission n'est créée

#### Scenario: Commande longue et permission unique
- **WHEN** une commande longue admise reçoit une décision corrélée et une permission native exacte admissible
- **THEN** le contrôleur peut transmettre une seule réponse once ; une commande divergente et une seconde permission sans nouvelle décision restent refusées selon les règles de corrélation existantes
