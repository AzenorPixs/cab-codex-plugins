## MODIFIED Requirements

### Requirement: Tokens observés du cycle de session

CAB MUST conserver dans une table PostgreSQL les comptes entiers de tokens entrants, sortants, lus dans le cache et écrits dans le cache, associés au projet, au change, à la session et au RUN. Il MUST distinguer le codeur et l’orchestrateur et conserver une mesure native une seule fois.

#### Scenario: Cumul par rôle

- **WHEN** une mesure native est attribuable à une action d’une étape du cycle
- **THEN** elle contribue au cumul de cette action, de son étape, de l’itération, de la session et du change, sous le même rôle
- **AND** la répétition de la collecte ne modifie pas les cumuls

#### Scenario: Mesure absente ou attribution partielle

- **WHEN** le compteur natif manque ou son attribution à une action est ambiguë
- **THEN** CAB laisse le compteur indisponible à la granularité non mesurée et conserve la contribution aux niveaux attestés

#### Scenario: Relecture d’une mesure historique

- **WHEN** CAB relit une source native déjà persistée
- **THEN** la mesure conserve son identité et ses cumuls ne sont comptés qu’une fois
- **AND** Tw reste indisponible lorsque la valeur native est absente

#### Scenario: Actualisation des compteurs

- **WHEN** une mesure observée est persistée
- **THEN** les tableaux concernés et Résumé se mettent à jour via Electric
- **AND** Résumé expose la durée et les quatre compteurs du dernier cycle et le cumul de tous les cycles
- **AND** les tableaux utilisent Te, Ts, Tr et Tw et ajoutent les quatre compteurs de l’orchestrateur en mode piloté
- **AND** la présentation emploie K, M ou B selon le seuil et au plus deux décimales

### Requirement: Disposition des cumuls du cycle de session

CAB MUST afficher le cumul des tokens entrants, sortants, lus dans le cache et écrits dans le cache dans le même encadré que les durées de chaque étape. Résumé MUST afficher le libellé « Totale de tous les cycles » en gras, la durée et les quatre cumuls sur une même ligne logique. Résumé MUST omettre la ligne « Total de la session ».

#### Scenario: Encadré d’étape sur ordinateur et mobile

- **WHEN** le détail d’une étape observée est affiché
- **THEN** les tokens cumulés de l’étape s’affichent à droite des durées si la largeur disponible le permet
- **AND** sur écran étroit ils s’affichent sous les durées dans le même encadré

#### Scenario: Informations et détail des étapes indisponible

- **WHEN** une session est ouverte dans Informations
- **THEN** les lignes « Tokens Entrant total des cycles », « Tokens Sortant total des cycles », « Tokens lus dans le cache total des cycles » et « Tokens écrits dans le cache total des cycles » suivent la durée totale d’attente
- **AND** elles exploitent la synthèse du RUN actualisée par Electric même si le détail des étapes est indisponible
- **AND** les contributions des deux rôles sont identifiables en session pilotée
