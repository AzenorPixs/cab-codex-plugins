# Conception

## Autorité

Périmètre SCM explicitement validé par le développeur le 29 octobre 2026. La nouvelle phase `reconcile-rejected` de `/runs/<runId>/job/recover` exige les identités recovery existantes, `previousPreflightRequestId`, un nouveau `preflightRequestId`, `developerAuthorization`, et une preuve `rejectedPreflightProof` contenant le nombre et SHA-256 des parties outils natives. Lorsqu'un gel existe, `globalTransactionId` lie ce reçu à la transaction exacte.

## Preuve

Contrôler l'historique complet après la frontière prepare/retry conservée. Autoriser uniquement readiness terminée, erreurs request_validation MCP -32602 antérieures à l'unique soumission enregistrée, cette soumission et ses pollings corrélés PENDING puis REJECTED. Vérifier les identités request/approval/session/directory/change et `/usr/bin/true` exact sans fichier. Refuser toute commande, autre outil, approbation, incohérence, demande restante, permission, activité native, décision locale incompatible ou empreinte divergente. Relire l'historique avant persistance.

## Persistance et gel

Conserver un reçu non secret dans les tentatives du recovery : autorité, transaction globale éventuelle, empreinte, identifiants et issue REJECTED_WITHOUT_EFFECT. Ne reconstruire aucune entrée approved et ne transmettre aucune permission. Réserver seulement le prochain prévol. Le retry ordinaire ne gagne aucune tolérance de perte de décision.

Le contrôleur peut examiner cette phase avec infrastructure saine malgré le gel global nommé ; aucune autre admission n'en bénéficie. Confirm/release du gel exigent une autorité explicite et une référence au reçu du même RUN/job/recovery, son recontrôle natif inchangé, l'absence de tout effet ou attente et la quiescence des autres RUN. Une autre récupération non réconciliée bloque. Après release, le nouveau prévol doit prouver ask, décision corrélée, once, exit 0 et READY avant complete ou travail métier.

## Validation et déploiement

Tests positifs après redémarrage, historique -32602 puis rejet, reprise et nouveau prévol ; tests négatifs pour approbation, commande, identité, empreinte, autorité, transaction et cohorte divergentes. Vérifier persistance et refus inchangé du retry ordinaire. Syntaxe, régressions, OpenSpec strict, UTF-8/LF et cohérence documentaire avant archive. Incrément commun 2.1.7 ; CABU après archive, sans édition des états privés ni relecture de secrets par le modèle. Le repli de code ne restaure jamais un ancien registre effaçant des preuves nouvelles.
