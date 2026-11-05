## ADDED Requirements

### Requirement: Filesystem fallback lié au RUN armé

Le contrôleur MUST exposer les routes `/runs/<run_id>/source/read`, `/source/list` et `/source/find`. Il MUST dériver la session et le répertoire du RUN réservé et du job armé ; les identités fournies par l'appelant MUST NOT élargir cette portée.

#### Scenario: Routes propres au RUN armé

- **WHEN** un RUN réservé possède un job armé
- **THEN** les routes filesystem sont liées à sa session et à son répertoire natifs exacts

### Requirement: Fallback filesystem interdit pendant une activité

Le contrôleur MUST refuser la lecture si un mandat, effet, validation indécise, permission native, activité OpenCode, transition ou récupération est en cours. Il MUST revérifier la frontière après l'appel et invalider le résultat si elle a changé.

#### Scenario: RUN non quiescent ou identité divergente

- **WHEN** une activité, permission, transition ou divergence de session/location apparaît avant ou pendant l'appel
- **THEN** le contrôleur refuse le résultat et ne change ni le RUN, ni ses accès, ni ses permissions

### Requirement: Fallback filesystem sans effet métier

Les routes et helpers MUST rester read-only. Ils MUST NOT créer, modifier ou libérer accès, réservation, mandat, décision, permission ou état métier.

#### Scenario: Le modèle ne dispose pas d'outil natif de lecture

- **WHEN** l'orchestrateur doit lire une source mais le modèle de codage n'expose pas `read`, `search` ou `glob`
- **THEN** il peut utiliser le helper CAB read-only lié au RUN et MUST NOT remplacer cette lecture par `shell`, `execute`, `edit` ou `write`
