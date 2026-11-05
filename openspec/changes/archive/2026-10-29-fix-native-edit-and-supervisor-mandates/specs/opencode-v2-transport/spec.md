## ADDED Requirements

### Requirement: Catalogue natif distinct du catalogue MCP

La qualification OpenCode 2.2 MUST identifier les outils et schémas réellement transmis au modèle par un fournisseur synthétique isolé. Le protocole CAB MUST distinguer ce catalogue natif du résultat search Code Mode, des permissions et du prompt. Un résultat search vide MUST NOT prouver l’absence d’un outil natif.

#### Scenario: Recherche MCP vide
- **WHEN** search ne trouve aucun edit dans le catalogue MCP
- **THEN** le diagnostic conserve la disponibilité native comme non établie jusqu’à l’examen du catalogue transmis au modèle

### Requirement: Édition partielle native qualifiée

CAB MUST qualifier le mécanisme d’édition partielle réellement proposé par OpenCode 2.2 avant de le recommander. La qualification MUST corréler cible unique, schéma natif, ask, décision explicite, once et fin vérifiée. Une cible divergente, une demande refusée ou un remplacement ambigu MUST NOT produire une édition approuvée implicitement. Le protocole MUST NOT inventer un outil à partir du seul prompt.

#### Scenario: Remplacement ciblé approuvé
- **WHEN** l’outil natif disponible reçoit un remplacement unitaire exact et une décision CAB corrélée
- **THEN** la permission once propre et le contenu final du seul fichier démontrent l’édition partielle

#### Scenario: Refus et ambiguïté
- **WHEN** l’opération est refusée ou son remplacement n’est pas univoque
- **THEN** aucune écriture correspondante n’est constatée et aucun succès n’est déduit du texte du modèle

### Requirement: Isolation de la lecture des permissions par session

Le client MAY restreindre une lecture de permissions à une session explicitement identifiée avant la validation des cibles natives. Une permission identifiée comme étrangère MUST NOT empêcher ce contrôle ciblé ni être répondue par ce contrôle. Une identité manquante ou une permission propre malformée MUST rester bloquante. La lecture globale MUST conserver sa validation stricte.

#### Scenario: Permission étrangère multirésource
- **WHEN** un contrôle vise la session A et que la session B possède une permission shell multirésource
- **THEN** le contrôle valide les seules permissions de A sans répondre à B ni affaiblir le contrôle de ses cibles

#### Scenario: Permission propre ou identité ambiguë
- **WHEN** une permission propre a une cible invalide ou qu’une permission ne peut être attribuée à une session
- **THEN** le contrôle ciblé échoue explicitement sans autorisation

### Requirement: Métriques natives V2 distinctes des métadonnées libres

Le client MUST exposer les tokens et coûts natifs V2 valides dans le message normalisé, avec leur provenance. Une valeur absente MUST rester inconnue ; une valeur malformée MUST NOT devenir une mesure valide. Les métadonnées libres MUST NOT fabriquer une mesure native. La documentation des sondes MUST distinguer session.text.delta de session.reasoning.delta et calculer les durées seulement sur les événements corrélés observés.

#### Scenario: Mesures natives présentes
- **WHEN** un message assistant V2 fournit ses tokens et son coût natifs valides
- **THEN** le client conserve ces mesures sans reconstruction et les distingue des métadonnées du modèle

#### Scenario: Mesures absentes ou falsifiées
- **WHEN** seules des métadonnées libres contiennent des tokens ou un coût, ou que les valeurs natives sont absentes ou invalides
- **THEN** aucune mesure native n’est inventée et les mesures indisponibles restent explicitement inconnues



### Requirement: Projection des erreurs MCP natives V2

CAB MAY projeter l’erreur d’un unique request_validation ou get_approval retourné directement par execute. La fin native MUST porter metadata.error vrai, truncated faux et un seul toolCalls en erreur dont le nom et les arguments concordent. CAB MUST dériver sa marque de provenance de cette enveloppe et MUST NOT accepter une marque fabriquée dans les métadonnées libres. Cette projection MUST NOT constituer une décision ni une preuve d’absence d’effet à elle seule.

#### Scenario: Erreur native concordante
- **WHEN** l’enveloppe complète qualifiée concorde avec l’unique appel autorisé
- **THEN** CAB expose son erreur et son empreinte natives sans déduire une approbation ou un retry admissible

#### Scenario: Texte seul ou appel caché
- **WHEN** seule une chaîne d’erreur est fournie, les métadonnées divergent ou un autre appel est présent
- **THEN** CAB conserve une enveloppe bloquante sans provenance d’erreur qualifiée

## MODIFIED Requirements

### Requirement: Version majeure CAB 2.0.0 uniforme
Le paquet CAB, le broker, tous les scripts, commandes, plugins, skills, unités et moniteur distribués MUST annoncer la version de base courante commune fixée par codex-integration-distribution. Les deux manifestes de plugin MAY ajouter un cachebuster après cette version. Aucune brique active ne MUST annoncer une version de base 1.x.

#### Scenario: Vérification des versions distribuées
- **WHEN** les artefacts source et les deux manifestes de plugin sont inspectés
- **THEN** toutes les briques annoncent la base courante commune `2.1.10` et les manifestes conservent leur cachebuster propre

#### Scenario: Faux succès HTML
- **WHEN** une route API répond HTTP 200 avec HTML, du JSON malformé ou un schéma divergent
- **THEN** CAB refuse la réponse comme `opencode-v2-response-invalid` et ne marque aucune source saine


