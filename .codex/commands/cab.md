---
description: Alias de compatibilité de /CAB ; transmet les arguments inchangés
version: 2.1.7
---

Réponds en français.

Argument reçu : `$ARGUMENTS`

Charge intégralement le fichier frère `CAB.md` depuis le même répertoire de
commandes que ce fichier. Utilise uniquement ce fichier local, sans recherche
globale ni téléchargement. Vérifie son frontmatter : `version: 2.1.7`.
S'il est absent, illisible ou d'une version différente, affiche
`CAB_COMMANDE_ALIAS_INDISPONIBLE` avec la cause et termine avant toute
opération réseau, installation ou maintenance.

Exécute réellement la commande canonique `/CAB` dans ce même tour, en lui
transmettant `$ARGUMENTS` inchangé. Applique toutes ses validations et ses
résultats. Ne te limite pas à afficher la commande ou à proposer de la lancer.

## Réconciliation humaine du rejet après redémarrage — 2.1.7

Après accord humain spécifique, utiliser la phase `reconcile-rejected` de
`POST /runs/<run_id>/job/recover` avec les mêmes jobId, expectedSessionId,
sessionId et recoveryId, previousPreflightRequestId courant, un
preflightRequestId inédit, developerAuthorization et rejectedPreflightProof
(nativeToolCount et nativeToolHash SHA-256 du JSON canonique des outils
natifs complets). Le contrôleur n'accepte qu'un rejet natif corrélé sans
effet et scelle un reçu non exécutable. Ne reconstruire aucune décision.

Sous gel GLOBAL_RECONCILIATION, joindre globalTransactionId exact. Après
réconciliation, confirmer puis libérer cette transaction avec authorization,
evidence et rejectedRecovery : runId, jobId, recoveryId, prochain
preflightRequestId et nativeToolHash retourné dans la dernière tentative.
Le contrôleur recontrôle le reçu, l'historique inchangé et la cohorte.
Aucun outil ne doit être envoyé entre le sceau et la libération. Toute autre
récupération non réconciliée ou effet inconnu interdit la levée. Le nouveau
prévol normal exige ensuite ask, décision, once, exit 0 et READY avant
complete. Cette voie ne remplace ni retry ni la procédure CABU.
