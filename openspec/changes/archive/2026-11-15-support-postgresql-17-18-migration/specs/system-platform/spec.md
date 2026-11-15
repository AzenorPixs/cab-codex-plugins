## ADDED Requirements

### Requirement: PostgreSQL multi-majeur
CAB MUST prendre en charge PostgreSQL 17 et 18. Son paquet MUST dépendre de
postgresql et postgresql-common. La référence de version et de cluster MUST
être persistée sous /etc/cab indépendamment de DIU. L'amorçage Web MUST choisir
la version supportée fournie par Debian sans créer de base avant validation.

#### Scenario: Installation Forky
- **WHEN** le premier parcours Web est validé sur une machine fournie en PG18
- **THEN** le cluster CAB utilise PG18 et sa référence est enregistrée

### Requirement: Migration majeure protégée
CAB MUST comparer au démarrage la référence, le serveur réel et la cible Debian.
Un écart MUST déclencher une qualification puis migration du seul cluster cab,
avec sauvegarde et reçu durable. CAB MUST vérifier l'intégrité avant adoption
et conserver l'ancien cluster, les SID/RUN et reçus, sans rejouer les opérations.

#### Scenario: Passage de PG17 à PG18
- **WHEN** la cible Debian installée devient PG18 et le cluster CAB est en PG17
- **THEN** CAB sauvegarde et migre à frontière sûre, vérifie les données et reprend Electric

#### Scenario: Migration interrompue
- **WHEN** CAB retrouve un reçu de migration non terminal après dispatch
- **THEN** les deux clusters et les preuves restent conservés et aucun effet n'est rejoué

### Requirement: Frontière et reprise PostgreSQL
Un effet indécis ou un client actif MUST interdire la bascule PostgreSQL.
Une migration interrompue MUST NOT être réémise automatiquement. Electric MUST
reconstruire son flux après une migration logique sans ancienne projection.

#### Scenario: Opération protégée
- **WHEN** une opération possède un reçu UNKNOWN non réconcilié
- **THEN** la migration est refusée et ce reçu demeure intact
