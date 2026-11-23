## ADDED Requirements

### Requirement: Réconciliation du périphérique du journal natif
CAB MUST permettre la réconciliation du numéro de périphérique dans le RUN actif existant en conservant le SID, la génération, l’ancienne identité du journal et les preuves. CAB MUST vérifier le chemin, le propriétaire, l’inode, l’en-tête et l’index natif. CAB MUST NOT résoudre une opération incertaine par ce parcours.

#### Scenario: Journal du même RUN après redémarrage
- **WHEN** l’administrateur réconcilie le périphérique du journal indexé d’un RUN en finalisation
- **THEN** CAB enregistre l’identité actuelle et conserve l’état et les preuves du RUN

#### Scenario: Journal différent
- **WHEN** le chemin, le propriétaire ou l’inode diffère
- **THEN** CAB refuse la réconciliation de périphérique

### Requirement: Réservation directe d’un fichier préexistant cadré
Le propriétaire d’un RUN direct MUST pouvoir réserver un fichier modifié du périmètre déclaré sans accord administratif ni reçu d’admission séparé. CAB MUST tracer la réservation et respecter les réservations actives des autres sessions. En piloté, l’orchestrateur conserve son autorité.

#### Scenario: Fichier modifié déjà dans le cadre
- **WHEN** le propriétaire d’un RUN direct réserve un fichier préexistant cadré sans réservation étrangère
- **THEN** CAB admet le fichier et conserve la baseline

#### Scenario: Fichier détenu par une autre session
- **WHEN** une autre session détient déjà une réservation sur le chemin
- **THEN** CAB refuse la réservation concurrente
