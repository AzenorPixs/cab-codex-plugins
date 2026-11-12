## ADDED Requirements

### Requirement: Runtimes publics lisibles par les clients
L’installation Debian MUST rendre les runtimes publics vérifiés utilisables par
les comptes clients non root : dossiers0755, fichiers0644 ou0755 lorsqu’ils sont
exécutables. Cette normalisation MUST être indépendante de l’umask et limitée au
staging public avant remplacement, sans suivre de lien ou toucher les états privés.

#### Scenario: Installation sous umask privée
- **WHEN** une archive publique contenant des modes restrictifs est installée sous umask0077
- **THEN** un autre UID peut importer les modules et lancer les exécutables publics, tandis que la configuration privée conserve ses droits

#### Scenario: Archive altérée
- **WHEN** l’empreinte de l’archive ne correspond pas au manifeste
- **THEN** l’installation refuse avant extraction et conserve le runtime existant
