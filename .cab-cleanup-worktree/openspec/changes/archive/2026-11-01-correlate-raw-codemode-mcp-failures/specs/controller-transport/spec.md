## MODIFIED Requirements

### Requirement: Corrélation exacte d'une erreur native CodeMode

Le contrôleur MUST accepter une notification de validation comme corrélée
lorsque le transcript contient soit un unique `request_validation` CodeMode
littéral normalisé, marqué `cabCodeMode.nativeMcpError`, soit un wrapper
`execute` natif V2 brut complet attestant un unique appel final
`cgpt-validation.request_validation` en erreur. Dans les deux cas, l'identité
entière doit correspondre exactement à la notification reçue. La voie brute
exige `executed=false`, `metadata.error=true`, `metadata.truncated=false` et
seulement cet appel, éventuellement précédé d'un unique appel `search` terminé.
Cette corrélation MUST NOT créer ou modifier une décision, une permission ou
un `once`.

#### Scenario: Erreur MCP après persistance du request

- **WHEN** la notification broker vise une demande exacte et que le CodeMode natif de la même session atteste l'appel unique `request_validation` en erreur, normalisé ou prouvé par le transcript brut complet
- **THEN** le contrôleur corrèle la notification sous les gardes existantes et laisse la demande décidable selon le protocole normal

#### Scenario: Identité ou marqueur divergents

- **WHEN** l'identité diffère, le marqueur normalisé ou la preuve brute complète est absent, l'appel est multiple ou le transcript n'est pas un CodeMode natif
- **THEN** le contrôleur refuse `native-validation-not-correlated` sans décision ni permission

#### Scenario: Ancienne demande NOT_ADMITTED

- **WHEN** le client interroge une demande antérieure déjà `NOT_ADMITTED`
- **THEN** CAB conserve son état terminal et exige un identifiant neuf pour une demande future

#### Scenario: Wrapper CodeMode dynamique attesté par les métadonnées natives

- **WHEN** le code du wrapper ne peut pas être normalisé, mais le transcript natif complet atteste un unique appel exact `request_validation` en erreur, éventuellement précédé d'une recherche achevée
- **THEN** le contrôleur corrèle la notification sous les gardes existantes et ne crée aucune permission

#### Scenario: Appel supplémentaire, identité divergente ou preuve incomplète

- **WHEN** le wrapper contient un autre appel, plusieurs demandes, une identité divergente, une erreur ou troncature non prouvée, ou n'est pas un `execute` natif non exécuté
- **THEN** le contrôleur refuse `native-validation-not-correlated` sans décision ni permission
