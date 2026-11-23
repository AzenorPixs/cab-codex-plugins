## ADDED Requirements

### Requirement: Surveillance du cluster PostgreSQL CAB

CAB MUST inscrire le processus principal du cluster local configuré dans son registre. Si CAB tourne et que ce cluster est confirmé arrêté, il MUST essayer de démarrer uniquement cette unité, une seule fois par panne. Un arrêt manuel du cluster déclenche la même surveillance. Le succès MUST être confirmé par une requête SQL.

#### Scenario: Arrêt puis disponibilité

- **WHEN** le cluster CAB précédemment prêt est confirmé arrêté
- **THEN** CAB consigne son intention et essaie une fois de démarrer son unité
- **AND THEN** CAB enregistre un résultat horodaté et le publie dans les notifications dès que la base est disponible

### Requirement: Reprise des veilles inotify internes

CAB MUST essayer une seule reconstruction d’une veille inotify Git ou statistiques dont le descripteur est devenu indisponible. Le résultat MUST être horodaté et notifié. Un échec MUST NOT déclencher une boucle.

#### Scenario: Veille noyau perdue

- **WHEN** une lecture ou une inscription des veilles révèle un échec inotify
- **THEN** CAB reconstruit une fois les descripteurs et vérifie leur lecture avant d’annoncer le succès
