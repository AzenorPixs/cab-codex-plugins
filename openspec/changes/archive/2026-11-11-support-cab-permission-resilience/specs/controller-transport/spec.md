## MODIFIED Requirements

### Requirement: Isoler les états privés des droits des fichiers projet
Les états du contrôleur et du superviseur et les reçus locaux SHALL résider
sous le profil d’exécution, hors projet. Les nouveaux fichiers et répertoires
CAB SHALL être en 0770 ; les anciens modes compatibles SHALL rester lisibles.
Le root optionnel OC_Codex_RUNTIME_STATE_ROOT SHALL être absolu et hors projet.
Le broker conserve son stockage de profil déjà hors projet par défaut.

#### Scenario: Rejeu DIU en0775
- **GIVEN** les fichiers du projet normalisés en 0770
- **WHEN** CAB persiste une validation ou une décision
- **THEN** il écrit son état hors projet et ne change pas le mode des fichiers du projet

#### Scenario: Recréation privée après migration sous umask de shell0002
- **GIVEN** les services lancés avec un umask restrictif
- **WHEN** un job ou état de supervision est recréé après migration
- **THEN** ses nouveaux fichiers et répertoires CAB sont en 0770 et les anciens modes compatibles restent utilisables
