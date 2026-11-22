## ADDED Requirements

### Requirement: Administration des agents et des clés API

CAB SHALL proposer les rappels existants sous les blocs d’agents de /administration/agents et conserver leur configuration. La navigation Agents SHALL donner accès à l’accueil, aux clés API, aux fournisseurs et aux modèles.

#### Scenario: Ajouter et retirer une clé

- **WHEN** un administrateur sélectionne un fournisseur enregistré et valide une clé saisie dans le panneau d’ajout
- **THEN** CAB persiste la clé avec le même chiffrement TPM que les jetons de forge
- **AND** la liste et les réponses de lecture ne retournent ni la clé ni son texte chiffré
- **AND** les quotas et crédits inconnus sont affichés sans valeur numérique et la clé peut être supprimée par sa corbeille

### Requirement: Catalogues des fournisseurs et enrichissement des modèles

CAB SHALL stocker les fournisseurs et leurs modèles dans PostgreSQL. CAB SHALL valider les listes facultatives de modèles, importer les formats OpenCode Go et OpenRouter et actualiser quotidiennement chaque source à un horaire aléatoire.

#### Scenario: Importer et compléter un catalogue

- **WHEN** l’URL de liste d’un fournisseur répond avec un catalogue valide
- **THEN** CAB enregistre les modèles liés à ce fournisseur avec leurs données communes et leurs métadonnées d’origine
- **AND** CAB récupère au moins quotidiennement https://models.dev/api.json et l’utilise pour compléter les champs manquants des modèles identifiés sans stocker le document intégral ni écraser les valeurs du fournisseur

#### Scenario: Échec de récupération

- **WHEN** une liste devient indisponible ou invalide
- **THEN** CAB conserve les derniers modèles valides
