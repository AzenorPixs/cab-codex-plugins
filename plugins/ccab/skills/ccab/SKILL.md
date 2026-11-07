---
name: CCAB
description: Déclarer, consulter ou traiter les incidents CAB en session directe ou pilotée, avec FIFO par défaut et regroupement justifié.
---

# CCAB — Correctif CAB

CCAB est la file persistante des incidents du protocole et des briques CAB.
Son contrat accompagne la version CAB installée. Vérifier le service CCAB et
le runtime de même version ; une préparation ou un fichier présent ne prouve
pas leur activation. Ne pas créer un nouveau chat ni déléguer implicitement.

Le déclarant fournit une identité stable d’incident, projet/change/RUN,
identité de sa session, version, catégorie, résumé et références de preuves
avec empreintes. Aucun secret, prompt ou sortie brute ne va dans la file.
L’entrée reste accessible après nettoyage du RUN tant que nécessaire.

L’orchestrateur désigné par le développeur consulte la vue globale, prend
la plus ancienne entrée disponible par défaut, puis se coordonne avec ses
déclarants dans les autorisations de communication existantes. Il peut choisir
un lot de causes communes en indiquant ses identités et sa justification.
Chaque entrée garde son horodatage et sa résolution propre. Le reçu de prise
et son bail persistent ; après réponse perdue, reprendre le même action_id
et le même payload. Une expiration permet une reprise contrôlée, pas un
deuxième correctif concurrent. Vérifier le bail avant chaque résolution.

Qualifier sur preuves : défaut de code, défaut documentaire ou faux positif.
Un correctif, même uniquement skill/plugin/commande/documentation, suit SCM,
incrément de version, tests applicables, commit/publication par CI/CD puis
CABU et vérification des versions actives. Le faux positif comporte une
méthode de reprise vérifiée. La résolution est individuelle et confirme le
retour du déclarant ; un lot livré ne prouve pas la reprise de tous ses RUN.
Les travaux indépendants autorisés continuent. Une décision hors périmètre
ou une allocation supplémentaire non autorisée revient au développeur.

## Interface disponible

Depuis les scripts du plugin CAB installé, exécuter
`node cgpt-approval-bridge-runtime-command.mjs ccab <action>`.
Actions : `status`, `list`, `report`, `claim`, `renew`, `resolve`. Les mutations lisent
le JSON sur stdin, sans interpolation shell. Le service est
`cgpt-approval-bridge-ccab.service` ; aucune modification directe de sa base.

`report` : incident_id, project, change, run, reporter, version, category,
summary, evidence (liste de reference/sha256).

`claim` : action_id et claimant ; sans incident_ids, FIFO. Pour un lot,
incident_ids et reason sont obligatoires. lease_seconds vaut900 par défaut.
Renouveler avant échéance avec `renew` : action_id neuf, claim et claimant
inchangés, lease_seconds borné. Une réponse perdue se relit avec le même
action_id/payload ; un bail expiré ne se renouvelle pas rétroactivement.
Le renouvellement mécanique peut être assuré par un client local autorisé
pendant le travail, sans tour LLM de surveillance ; il ne prouve pas un progrès.

`resolve` : action_id, incident_id, claim, claimant, resolution avec
classification (code-fix/documentation-fix/false-positive), method,
reporters_verified et release. Pour un correctif, release comporte version,
commit, publication et cabu_receipt. Pour un faux positif, release vaut null.
Les preuves réelles restent à examiner ; la saisie de références ne vaut pas
une validation automatique de leur contenu.
