# Conception

## Finalisation
cab finalize vérifie le service puis applique les intégrations configurées, sous
verrou privé et journal durable par compte. Une empreinte version/payload/comptes
permet de reconnaître les étapes déjà terminées ; une erreur laisse une reprise
explicite, sans APT. Le bootstrap non validé reporte ces effets. cab update lit
le reçu produit par postinst, puis le complète avec l’empreinte du paquet local.
Le paquet possède un exemplaire public sous /usr/lib/cab ; les profils Codex
possèdent leur cache/activation et les commandes CAB, sans toucher les tiers.

## Agents
La présence du binaire et celle d’un processus sont distinctes. L’observation
Linux filtre les comptes CAB et les exécutables connus, sans exporter les argv
ni lire l’environnement. Une connexion MCP locale est attestée par un processus
CAB MCP et les deux extrémités stdio ouvertes, avec directions cohérentes.
Une preuve inaccessible reste non vérifiée, jamais un faux vert. Les chemins
binaires et connecteurs sont des informations en lecture seule.

## Releases
Cache privé persistant, exclusivement GitHub API et sans authentification. Dépôts
par défaut anomalyco/opencode et openai/codex ; clés JSON facultatives
opencode_release_repository et codex_release_repository (owner/repo). Un contrôle
par dépôt et jour UTC, horaire aléatoire persistant, première vérification différée
aléatoirement de0à60secondes. Les échecs conservent la dernière valeur et attendent
le lendemain. Aucun appel GitHub depuis la requête de page, aucune mise à jour
automatique des binaires. Le superviseur effectue ce travail hors du pool codeur.

## Sessions et changes
Tables projects (conservée), runs (renommage de cab_core_run), sessions et changes.
Les champs natifs historiques du RUN restent compatibles. La migration relie
les sessions connues par projet/agent/UID/SID et les changes par projet/identifiant,
sans changer leurs identités métier. Configuration JSON par entité ; aucune
configuration JSON n’accorde de permission supplémentaire au mandat.

Les étapes sont des déclarations explicites du propriétaire via run.progress ;
les anciens RUN commencent sans étape ni phase supposée. Les transitions de revue,
réconciliation d’archive et clôture peuvent tracer leurs propres étapes attestées.
Les tâches sont une observation bornée de tasks.md : chemin canonique, pas de
symlink, ambiguïté actif/archive explicite, empreinte et date conservées. Le worker
actualise les projections Electric sans autorité de validation. La page de détail
réutilise les preuves de revue, exceptions et reçus ; pas d’activité native inférée
du seul processus commun et pas de gate déduit des cases cochées.

## Tâches persistantes
change_tasks remplace la liste JSON de travail avant publication : identité de
source par numéro de tâche lorsqu’il existe, sinon empreinte du libellé, avec
occurrence pour les doublons. Le retrait rend une ligne inactive sans la supprimer.
Tâches et compteurs/projections sont actualisés dans une transaction. Une source
indisponible conserve les dernières observations, explicitement signalées comme telles.

Les comptes configurés incluent aussi les agents enrôlés dans CAB dont le profil
privé local correspond à l’acteur et à son jeton, sans parcourir les HOME non
enrôlés. Cela couvre les comptes installés auparavant par cab enroll/integrate.
Les plans préconfigurés avant bootstrap conservent leur champ role explicite.
