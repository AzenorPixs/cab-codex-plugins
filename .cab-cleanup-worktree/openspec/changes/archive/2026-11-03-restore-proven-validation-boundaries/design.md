# Conception bornée

L’autorité reste une policy propriétaire exacte, liée au RUN/contexte/version
et ressources, puis un plan et nativeBoundaryDigest frais. Les deux actions
exigent PREPARED, aucune native ni accès lié, session idle sans permission,
identité native et double observation stable, révisions valides et job courant.

restore-pending-validation exige une unique lecture native get_approval liée
à l’approval, fraîche de moins de cinq minutes, PENDING non expiré et identité
strictement concordante. Elle refuse tout terminal contradictoire ou shell
correspondant postérieur à la demande. Le contexte persiste la même validation,
sans décision ni permission ; le registre existant reste inchangé. L’intention
privée permet la reprise causale si le processus s’arrête après cette écriture.

reconcile-reviewed-terminal exige la décision approved existante, revue READ_ONLY
propriétaire avec SHA de commande et de chaque source pertinente, références,
callId/partDigest exacts et lecture native APPROVED corrélée. Un seul terminal
shell de même commande doit être observable, sans background ni sortie tronquée,
avec statut completed/exit entier. Les effets non couverts, sources divergentes,
permissions, doublons, once ou accès existants restent refusés.
La coordination devient COMPLETED ; l’autorisation exécutable locale est
invalidée. native et nativeResult restent absents. Le reçu distingue clairement
NATIVE_TERMINAL_OBSERVED_PERMISSION_UNVERIFIED et ORCHESTRATOR_AUDIT_REVIEW.
Cela ne remplace ni le reçu once ni une qualification générale du runtime.
Un échec entre écritures conserve une intention durable et la réconciliation
reprend les seules écritures techniques manquantes, sans exécution native.

La source 2.2.4, les cas d’échec et leurs mandats constituent les précontrôles ;
les propriétaires appliqueront les actions après publication et activation.
