## Why
Le prévol divergent provoque actuellement une nouvelle session CAB et une purge. Le développeur demande de poursuivre dans la session du prévol fautif, avec les refus, preuves et contrôles CAB conservés.

## What Changes
- Conserver la candidate, le job, le RUN et le runtime après divergence du prévol.
- Ajouter retry explicite à /job/recover avec identifiants neufs et frontière native vérifiée.
- Garder le gel et tous les refus en cas de preuve absente, effet possible ou prévol non conforme.
- Harmoniser protocole, cadrages, tests et versions 0.87.2.

## Capabilities
### Modified Capabilities
- codex-integration-distribution : récupération sans renouvellement ni purge.
- controller-transport : retry explicite dans la candidate.
- persistent-job-supervision : continuité du job et de son suivi.

## Impact
Skill, référence de purge, commande CAB, ORCHESTRATED_CODING.md, contrôleur, tests de récupération/distribution, versions, PROJECT/TECHNICAL/BUILD/README/CHANGELOG. Le remplacement initial prévu par CISMP reste inchangé. Les trois changes historiques actifs restent intacts. Aucun déploiement, Git, service réel, dépendance ou édition de PROMPTS.

Le développeur a validé explicitement ce périmètre, son archivage et son rapport après présentation de la proposition SCM.
