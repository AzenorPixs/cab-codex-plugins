# Dépendances non satisfaites

RUN : SCM-SESSION-AGENT-CATALOG-RATES-20261127

- CAB 3.48.0 réserve tous les chemins du mandat pendant les vérifications en lecture. Deux reçus PostgreSQL ont été annulés après réconciliation, sans qualification réussie sur la source courante.
- La capture CICDF du démon installé ne filtre pas les deux modifications de fichiers de test suivis par Git. Le développeur a exigé que les fichiers de test restent hors livraison et qu’aucune lecture ne prenne de verrou.
- La version 3.48.1 doit encore être qualifiée via un moteur qui respecte ces deux règles avant publication et CABU.
