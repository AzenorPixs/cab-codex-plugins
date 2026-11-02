# Conception

## Décision durable

Le registre d’opérations conserve une projection minimale de la décision
terminalement enregistrée : verdict, requestId, approvalId, operationId,
operationDigest, identité de RUN/session/version et empreinte du mandat.
Le champ est écrit atomiquement avant toute réponse native. Le GET scoped
reste borné et n’expose aucun contenu du mandat ni secret.

## Restauration après redémarrage

Le contrôleur inspecte uniquement l’historique natif de la session déjà liée
au RUN. Il restaure une validation si la demande native est unique, terminée,
et si un résultat natif `APPROVED` ou `REJECTED` correspond exactement aux
identifiants et empreintes durables. Il vérifie à nouveau session, permission,
access, génération et révisions. Les réponses libres et les appels incomplets
ne constituent pas des preuves.

Pour une approbation, une réponse `once` est admissible uniquement si l’état
natif montre la permissionId exacte toujours pendante, le callID exact, et
l’absence de réponse ou de démarrage de l’outil dans l’historique. Le contrôleur
réacquiert l’accès associé selon le manifeste et les révisions originales ;
un conflit conserve l’attente. Après l’appel natif, l’intention `ISSUING` est
persistée avant l’effet et l’accusé après le retour. Une coupure entre ces
points ne relance jamais aveuglément : l’historique doit prouver la permission
encore pendante avant la seule continuation sûre.

## Frontière et isolation

Un résultat natif complet et corrélé clôt l’opération et libère uniquement
son accès. Une réponse perdue, un outil encore running, une permission absente
sans résultat terminal ou une incohérence maintient l’opération et l’accès en
`UNKNOWN`. Aucun délai ne transforme cet état en absence d’effet.

La compatibilité des accès reste définie par l’ensemble de ressources et les
révisions. Les opérations recouvrantes attendent ; des RUN distincts peuvent
progresser lorsque leurs ressources ne se recouvrent pas. Le protocole ne
déclenche pas de suspension globale.

## Vérifications

Les tests couvrent la restauration depuis l’historique natif exact, le rejet
des preuves libres/incomplètes/divergentes, les interruptions avant et après
la réponse, l’absence de rejeu après accusé, la conservation d’`UNKNOWN`, la
libération ciblée après fin native et l’accès indépendant/non recouvrant.
