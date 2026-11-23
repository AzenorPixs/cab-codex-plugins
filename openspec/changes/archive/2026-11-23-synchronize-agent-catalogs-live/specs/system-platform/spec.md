## MODIFIED Requirements

### Requirement: Catalogues des fournisseurs et enrichissement des modèles

CAB SHALL stocker les fournisseurs et leurs modèles dans PostgreSQL. CAB SHALL valider les listes facultatives de modèles, importer les formats OpenCode Go et OpenRouter et actualiser quotidiennement chaque source à un horaire aléatoire. Les tableaux SHALL être alimentés par une projection PostgreSQL synchronisée par Electric.

#### Scenario: Importer et compléter un catalogue

- **WHEN** l’URL de liste d’un fournisseur répond avec un catalogue valide
- **THEN** CAB enregistre les modèles liés à ce fournisseur avec leurs données communes et leurs métadonnées d’origine
- **AND** CAB récupère au moins quotidiennement la source de complétion configurée et l’utilise pour compléter les champs manquants des modèles identifiés en conservant le document dans un fichier privé et en préservant les valeurs du fournisseur

#### Scenario: Échec de récupération

- **WHEN** une liste devient indisponible ou invalide
- **THEN** CAB conserve les derniers modèles valides

#### Scenario: Vérifier les empreintes avant réajustement

- **WHEN** le worker vérifie les catalogues ou reçoit un fichier validé
- **THEN** CAB compare d’abord les empreintes des fichiers locaux de tous les catalogues, dont la source de complétion, aux empreintes PostgreSQL
- **AND** seuls les changements d’empreinte validés déclenchent un réajustement des modèles
- **AND** une source configurée dont le fichier manque fait l’objet d’une tentative dès sa détection
- **AND** les téléchargements, vérifications et ajustements s’exécutent hors de la requête de lecture Web

#### Scenario: Administrer les fichiers

- **WHEN** un administrateur consulte un fournisseur ou le catalogue de complétion
- **THEN** CAB expose l’horodatage et la présence et validité du fichier, ainsi qu’une action de rafraîchissement qui indique l’activité
- **AND** un fichier présent et valide peut être consulté dans un Overview administrateur
- **AND** le fournisseur peut être édité et le bloc de complétion permet de configurer l’URL, avec https://models.dev/api.json par défaut

#### Scenario: Consulter les blocs Agents

- **WHEN** un administrateur ouvre la page Agents ou Administration → Agents
- **THEN** le témoin MCP et son information apparaissent sous le nom et la version de l’agent
- **AND** l’administration présente les réglages des rappels et de la complétion dans des blocs adaptés à la largeur disponible

