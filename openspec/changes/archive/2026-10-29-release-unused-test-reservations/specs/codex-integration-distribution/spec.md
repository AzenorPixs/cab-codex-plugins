## ADDED Requirements

### Requirement: Distribution de la restitution sans effet 2.1.13
Le jeu source MUST aligner les composants, plugins et commandes sur 2.1.13 et documenter release-unused, ses preuves, son attestation explicite, ses limites et la priorité du nettoyage après mutation. Les tests MUST qualifier les parcours positifs et négatifs isolés, la persistance et la conservation des anciennes gardes. La préparation source MUST NOT modifier les RUN ni activer les briques installées.

#### Scenario: Livraison source et runtime séparés
- **WHEN** les sources 2.1.13 sont qualifiées et archivées
- **THEN** l’activation reste distincte et aucune réservation réelle n’est libérée par la qualification

### Requirement: Compatibilité des reçus sans effet
Les anciens registres sans reçu MUST rester lisibles. Un lecteur ancien ne comprenant pas le reçu enrichi MUST le refuser sans perte de preuve ; une restauration antérieure MUST NOT être utilisée pour effacer ce reçu.

#### Scenario: Retour vers un lecteur ancien
- **WHEN** le registre contient un reçu unused-no-effect inconnu du lecteur
- **THEN** ce lecteur refuse le registre plutôt que d’ignorer la nouvelle preuve
