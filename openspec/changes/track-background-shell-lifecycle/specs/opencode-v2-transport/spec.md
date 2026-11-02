## ADDED Requirements

### Requirement: Corrélation d’un shell natif background

CAB MAY accepter `background=true` uniquement pour un shell natif exact, doté
d’une permission `once`, d’un `tool_input_sha256` concordant et d’une ressource
port en écriture réservée. Il MUST lier le shellID du résultat natif à son RUN,
opération, session, commande et workspace. Un shellID absent ou divergent MUST
laisser l’opération protégée.

#### Scenario: Start background natif corrélé

- **WHEN** le résultat natif complet indique status running et shellID, et que `GET /api/shell/:id` retourne la même session, commande, location et le statut running
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
