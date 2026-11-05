## ADDED Requirements

### Requirement: Restitution explicite de réservation sans effet
CAB MUST proposer une restitution HELD distincte du nettoyage ordinaire seulement sur autorisation développeur spécifique et attestation explicite de l’orchestrateur couvrant tous les mandats et opérations du cycle sans mutation de l’environnement. Il MUST vérifier propriétaire, contexte, génération, jeton, fencing, frontière exacte et liste exhaustive des opérations.

#### Scenario: Diagnostics sans mutation puis SSH inaccessible
- **WHEN** toutes les opérations terminales sont corrélées nativement et explicitement examinées sans effet, avec autorisation spécifique et frontière inchangée
- **THEN** CAB restitue la réservation avec un reçu unused-no-effect sans annoncer nettoyage, disponibilité distante ou réussite des diagnostics

#### Scenario: Frontière inconnue ou mutation
- **WHEN** une opération manque, reste active, a muté l’environnement ou que l’attestation ou l’autorisation manque
- **THEN** la réservation reste protégée et le parcours ordinaire reste nécessaire

#### Scenario: Reçu durable et répétition
- **WHEN** une restitution sans effet est rejouée exactement ou le registre est restauré
- **THEN** le reçu et ses empreintes restent conservés, le rejeu identique est idempotent et une requête divergente est refusée sans rejouer once

### Requirement: Gardes de la restitution sans effet
Une opération active, inconnue, non attestée ou une mutation déclarée MUST refuser cette voie. Une classification MUST NOT être déduite du texte des commandes, du résultat SSH, d’un exit ou d’un timeout. Les accès temporaires MUST être libérés et les protections de restauration, pause et gel MUST rester applicables.

#### Scenario: Interdiction de restitution implicite
- **WHEN** un délai expire ou une commande semble inoffensive sans examen explicite
- **THEN** CAB conserve la réservation sans fabriquer d’attestation

## MODIFIED Requirements

### Requirement: Restitution vérifiée des environnements
CAB MUST conserver la réservation jusqu’à la fin des opérations et la restitution vérifiée. La libération ordinaire MUST exiger nettoyage puis vérification distincts, corrélés et réussis après les tests, avec preuves examinées. Seule la restitution explicite sans effet MAY remplacer ce parcours sans mutation. Une fin de commande ou un booléen seul MUST NOT suffire. Une répétition identique MUST restituer le reçu ; une répétition divergente MUST être refusée.

#### Scenario: Test fini et nettoyage incomplet
- **WHEN** la dernière commande de test termine mais le nettoyage est absent ou échoué
- **THEN** la ressource reste réservée et aucun pair ne peut l'utiliser

#### Scenario: Test échoué et environnement restitué
- **WHEN** un test échoue puis le nettoyage et la vérification de disponibilité réussissent sans autre opération restante
- **THEN** la réservation peut être libérée sans transformer le résultat du test en succès
