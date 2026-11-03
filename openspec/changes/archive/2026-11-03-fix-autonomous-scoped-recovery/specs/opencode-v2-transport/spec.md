## ADDED Requirements

### Requirement: Reçu durable d’un refus natif programmatique

Le client CAB MUST conserver pour reject une intention privée avant POST et un ACK après HTTP204, avec identités natives et digests sans commandes ni secrets. Une intention sans ACK MUST rester indéterminée et MUST NOT rejouer le POST. Une réponse déjà confirmée MAY être relue sans effet. Un échec de journalisation après ACK MUST distinguer la réponse confirmée de sa persistance manquante.

#### Scenario: Réponse perdue après un refus
- **WHEN** un ACK durable existe pour la même permission et le même scope
- **THEN** sa relecture ne renvoie aucune nouvelle réponse native

#### Scenario: Intention seule après crash
- **WHEN** le journal contient l’intention sans confirmation
- **THEN** le client expose l’issue indéterminée sans second POST
