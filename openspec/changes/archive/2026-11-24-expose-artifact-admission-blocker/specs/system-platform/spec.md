## ADDED Requirements

### Requirement: Diagnostic de l’admission des artefacts

CAB MUST conserver l’exclusion des opérations d’artefact incompatibles pour un même projet. La Fabrique MUST distinguer une demande refusée d’une construction lancée et afficher le reçu, l’origine, l’état et l’horodatage de l’opération bloquante quand ces données sont connues.

#### Scenario: Une publication bloque une construction

- **WHEN** une construction est refusée par une publication active ou incertaine du projet
- **THEN** le diagnostic indique la forge, le reçu de publication et son état, distincts de la demande de construction.

#### Scenario: Refus certain de lancement du worker

- **WHEN** le système refuse le lancement du worker avant toute exécution de la construction ou de la publication
- **THEN** CAB enregistre FAILED avec la preuve du non-lancement et admet une demande ultérieure.
- **AND WHEN** le résultat d’un effet lancé est indéterminé
- **THEN** CAB conserve la protection du reçu incertain.

#### Scenario: Réconciliation visible d’une publication Docker

- **WHEN** sur Forgejo, GitHub ou GitLab un reçu UNKNOWN indique une confirmation du registre indéterminée après l’envoi
- **THEN** l’Overview de la forge permet de vérifier les tags distants du même reçu et les boutons de publication concernés mentionnent le verrou.
- **AND THEN** CAB ne libère la protection que lorsque les tags pointent vers l’image locale attendue et vers l’identité enregistrée au moment du plan lorsqu’elle existe. La vérification n’envoie ni ne supprime aucun artefact.

#### Scenario: Réconciliation autonome des reçus avec une empreinte prouvée

- **WHEN** CAB possède l’image et le tag enregistrés avant envoi et le reçu prouve que seul le résultat de la confirmation est indéterminé
- **THEN** CAB vérifie de lui-même les tags distants sur Forgejo, GitHub ou GitLab, avec une reprise bornée sur le même reçu en cas de refus temporaire.
- **AND THEN** un résultat divergent ou une preuve insuffisante conserve la protection. Les reçus historiques sans empreinte enregistrée restent accessibles à la vérification explicite de l’Overview.
