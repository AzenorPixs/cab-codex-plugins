## MODIFIED Requirements

### Requirement: Terminal isolé dans le détail d’une session CAB

Le détail d’un RUN MUST afficher le bloc de session sur toute la largeur disponible, sans panneau Terminal sur ordinateur et mobile. L’API du terminal MUST conserver ses contrôles d’accès et son isolation.

#### Scenario: Ouverture explicite

- **WHEN** un utilisateur autorisé ouvre le détail d’un RUN sur ordinateur ou mobile
- **THEN** le bloc de session occupe toute la largeur disponible
- **AND** la page ne présente aucun panneau Terminal et ne demande pas l’ouverture d’un shell

#### Scenario: Shell dans l’atelier

- **WHEN** un administrateur demande explicitement l’ouverture d’un terminal via l’API Web pour un RUN actif
- **THEN** CAB lie le terminal au RUN et à la session Web
- **AND** le shell interactif est root dans son espace de noms à partir d’un utilisateur hôte non privilégié
- **AND** le projet est consultable en lecture seule selon les protections de l’atelier, le réseau est isolé et la console possède un répertoire d’écriture dédié

#### Scenario: Fin et reprise

- **WHEN** le client ferme le terminal ou que le RUN se termine
- **THEN** CAB arrête le shell et libère le pseudo-terminal
- **AND** une perte de connexion ferme le terminal après une attente bornée et aucune console ne reprend automatiquement
