---
description: Déclencher et suivre la CI/CD du projet par CAB
version: 3.4.2
---

Répondre en français. Charger le skill `cicd` distribué avec le plugin `CICD`.
Argument utilisateur : `$ARGUMENTS` ; respecter une version explicitement demandée.
Sinon le LLM de codage choisit avec discernement une version cohérente avec le
versionnement du projet en session directe, sans la redemander au développeur.
En session pilotée, l'orchestrateur choisit, déclare la version par
`session_delivery_select_version` puis la transmet au codeur ; ce dernier ne
peut pas substituer sa propre version. Utiliser le RUN natif vérifié.
La livraison passe par `session_delivery_start`, puis `session_delivery_status`
sur la même version. CAB réalise Git sur le seul change et construit ses artefacts. DIU publie les artefacts ; conserver les reçus et
ne pas rejouer un effet incertain. L’absence de ces outils impose de signaler
le parcours indisponible, sans exécution Git ou CI/CD DIU de substitution.
