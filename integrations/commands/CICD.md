---
description: Déclencher et suivre la CI/CD du projet par CAB
version: 3.36.0
---

Répondre en français. Charger le skill `cicd` distribué avec le plugin `CICD`.
Argument utilisateur : `$ARGUMENTS` ; respecter une version explicitement demandée.
Sinon le LLM de codage choisit avec discernement une version cohérente avec le
versionnement du projet en session directe, sans la redemander au développeur.
En session pilotée, l'orchestrateur choisit, déclare la version par
`session_delivery_select_version` puis la transmet au codeur ; ce dernier ne
peut pas substituer sa propre version. Utiliser le RUN natif vérifié.
La livraison passe par `session_delivery_start`, puis `session_delivery_status`
sur la même version. CAB réalise Git sur le seul change et construit puis publie ses artefacts ; conserver les reçus et
ne pas rejouer un effet incertain. L’absence de ces outils impose de signaler
le parcours indisponible, sans exécution Git ou CI/CD DIU de substitution.

Préparer les versions publiques avec `session_version_prepare` avant les tests
et le commit. Pour commits, constructions ou publications ponctuels/autorisés
ou de reprise, utiliser `session_effect` ; CAB porte effets, CAS, reçus et suivi.
Le LLM n'exécute pas Git. Une livraison partielle garde son identité/version ;
consulter le parcours open_recovery/resume du skill, sans nouveau start.
