---
description: Déclencher et suivre la CI/CD du projet par CAB
version: 3.2.17
---

Répondre en français. Charger le skill `cicd` distribué avec le plugin `CICD`.
Argument utilisateur : `$ARGUMENTS` ; utiliser la version demandée et le RUN natif vérifié.
La livraison passe par `session_delivery_start`, puis `session_delivery_status`
sur la même version. CAB réalise Git et orchestre DIU ; conserver les reçus et
ne pas rejouer un effet incertain. L’absence de ces outils impose de signaler
le parcours indisponible, sans exécution Git ou CI/CD DIU de substitution.
