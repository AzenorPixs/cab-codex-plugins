---
name: CCAB
description: Déclarer et traiter les incidents CAB avec preuves et claim durable.
---

# CCAB 3.0.2

Utiliser le serveur MCP `cab` ou `/usr/bin/cab call` ; le service porte le registre.
Déclarer par `incident_report` avec projet, résumé et empreintes de preuves.
Consulter `/api/v1/incidents` dans le périmètre autorisé. Le responsable réclame
l’incident par `incident.claim` avec un bail et conserve le même claim.

Un correctif respecte son mandat SCM. Après qualification, livraison et CABU,
obtenir la vérification du déclarant, puis appeler `incident.resolve` avec les
preuves. `incident.purge` ne retire que les incidents résolus dont le claim
reste valide. Ne pas déduire la résolution d’une présence source ou d’un code0.
