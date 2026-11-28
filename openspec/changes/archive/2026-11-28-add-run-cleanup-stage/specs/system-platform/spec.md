## ADDED Requirements

### Requirement: Restitution des ressources propres au RUN

CAB MUST nettoyer uniquement les répertoires temporaires dont l’identité et l’attribution au RUN sont établies. CAB MUST préserver les preuves durables, les autres RUN et une ressource dont une opération reste active ou indéterminée.

#### Scenario: Banc réservé et inutilisé
- **WHEN** le RUN détient un banc sans activité
- **THEN** CAB le restitue automatiquement.

#### Scenario: Banc utilisé sans vérification du nettoyage
- **WHEN** les reçus distincts de nettoyage et de vérification corrélés au banc et postérieurs à sa dernière utilisation manquent
- **THEN** CAB le garde protégé et la validation du Nettoyage attend la preuve ou la réconciliation de l’effet. Le codeur fournit et fait exécuter par CAB les opérations dépendantes du contenu du test.

#### Scenario: Atelier identifié et verrous de la session
- **WHEN** les opérations sont terminées et l’atelier appartient au RUN
- **THEN** CAB nettoie l’atelier et libère les verrous de fichiers vérifiés dont le RUN est titulaire.
- **AND** la restitution conserve le contenu préparé dans l’index Git de session et ne rend aucune réservation d’un pair.
