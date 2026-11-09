## ADDED Requirements

### Requirement: Droits compatibles DIU pour la clé HMAC locale
Le broker SHALL accepter une clé HMAC locale régulière de 32 octets, à lien unique et appartenant au processus, sans aucun droit pour les autres comptes. Des droits de groupe MAY être acceptés lorsque le groupe est celui du répertoire parent appartenant au même utilisateur et fait partie des groupes du processus. Les clés privées existantes SHALL rester compatibles. Les nouvelles clés SHALL être créées en 0770.

#### Scenario: Clé normalisée pour le groupe autorisé
- **WHEN** DIU applique 0770 à une clé dont les identités fichier, parent et groupe sont qualifiées
- **THEN** le broker peut authentifier le journal sans exposer la clé aux autres comptes

#### Scenario: Droits ou identité non qualifiés
- **WHEN** la clé accorde des droits aux autres comptes, est liée, a une identité ou taille incorrecte, ou utilise un groupe non autorisé
- **THEN** le broker refuse la clé sans modifier le journal
