## ADDED Requirements

### Requirement: Lire un registre historique à la borne du stockage runtime
Le précontrôle CABU SHALL lire le registre historique avec le lecteur JSON
runtime borné à64Mio, en conservant les contrôles de fichier régulier,
absence de lien, encodage et identité. Il SHALL ne pas appliquer la limite4Mio
des artefacts à ce registre ni relever les limites des réponses HTTP.

#### Scenario: Registre disque plus volumineux que son snapshot HTTP
- **GIVEN** un registre disque valide de plus de16Mio mais inférieur à64Mio et son snapshot HTTP cohérent
- **WHEN** la migration est préparée
- **THEN** le précontrôle accepte sa lecture et conserve la même migration protégée, sans changer les fichiers historiques
