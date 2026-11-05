## ADDED Requirements

### Requirement: Provenance des erreurs MCP natives directes

CAB MAY reconnaître une erreur directe de request_validation ou get_approval seulement depuis une partie tool assistant portant executed faux, status error, un objet error de type tool.execution, un itemId natif lié au callID et des temps natifs complets ordonnés. La provenance et son empreinte MUST être dérivées de la partie complète ; les marqueurs libres MUST être supprimés. Cette provenance MUST NOT suffire à autoriser un retry.

#### Scenario: Partie directe qualifiée
- **WHEN** la partie native satisfait toutes les gardes et identifie exactement l’un des deux outils
- **THEN** le client conserve son erreur, son identité et son empreinte qualifiées sans décision implicite

#### Scenario: Provenance absente ou falsifiée
- **WHEN** l’erreur est un texte libre, l’identité diverge, les temps sont absents ou un marqueur libre est fourni
- **THEN** aucune provenance native directe qualifiée n’est attribuée

### Requirement: Pagination de messages adaptative sous plafond constant

Le client MUST conserver le plafond de réponse existant. Sur opencode-response-too-large seulement, il MAY réduire de moitié la limite de la même page jusqu’à un minimum de un, sans conserver de réponse partielle ni avancer le curseur. Curseurs, ordre, enveloppes et borne de pages MUST rester contrôlés. Un message unique dépassant le plafond MUST échouer explicitement. Les autres erreurs MUST NOT déclencher une réduction ou un faux succès.

#### Scenario: Page agrégée trop grande
- **WHEN** la page demandée dépasse le plafond mais une page plus petite respecte la limite
- **THEN** le client suit les pages complètes et les curseurs jusqu’à la fin, sans troncature ni duplication

#### Scenario: Un seul message dépasse le plafond
- **WHEN** une page de un dépasse encore la limite
- **THEN** la lecture échoue explicitement sans résultat partiel

#### Scenario: Curseur ou erreur divergents
- **WHEN** un curseur se répète, une page est invalide ou une erreur différente survient
- **THEN** le contrôle existant échoue sans réessai adaptatif non autorisé

## MODIFIED Requirements

### Requirement: Version majeure CAB 2.0.0 uniforme
Le paquet CAB, le broker, tous les scripts, commandes, plugins, skills, unités et moniteur distribués MUST annoncer la version de base courante commune fixée par codex-integration-distribution. Les deux manifestes de plugin MAY ajouter un cachebuster après cette version. Aucune brique active ne MUST annoncer une version de base 1.x.

#### Scenario: Vérification des versions distribuées
- **WHEN** les artefacts source et les deux manifestes de plugin sont inspectés
- **THEN** toutes les briques annoncent la base courante commune `2.1.11` et les manifestes conservent leur cachebuster propre

#### Scenario: Faux succès HTML
- **WHEN** une route API répond HTTP 200 avec HTML, du JSON malformé ou un schéma divergent
- **THEN** CAB refuse la réponse comme `opencode-v2-response-invalid` et ne marque aucune source saine


