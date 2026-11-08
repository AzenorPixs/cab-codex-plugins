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

Chaque preuve est un objet `{reference, sha256}` : référence non vide de
1 000 caractères au plus et SHA-256 complet en 64 caractères hexadécimaux
minuscules. Le broker refuse une nouvelle preuve invalide avant mise en file.
Pour corriger une ancienne entrée locale invalide, le déclarant soumet le même
incident avec les mêmes session, projet, change, RUN, catégorie et résumé, et
des preuves vérifiées conformes. Seules les preuves invalides sont remplacées ;
la date initiale est conservée. Une autre différence ou une modification de
preuves déjà valides est refusée. La copie locale reste en attente si le relais
échoue ; vérifier son acquittement avant de solder et purger l’entrée centrale.
Ne jamais éditer directement l’outbox privée.

L’orchestrateur désigné par le développeur consulte la vue globale, prend
la plus ancienne entrée disponible par défaut, puis se coordonne avec ses
déclarants dans les autorisations de communication existantes. Il peut choisir
un lot de causes communes en indiquant ses identités et sa justification.
Chaque entrée garde son horodatage et sa résolution propre. Le reçu de prise
et son bail persistent ; après réponse perdue, reprendre le même action_id
et le même payload. Une expiration permet une reprise contrôlée, pas un
deuxième correctif concurrent. Vérifier le bail avant chaque résolution.

Le développeur autorise les échanges nécessaires entre un déclarant CCAB et
le correcteur désigné, y compris entre chats de projets différents. Vérifier
le destinataire et son rôle ; partager seulement les preuves utiles, sans
secret. Ne pas redemander cet accord à chaque échange. Cette autorisation
n'étend pas les mandats et ne contourne pas les permissions de la plateforme.

Qualifier sur preuves : défaut de code, défaut documentaire ou faux positif.
Une entrée examinée peut aussi être soldée sans correctif (`no-fix`) : décrire
la méthode, les raisons et les limites restantes, puis informer le déclarant.
La clôture ne prouve pas la réparation et ne lève aucune protection.
Après réponse vérifiée au déclarant et résolution, nettoyer chaque entrée
traitée avec `purge` ; ne pas conserver la file comme archive. Les reçus
partagés encore nécessaires aux autres entrées restent protégés.
Sur demande explicite du développeur, `POST /purge-treated` avec
`{"confirmed":true}` supprime toutes les entrées et reçus CCAB dans une seule
transaction si toutes les entrées sont résolues ; sinon il ne supprime rien.
Cette purge ne modifie ni les RUN, ni leurs accès, ni les autres briques.
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
Actions : `status`, `list`, `report`, `claim`, `renew`, `resolve`, `purge`, `purge-batch`, `purge-all`. Les mutations lisent
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
classification (code-fix/documentation-fix/false-positive/no-fix), method,
reporters_verified et release. Pour un correctif, release comporte version,
commit, publication et cabu_receipt. Pour un faux positif ou `no-fix`, release vaut null.
Les preuves réelles restent à examiner ; la saisie de références ne vaut pas
une validation automatique de leur contenu.

`purge` : `{ "incident_id": "..." }` retire la seule entrée résolue ; une
entrée ouverte ou réservée est refusée. `purge-all` : `{ "confirmed": true }`
retire tout seulement lorsque toutes les entrées sont résolues.
`purge-batch` : `{ "incident_ids": ["..."] }` nettoie atomiquement les
entrées traitées ensemble ; toute entrée ciblée non résolue refuse le lot.
