## MODIFIED Requirements

### Requirement: Isoler les états privés des droits des fichiers projet
Les états privés du contrôleur et du superviseur et les reçus locaux SHALL
résider sous le profil d’exécution, hors projet, avec répertoires0700 et
fichiers0600. Les fichiers de projet SHALL ne pas être remis en0600 pour CAB.
Le root optionnel OC_Codex_RUNTIME_STATE_ROOT SHALL être absolu et hors projet.
Le broker conserve son stockage de profil déjà hors projet par défaut.

#### Scenario: Rejeu DIU en0775
- **GIVEN** les fichiers du projet normalisés en0775
- **WHEN** CAB persiste une validation ou une décision
- **THEN** il écrit son état privé hors projet et ne change pas le mode des fichiers du projet

#### Scenario: Recréation privée après migration sous umask de shell0002
- **GIVEN** les services lancés depuis un profil dont l’umask est0002
- **WHEN** un job ou état de supervision est recréé après migration
- **THEN** son mode reste0600 dans le répertoire privé0700 et le verrou public de projet reste0775

## ADDED Requirements

### Requirement: Continuer une validation restaurée après renotification identique
Une renotification identique SHALL préserver l’objet de validation et ses
marqueurs de reprise. Une validation PENDING restaurée SHALL rester indécise
et sans permission ;après approbation explicite, le contrôleur SHALL pouvoir
acquérir l’accès par les contrôles ordinaires et répondre à la permission
exacte une seule fois. Un conflit ou effet incertain SHALL garder sa protection.

#### Scenario: Permission non exclusive après migration et renotification
- **GIVEN** un PENDING restauré puis renotifié avec la même identité
- **WHEN** le propriétaire approuve et la permission native exacte apparaît
- **THEN** le contrôleur acquiert l’accès normal et journalise once, sans nouvelle demande ni réponse native par l’orchestrateur
