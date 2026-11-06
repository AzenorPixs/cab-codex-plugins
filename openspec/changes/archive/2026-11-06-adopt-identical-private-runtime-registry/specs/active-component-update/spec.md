## ADDED Requirements

### Requirement: Adoption d’un registre privé identique sans manifeste
CABU MAY adopter un registre privé préexistant sans manifeste uniquement si
son SHA256 des octets égale la source validée et capturée dans le même reçu.
Les fichiers runtime connus préexistants SHALL être identiques à cet inventaire.
Toute divergence SHALL préserver source et cible sans écrasement ni purge.
Le refus de collision SHALL rester le défaut hors de cette récupération prouvée.

#### Scenario: Copie privée identique déjà présente
- **WHEN** la source et les fichiers privés sûrs correspondent à l’inventaire validé du reçu
- **THEN** le manifeste est établi, les octets existants restent intacts et la même migration reprend de manière idempotente

#### Scenario: Cible étrangère, source modifiée ou preuve absente
- **WHEN** une empreinte, un propriétaire, un mode, un chemin ou l’inventaire ne correspond pas à la preuve attendue
- **THEN** CABU refuse avant adoption et conserve les deux états et le reçu non terminal
