---
name: CCAB
description: Déclarer et traiter les incidents CAB avec preuves et claim durable.
---

# CCAB 3.2.18

Utiliser le serveur MCP `cab` ou `/usr/bin/cab call` ; le service porte le registre.
Déclarer par `incident_report` avec projet, résumé et empreintes de preuves.
Consulter `/api/v1/incidents` dans le périmètre autorisé. Le responsable réclame
l’incident par `incident.claim` avec un bail et conserve le même claim.

Un correctif respecte son mandat SCM. Après qualification, livraison et CABU,
obtenir la vérification du déclarant, puis appeler `incident.resolve` avec les
preuves. `incident.purge` ne retire que les incidents résolus dont le claim
reste valide. Ne pas déduire la résolution d’une présence source ou d’un code0.

Un claim expiré peut être renouvelé aussi pour RESOLVED : conserver son claim_id
et sa résolution, sans rouvrir l'incident. Qualifier chaque entrée corrigée,
faux positif ou déjà traitée avec ses limites ; ne pas appeler « réparée » une
cause historique inconnue. Le retour vérifié du déclarant reste nécessaire.

Sur demande explicite de vider toute la file, lire GET /api/v1/incidents :
incidents, total et snapshot_digest. Après résolution de toutes les entrées et
renouvellement des claims possédés, relire le snapshot puis appeler
incident.purge_all avec request_id stable, developer_authorized=true et
expected_snapshot_digest. Une entrée non résolue, un claim invalide ou un
snapshot périmé refuse la totalité du lot. Ne modifier ni RUN, accès ou SQL.
Après une réponse perdue, relire la file avant toute autre action.

La vérification du déclarant porte sur le symptôme et les critères de l'incident.
La fin du change métier du projet affecté n'est pas une précondition implicite :
une admission CAB réparée peut être vérifiée pendant que le codeur poursuit son
change. Réutiliser les retours déjà vérifiés et reçus historiques pertinents ;
ne pas rouvrir un RUN ni rejouer des travaux pour obtenir un nouveau message.
Pour un cas déjà soldé ou sans correctif reproductible, expliciter la classification
et les limites ; une cause initiale inconnue reste inconnue après nettoyage.

Pour un test sandbox UNKNOWN/ProcessLookupError, consulter d'abord la récupération
autonome CAB et son motif : elle constate l'arrêt sans reconstruire de réussite,
conserve le reçu original et libère uniquement les baux concernés sur preuves.
Ne pas demander une décision par opération admissible ni relancer la commande.
Un cas hors politique ou insuffisamment prouvé reste une exception documentée.
