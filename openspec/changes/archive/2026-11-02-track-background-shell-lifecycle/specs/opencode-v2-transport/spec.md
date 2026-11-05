## ADDED Requirements

### Requirement: Corrélation d’un shell natif background

CAB MAY accepter background=true uniquement pour un shell déclaré par
shell_background=true, avec once, tool_input_sha256 concordant, timeout positif
et port write réservé. Le shellID MUST venir du call natif lié à la session.
Le GET shell MUST vérifier id, location, commande, cwd et dates. Shell.Info
ne fournissant pas de session obligatoire, la liaison MUST venir de la chaîne
native, jamais d’un champ inventé.

#### Scenario: Start background natif corrélé

- **WHEN** la partie native approuvée fournit shellID et que GET shell retourne cet id, la commande, la location, le cwd et les dates concordants
- **THEN** CAB conserve la corrélation du processus sans traiter le lancement comme sa fin

### Requirement: Fin native d’un serveur background

Le verrou de ressource MUST rester détenu jusqu’à ce que `GET /api/shell/:id` ou
`shell.exited` fournisse un statut terminal corrélé au shellID et au start.
Un timeout sans shellID, un port fermé, l’absence d’une ligne dans `GET /api/shell`
ou une session idle MUST NOT prouver la fin d’une opération existante.

#### Scenario: Processus encore en cours

- **WHEN** le shell corrélé répond `status=running`
- **THEN** CAB garde l’accès du port et laisse progresser seulement les accès disjoints

#### Scenario: Timeout foreground historique sans shellID

- **WHEN** un appel foreground a `metadata.timeout=true` mais aucun shellID/exit corrélable
- **THEN** CAB conserve l’opération et l’accès `EXECUTING` sans `NO_EFFECT`, rejeu ou réattribution

#### Scenario: GET shell indisponible ou divergent

- **WHEN** la lecture du shell échoue, retourne 404, ou change session, commande, cwd, id ou révision
- **THEN** CAB garde les protections et ne clôt aucun accès
