## ADDED Requirements

### Requirement: Décision documentaire par état de pilotage
Le contrat distribué SHALL relier état observé, preuve requise, action propriétaire et référence canonique. Il SHALL distinguer décision, acquisition, émission native et fin métier, ainsi que projection et registre complet. Un cas inconnu SHALL préserver les protections et autoriser seulement les diagnostics et travaux indépendants déjà mandatés, sans autorisation inventée.

#### Scenario: APPROVED sans accès partagé
- **GIVEN** une décision approuvée, une permission corrélée et aucune exclusivité prouvée
- **WHEN** l’orchestrateur poursuit le mandat
- **THEN** il demande locks/acquire au contrôleur et exige HELD avant que le contrôleur puisse répondre once
- **AND** aucune nouvelle demande ou édition n’est créée pour cette seule acquisition

#### Scenario: Wrapper dynamique encore actif
- **GIVEN** des identifiants ou empreintes calculés dans un wrapper opaque sans métadonnées complètes
- **WHEN** l’admission n’est pas prouvée
- **THEN** les mêmes identifiants sont conservés et aucune décision n’est déduite d’un timeout
- **AND** les futurs mandats emploient des valeurs préparées avant une soumission littérale qualifiée

#### Scenario: Reprise qualifiée et lecture périmée
- **GIVEN** une procédure existante exigeant une lecture native fraîche
- **WHEN** cette lecture expire avant soumission de l’action
- **THEN** seule l’observation du même objet peut être renouvelée après préparation du cadrage, sans réémission métier ni changement d’un reçu existant

#### Scenario: État non répertorié
- **GIVEN** une combinaison non documentée ou des preuves contradictoires
- **WHEN** l’orchestrateur diagnostique le cas
- **THEN** il conserve les effets incertains et traite les unités indépendantes autorisées
- **AND** il distingue défaut technique à qualifier et décision métier hors périmètre réservée au développeur
