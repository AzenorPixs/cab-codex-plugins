# Dépendances — référentiel du projet

OpenSpec et les cadrages applicables font autorité. CAB conserve des états d’exécution, pas une base fonctionnelle de changes livrés. Les dépendances déclarées sont résolues à la réservation et à la restauration dans le projet exact : archive unique, aucune version active homonyme, tâches présentes et toutes complétées. Les chemins, liens, ambiguïtés et sources manquantes sont contrôlés. Les empreintes des sources et la portée change-completed sont rapportables.

L’archivage d’une adoption documentaire prouve cet achèvement documentaire uniquement. Il ne prouve ni compilation, installation, recette produit, activation ni disponibilité de ressource. L’orchestrateur vérifie toujours les critères sémantiques et techniques nécessaires à son mandat dans les spécifications et les preuves correspondantes. Un refus référentiel réel est traité comme une dépendance non satisfaite ; jamais comme une demande automatique d’approbation humaine.

Le retrait d’un ancien RUN ne change pas le verdict OpenSpec. Ne pas recréer un RUN, modifier dependsOn ni fabriquer une ligne DELIVERED pour redémarrer. Les fichiers du projet consommateur sont consultés, pas modifiés par cette récupération.

## Profil temporaire contrôleur5

Le preload publié2.4.14 `cgpt-approval-bridge-erasure-restore-preload.mjs` est réservé à la reprise d’un effacement RESTARTING authentifié : même transaction, propriétaire APPLIED, SGS purgé, empreinte exacte du registre et seulement les RUN protégés. Il se charge par un drop-in temporaire du service CAB, sans modification de l’ancienne distribution ni de la configuration OpenCode. CAB_ERASURE_RESTORE_RECEIPT et CAB_ERASURE_RESTORE_TRANSACTION désignent le reçu exact. Les modules5 restent5 ; le preload9 rapporte explicitement sa version de récupération. Les seuls contrôles de dépendances sont redirigés vers OpenSpec ; conflits, permissions, décisions, once et ressources restent inchangés. Supprimer ce drop-in et recharger systemd avant CABU final ; vérifier ensuite toutes les versions réellement actives.
