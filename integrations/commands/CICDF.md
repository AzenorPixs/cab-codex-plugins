---
description: Livrer tous les changements du projet par CAB
version: 3.9.6
---

Répondre en français. Charger le skill `cicdf` du plugin `CICDF`.
Respecter la version éventuelle dans `$ARGUMENTS` et les règles du choix de version CICD. Déclencher `session_delivery_full_start` depuis le RUN vérifié puis lire le même reçu avec `session_delivery_status`.

Préparer les versions publiques avec `session_version_prepare` avant les tests
et le commit. Pour commits, constructions ou publications ponctuels/autorisés
ou de reprise, utiliser `session_effect` ; CAB porte effets, CAS, reçus et suivi.
Le LLM n'exécute pas Git. Une livraison partielle garde son identité/version ;
consulter le parcours open_recovery/resume du skill, sans nouveau start.
