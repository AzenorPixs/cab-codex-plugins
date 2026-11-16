## ADDED Requirements

### Requirement: Réglages responsives partagés
CAB MUST fournir six profils de référence : mobile 390 px, tablette 768 px, HD 1366 px, Full HD 1920 px, QHD 2560 px et 4K 3840 px. Chaque profil MUST comporter deux multiplicateurs réglables de 50 à 150 %, l’un pour la taille générale de l’interface et l’autre pour les polices ; tous valent 100 % par défaut et conservent les comportements responsives existants. Entre deux références, les multiplicateurs MUST être interpolés linéairement et rester constants hors de la plage.

#### Scenario: Modification partagée entre pages
- **WHEN** un administrateur enregistre les pourcentages d’un profil
- **THEN** CAB les conserve en PostgreSQL et diffuse une projection limitée aux préférences d’interface via Electric ; les pages ouvertes les appliquent sans rechargement.

#### Scenario: Ancien client
- **WHEN** un client ancien enregistre le thème ou la police globale sans profils responsives
- **THEN** les profils préexistants sont conservés.
