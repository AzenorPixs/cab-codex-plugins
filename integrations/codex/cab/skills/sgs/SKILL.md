---
name: sgs
description: Produire ou consulter les rapports SGS des changes sans reconstruire implicitement le global.
---

# SGS 3.0.4

Résoudre SGS.md depuis DEVOPS.md et appliquer son contrat. Le moteur commun
est `/usr/bin/cab sgs` ; VERSION est sans effet. En session, utiliser CHANGE
avec preuves sur stdin, puis DELTA pour le global existant. Conserver les six
sections et les N/A motivés ; distinguer les métriques natives des déclarations.
Ne lancer REBUILD que pour une demande manuelle explicite SGS. Un registre
incompatible est conservé ; ne pas le reconstruire pour terminer un change.
Le moteur et le schéma sont fournis par le paquet, sans copie dans le skill.
