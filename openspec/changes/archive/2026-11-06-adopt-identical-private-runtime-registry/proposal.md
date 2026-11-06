# Adoption vérifiée d’un registre privé sans manifeste

Code non attribué ; convergence ACL ultérieure. Correctif ciblé demandé par
le développeur après l’échec CABU236 sur registre cible préexistant, sous SCM.

## Why
Une copie privée préexistante controller-runs.json sans runtime-layout.json
est refusée même lorsqu’elle est identique à la source validée du même reçu.
Il faut distinguer cette reprise prouvée d’une collision étrangère.

## What Changes
- N’adopter qu’un registre privé dont le SHA256 des octets égale celui de la
  source validée et capturée ; propriétaire, mode privé et chemins sûrs requis.
- Vérifier aussi les fichiers runtime préexistants connus : aucun inconnu ou
  divergent adopté/écrasé. Déterminer l’ensemble avant d’écrire le manifeste.
- Reprendre le même reçu et la copie idempotente ; préserver les originaux,
  identifiants, décisions, once et les deux états en cas d’écart.
- Tests collisions, source changée, permissions/liens, interruption et reprise
  classique réelle. Version237, archive/SGS, DIU puis CABU et notification.

Fichiers :state-layout.mjs,update.mjs,tests dédiés et CABU,références de
maintenance,versions couplées,cadrages/README/CHANGELOG/cartographie et OpenSpec.
Inventaire initial :gitignoreCAB copié du template avec /.cab-tests/ mais
perte de deux exclusions locales déjà publiées ; conserver la nouvelle règle
et rétablir ces exclusions. DEVOPS non versionné du checkout historique reste
artefact ignoré, aucun contenu de ce checkout modifié. Modification template
séparée demandée explicitement :unique ligne /.cab-tests/, déjà vérifiée.
