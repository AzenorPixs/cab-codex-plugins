# Transport scellé des sondes de port quarantiné

Code non attribué ; convergence ACL ultérieure. Correctif sous SCM nécessaire
à la priorité développeur : finir C12 et libérer CISMP5 avant CAB2.4.0.

## Why
Les captures sont maintenant quiescentes, mais le modèle recopie15Kio de code
et peut altérer un caractère avant once. Le carrier existant transforme cette
commande en lanceur court qui ne correspond pas au permit inline. La fenêtre
120s est consommée par les échanges. Aucun allongement de fraîcheur ni rejeu.

## What Changes
- Préparer au contrôleur un stage du seul générateur de sonde connu, avec
  identités futures explicites ; le corps ne passe plus par le modèle.
- Lier le lanceur à ce payload exact, au permit/nonce/opération source, au
  SID courant, à la génération et au seul port en lecture.
- Vérifier la même liaison dans les deux captures et conserver leurs appels
  natifs distincts, décisions, accès, once et fraîcheur120s.
- Documenter la préparation des deux stages avant les captures et la provenance
  d’instance des reprises CLI (ne pas créer un SID homonyme par défaut).
- Versions couplées2.3.6, tests, archive/SGS, commit/publicationDIU puis CABU.

Fichiers : controller.mjs,port-recovery.mjs,testsconcurrent-controller etport,
références historiques/carrier/native-coding-recovery, skill/command/routages,
cadrages/README/CHANGELOG/cartographie et spécification. Pas de changement de
la brique statistiques ou d’un moteur OpenCode ; aucun effet dans C12 émis
par le correcteur. Les originaux et once consommées restent protégés.

## Extension demandée : reçus CABU classiques
Le portable confirme update-migration-managed-release-required : le reçu est
classique, sans plan managed.2.3.6 conserve ce layout pendant la reprise du
même reçu, arrête les services résiduels avant la capture finale et vérifie
les fichiers broker avancés uniquement s’ils sont byte-identiques au paquet
qualifié hors déclaration de version. Leurs octets sont conservés en audit.
La cible historique est achevée puis l’alignement courant est distinct. Fichiers
update.mjs,tests/active-component-update.test.mjs et références CABU inclus.

## Capacité nécessaire au carrier
PA01 a observé shell-stage-store-limit au plafond128, sans stage ni once créé.
Pour que les deux probes puissent être préparées, le plafond de stages passe
à512, sans supprimer d’audit ni modifier les plafonds64Kio par corps/16Mio
par registre. Cette capacité bornée ne concerne pas le futur espace de tests.
Après plus de128stages, un lecteur antérieur peut refuser le registre : reprise
en avant qualifiée, aucun retour manuel à l’ancien lecteur ou état métier.
