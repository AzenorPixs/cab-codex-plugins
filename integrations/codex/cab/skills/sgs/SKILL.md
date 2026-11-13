---
name: sgs
description: Produire ou consulter les rapports SGS des changes sans reconstruire implicitement le global.
---

# SGS CAB3.2.2

Les statistiques sont gérées par cab.service. Consulter statistics_change pour
la projection du STATISTICS.md local (source unique), statistics_project pour
le global et les jobs. statistics_sync demande le rattrapage au service, sans
calcul ni rédaction par le LLM. Le service génère/amende les rapports après
archive et maintient le global automatiquement, sous réservation PostgreSQL.

Le codeur ouvre/ferme ses périodes en autonomie. Les données absentes restent
N/A, les amendements manuels et historiques sont préservés. Un change ouvert
sans session de codage n’exige pas de rapport. Aucun prompt SGS externe, aucun
registre JSON global ni moteur local d’écriture ne sont nécessaires.
