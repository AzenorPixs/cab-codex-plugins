## ADDED Requirements

### Requirement: Rejet natif sans effet pour un bail de test restauré
La restitution tokenless MUST accepter une opération `PREPARED` sans permission
native uniquement si la décision native de rejet est corrélée à la même
opération ou si un reçu durable `REJECTION_ONLY` correspond exactement. Une
opération approuvée, inconnue ou avec accès associé MUST conserver le bail
`HELD`.

#### Scenario: Validation rejetée sans permission native
- **WHEN** un bail restauré est associé à une opération `PREPARED` portant un
  reçu `REJECTION_ONLY` concordant, sans accès ni permission native
- **THEN** la preview décrit l’opération sans jeton et la restitution peut
  l’attester comme sans effet sur l’environnement

#### Scenario: Permission ou effet actif
- **WHEN** une permission, commande, écriture, accès actif ou effet incertain
  est observé
- **THEN** la restitution est refusée et aucune protection n’est libérée

### Requirement: Observations Code Mode bornées pour la récupération d’un bail
Un wrapper Code Mode MUST être attesté sans effet sur l’environnement uniquement
si son historique natif est complet, non tronqué et ne contient que des appels
CAB terminaux appartenant à une liste fermée sans effet. Un wrapper inconnu, une
méthode mutatrice ou une preuve absente MUST bloquer la restitution.

#### Scenario: Wrapper Code Mode d’observations autorisées
- **WHEN** l’historique natif complet montre un wrapper Code Mode non tronqué
  contenant uniquement des appels CAB explicitement autorisés, tous terminaux
- **THEN** ces observations ne bloquent pas la preuve d’absence d’effet

#### Scenario: Wrapper incomplet ou inconnu
- **WHEN** un wrapper est tronqué, incomplet ou appelle une méthode absente de
  la liste autorisée
- **THEN** la restitution est refusée et le bail reste `HELD`

### Requirement: Preview filtrée des blocages de récupération
La preview GET MUST rester en lecture seule, ne jamais révéler le jeton et
retourner un code de blocage ainsi que des états d’opérations filtrés lorsque
la preuve ne permet pas une restitution sûre.

#### Scenario: Preuve insuffisante dans la preview
- **WHEN** l’historique comporte une permission, un effet inconnu ou une
  méthode native non autorisée
- **THEN** la preview renvoie un blocage filtré sans argument ni sortie native
