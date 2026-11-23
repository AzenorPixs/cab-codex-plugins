# Reprendre une livraison échouée avant son commit

## Why
Une session dont l’index date d’une ancienne version peut rencontrer un conflit de version après des livraisons concurrentes. CAB conserve correctement PARTIAL mais ne propose aucune reprise du même reçu ; refaire start ne résout rien et rejouer la mutation de version serait incorrect.

## What Changes
- Inspection administrative et reprise CAS du seul commit non dispatché, sur la même livraison, le même RUN/SID et la même version.
- Résolution automatique limitée aux scalaires de version déclarés lorsque tout autre contenu et le mode correspondent à HEAD.
- Résolutions de code uniquement explicites, chemin/blob/mode/diff exacts relus par propriétaire et responsable, avec références d’approbation.
- Nouvelle tentative corrélée, échec original conservé ; étapes version/projection jamais réémises, UNKNOWN protégé.
- Revérification sous le verrou Git avant tout effet et continuation des seules étapes aval jamais émises.

## Impact
session_delivery, helper de reprise, protocole et tests. Aucune migration, dépendance, modification de core/api.py ou règle spécifique à un projet. Le bootstrap temporaire reste un procédé d’activation distinct de la livraison durable.
