## ADDED Requirements

### Requirement: Conservation des identités logiques historiques
Le lecteur MUST conserver sans réécriture les clés logiques historiques des révisions, opérations et accès. La validation canonique des nouveaux environnements MUST rester appliquée à l'acquisition de test et avant permission native. Une ancienne clé historique MUST NOT donner une réservation ou permission nouvelle. Les protections des fichiers et alias physiques MUST rester conservées.

#### Scenario: Ancienne clé de navigateur terminée
- **WHEN** le registre contient browser:c14-headless-test-profiles dans des opérations COMPLETED et accès RELEASED
- **THEN** la restauration conserve les identifiants et preuves exacts, sans créer de réservation ni modifier l'historique

#### Scenario: Nouvelle acquisition non canonique
- **WHEN** un RUN tente de réserver cette ancienne clé comme environnement de test
- **THEN** l'acquisition reste refusée et aucune permission native n'est admise sans une réservation canonique détenue
