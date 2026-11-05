# Projeter le contexte portable après transition PLLM

## Why

Le développeur exige le mode2 et la reprise des sessions historiques, puis demande de ne plus tenir compte des anciens blocs chiffrés lors d’un changement de PLLM. Le banc privé2.2.0 démontre qu’un hook natif chargé à chaud peut projeter la requête sans ces métadonnées, avec mêmes modèle, compte cible, SID, PID et historique enregistré. Le défaut ne requiert pas un changement de candidat PLLM.

## What Changes

CAB2.1.21 distribue une projection native ciblée par session, fournisseur, modèle, connexion opaque et liste fermée d’anciens messages. Elle retire de la seule requête les raisonnements anciens et métadonnées fournisseur associées, conserve texte et contrats d’outils, et ne modifie pas le stockage. Un changement de PLLM/compte exige cette préparation à une frontière sans effet puis une preuve historique sans outil. SCM, archive, publications, CABU et reprise par chaque propriétaire restent distincts.

## Impact

Module de projection, tests unitaires et natifs, procédure distribuée, skill/commande et versions communes ; deltas OpenSpec et maintenance ciblée Map/BATCH/statistiques. Aucun secret dans les règles, aucune inspection du chiffré réel, aucun alias de modèle, compactage, nouveau SID, changement du processus OpenCode ou application sur une session étrangère. Code de lot non attribué ; attribution ACL ultérieure.
