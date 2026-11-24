## ADDED Requirements

### Requirement: Terminal isolé dans le détail d’une session CAB

Le détail d’un RUN MUST occuper la largeur disponible. Il MUST afficher
la vue de session avec une police réduite à gauche et le terminal à droite.
Sur écran étroit, les deux zones MUST s’empiler.

#### Scenario: Ouverture explicite

- **WHEN** un administrateur ouvre le détail d’un RUN
- **THEN** CAB affiche la commande d’ouverture et ne démarre aucun shell
- **AND** un clic explicite sur un RUN actif ouvre un terminal lié au RUN et à sa session Web

#### Scenario: Shell dans l’atelier

- **WHEN** le terminal est ouvert
- **THEN** le shell interactif est root dans son espace de noms à partir d’un utilisateur hôte non privilégié
- **AND** le projet est consultable en lecture seule selon les protections de l’atelier, le réseau est isolé et la console possède un répertoire d’écriture dédié

#### Scenario: Fin et reprise

- **WHEN** l’administrateur ferme la console, quitte la page ou que le RUN se termine
- **THEN** CAB arrête le shell et libère le pseudo-terminal
- **AND** une perte de connexion ferme le terminal après une attente bornée et aucune console ne reprend automatiquement
