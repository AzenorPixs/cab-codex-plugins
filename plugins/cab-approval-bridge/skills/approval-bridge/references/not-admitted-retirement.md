# NOT_ADMITTED natif et préparation locale — CAB 2.2.30

Un NOT_ADMITTED broker est terminal. Une admission locale STABLE/owner et
validation enregistrés ne le transforme pas en PENDING ou APPROVED. Dans son
change autorisé, l’orchestrateur traite lui-même la convergence qualifiée ;
il ne crée pas une décision fictive pour retirer une préparation.

## Distinguer transition et incompatibilité

Pendant la reconnexion CABU, une readiness broker absente produit503
broker-coordination-not-ready, transitoire : conserver les mêmes identifiants
PENDING et reprendre leur notification. Un vrai contrat entrant legacy ou
incomplet reste409 coordination-upgrade-required et peut devenir NOT_ADMITTED.
Un ancien terminal, même issu de l’ancien409 pendant CABU, n’est jamais rouvert.
Le code409 historique ne prouve pas à lui seul que la route était legacy.

## Qualifier le retrait propriétaire

Relire RUN/contexte/version/SID/job, admission, opération complète et état natif.
Exiger PREPARED sans décision locale ou durable, accès lié, native/nativeResult
ou once. Conserver toutes les protections indépendantes. Le même SID doit être
idle sans permission, sans effet postérieur à la demande. Un appel MCP natif
échoué reste identifiable uniquement par son input exact et son enveloppe
Code Mode scellée ; une erreur opaque ou une identité divergente est refusée.

Préparer la revue et la policy bornée avant la lecture fraîche.
L’agent de codage lit get_approval une fois par qualification sur le même approval_id,
dans le même SID, sans nouvel effet. La lecture complète de moins de cinq
minutes doit donner NOT_ADMITTED avec toutes les identités exactes et
not_admitted_at cohérent. Si l’enveloppe est tronquée, le résultat périmé,
PENDING/APPROVED ou non corrélé, ne pas appliquer ce retrait. La consultation
d’un ancien transcript ou une simple capture de checkpoint ne suffit pas.
Si la lecture expire avant soumission, renouveler cette seule observation,
pas request_validation ; ne pas changer le payload d’un actionId déjà envoyé.

Clore le mandat courant après son rapport si nécessaire. Lire GET
/runs/<run>/recovery/native-evidence?operationId=<operation>, puis le plan
/runs/<run>/recovery. La présence d’une offre restore-pending-validation ne
prouve pas son applicabilité au terminal ; ne pas restaurer une validation
NOT_ADMITTED ni une validation encore présente.

Utiliser la policy propriétaire courante pour withdraw-unissued-validation,
limitée aux ressources du change, puis POST /runs/<run>/recovery/action avec
ownerId, policyId, actionId neuf, boundaryDigest frais du plan,
action="withdraw-unissued-validation", targetId de l’ancienne opération,
input.nativeBoundaryDigest frais et input.evidence de la revue. Le format et
les contraintes sont ceux de [recovery-policy](recovery-policy.md). Un cadrage
manquant dans ce périmètre appartient à l’orchestrateur ; un élargissement
métier appartient au développeur.

Le contrôleur vérifie deux frontières stables avant de retirer la validation
locale et annuler seulement la coordination. Il ne modifie ni le terminal
broker ni ses identités et n’écrit aucune décision. Aucun cancel_approval,
rejeu de request_validation ou once directe n’est requis.

## Vérifier et poursuivre

Exiger CANCELLED, décision toujours absente, sans accès/native/nativeResult/once
créés et protections indépendantes identiques. Le reçu qualifie seulement
COORDINATION_WITHDRAWN_BEFORE_ISSUANCE, pas un NO_EFFECT natif fabriqué.
Après réponse perdue ou redémarrage, relire/répéter le même actionId/payload,
sans reproduire l’appel métier. Une permission tardive reste inexécutable.

Le mandat suivant exige de nouveaux requestId/approvalId/operationId/digest,
révisions courantes, revue, décision et accès ordinaires. Réutiliser le RUN,
le SID et les critères du change. Si un autre accès/effet demeure, diagnostiquer
sa frontière propre ; ne pas le libérer pour débloquer cette préparation.

Si le broker est CANCELLED/OC après une annulation PENDING, ce n’est pas une
preuve NOT_ADMITTED : suivre [la convergence native](autonomous-recovery.md),
sans rejouer cancel_approval ou un retrait déjà terminé en409.
