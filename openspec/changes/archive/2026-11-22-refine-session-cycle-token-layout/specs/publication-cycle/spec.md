## ADDED Requirements

### Requirement: Disposition des cumuls du cycle de session

CAB MUST afficher le cumul des tokens entrants, sortants et lus depuis le cache dans le même encadré que les durées de chaque étape. Résumé MUST afficher le libellé « Totale de tous les cycles » en gras, la durée et les trois cumuls sur une même ligne logique. Résumé MUST omettre la ligne « Total de la session ».

#### Scenario: Encadré d’étape sur ordinateur et mobile

- **WHEN** le détail d’une étape observée est affiché
- **THEN** les tokens cumulés de l’étape s’affichent à droite des durées si la largeur disponible le permet
- **AND** sur écran étroit ils s’affichent sous les durées dans le même encadré

#### Scenario: Informations et détail des étapes indisponible

- **WHEN** une session est ouverte dans Informations
- **THEN** les lignes « Tokens Entrant total des cycles », « Tokens Sortant total des cycles » et « Tokens en Cache total des cycles » suivent la durée totale d’attente
- **AND** elles exploitent la synthèse du RUN actualisée par Electric même si le détail des étapes est indisponible
- **AND** les contributions des deux rôles sont identifiables en session pilotée
