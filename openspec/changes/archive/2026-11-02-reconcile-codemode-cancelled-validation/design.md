# Conception

La restauration extrait `request_validation` d’une seule partie Code Mode
`execute` uniquement lorsque les métadonnées natives sont complètes, non
tronquées et `executed=false`. Pour l’annulation, elle accepte soit une lecture
native directe `get_approval`/`poll_approval`, soit un wrapper contenant la
découverte littérale exacte `cancel_approval` suivie de son appel unique avec
l’approvalId exact. Le résultat doit confirmer les identités et
`CANCELLED/cancelled_by=OC`.

Le transcript complet est relu deux fois. La session doit être inactive et
sans permission, décision, accès ou effet natif. L’opération d’origine devient
`CANCELLED` sans décision ; aucun requestId n’est remplacé.
