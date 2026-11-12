## ADDED Requirements

### Requirement: Réconciliation propriétaire après archivage
Le propriétaire d’un RUN direct WORKING MUST pouvoir appeler run.reconcile_archive
avec project_id, run_id, archive_path et expected_framing_digest. Seuls les chemins
du change disparu MUST être remplacés par son archive datée canonique. La commande
MUST refuser un cadrage périmé, un autre change, une source encore présente, une
opération non terminale ou un bail détenu. Aucun autre champ métier n’est amendable.

#### Scenario: Archivage suivi d’un nouveau test
- **WHEN** le propriétaire soumet l’archive exacte d’un change déplacé et le digest courant
- **THEN** les chemins et la révision sont actualisés avec un événement d’audit, et une nouvelle requête distincte peut être admise

#### Scenario: Réconciliation répétée
- **WHEN** le même appel est répété après une réponse perdue
- **THEN** le résultat précédent est reconnu sans second amendement ou événement

#### Scenario: Protection des effets et identités
- **WHEN** une réconciliation est demandée alors qu’un effet est en cours ou inconnu
- **THEN** CAB refuse et conserve les protections ; les SID, RUN, génération, gel natif, métriques et reçus restent inchangés

### Requirement: Diagnostics MCP corrélés
Les appels MCP d’exécution et de lecture MUST conserver les codes d’erreur publics
et le request_id. Une réponse d’admission perdue MUST rester non confirmée ; une
lecture absente MUST être distinguée d’une opération UNKNOWN. Aucun diagnostic
MUST déclencher de retry d’exécution ou révéler des secrets.

#### Scenario: Reçu absent
- **WHEN** la lecture authentifiée retourne not-found
- **THEN** le client rapporte NOT_FOUND avec l’identité demandée sans relancer la commande

### Requirement: Amorçage CSRF unique du client Web
Le client Web MUST établir son premier cookie CSRF par une seule requête de
santé avant les lectures concurrentes et utiliser le cookie courant pour les
mutations. Il MUST conserver la protection CSRF et MUST NOT rejouer une mutation
après un refus. Ce correctif MUST rester indépendant du compte et de l’hôte.

#### Scenario: Première connexion après chargement parallèle
- **WHEN** les préférences et la santé sont demandées sans cookie préalable
- **THEN** un seul amorçage précède ces lectures et la connexion utilise le jeton correspondant au cookie courant
