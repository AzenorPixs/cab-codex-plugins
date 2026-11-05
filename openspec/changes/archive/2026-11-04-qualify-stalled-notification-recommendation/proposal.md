# Recommandation de notification par sous-état — CAB 2.2.31

## Why
La demande catalogue C12.36 reste PENDING/FAILED/retry_overdue sans lease active.
Le code de cause NOTIFICATION_LEASE_STUCK conduit pourtant systématiquement
à RECOVER_NOTIFICATION_LEASE, dont la garde exige SENDING. La protection est
correcte mais la recommandation conduit à une impasse et un diagnostic répétitif.

## What Changes
Qualifier la seule recommandation à partir du snapshot watchdog : lease expirée
vers RECOVER_NOTIFICATION_LEASE ; FAILED/retry_overdue et jamais livrée vers
RECONCILE_PENDING_APPROVALS ; cas mixtes/incomplets vers diagnostic ciblé.
Conserver code de cause, readiness, budgets et gardes, sans action exécutée ni
activation d’automatisme. Clarifier les voies owner pour éviter faux cleanup.

## Scope
Broker et copie distribuée, régressions, contrat/cadrages et versions. Aucun
RUN/SID/accès/bail Pixs ni action contrôlée mutés par le correcteur. SCM puis
publication/CABU ; décision opérante de récupération distincte. Code non attribué,
normalisation ACL ultérieure.
