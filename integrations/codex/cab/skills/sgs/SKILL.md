---
name: sgs
description: Produire ou consulter les rapports SGS des changes sans reconstruire implicitement le global.
---

# SGS 3.0.7

Résoudre SGS.md depuis DEVOPS.md et appliquer son contrat. Le moteur commun
est `/usr/bin/cab sgs` ; VERSION est sans effet. En session, utiliser CHANGE
avec preuves sur stdin, puis DELTA pour le global existant. Conserver les six
sections et les N/A motivés ; distinguer les métriques natives des déclarations.
Ne lancer REBUILD que pour une demande manuelle explicite SGS. Un registre
incompatible est conservé ; ne pas le reconstruire pour terminer un change.
Le moteur et le schéma sont fournis par le paquet, sans copie dans le skill.

Pour un change CAB3.0.7, consulter statistics_change : sgs_evidence porte les
seuls écarts bornés, les identités RUN/SID et la couverture. Ne pas reprendre
les diagnostics session-wide comme métriques du change. Une couverture incomplète
reste N/A dans SGS ; aucune somme arbitraire des sessions ou des périodes ouvertes.
