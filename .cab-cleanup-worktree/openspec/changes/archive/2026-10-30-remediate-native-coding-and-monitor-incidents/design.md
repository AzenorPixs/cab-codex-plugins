# Conception

GET /monitor/runs projette au plus 200 réservations (actives d’abord), champs runId/changeId/sessionId/version/state/phase, totalRuns/truncated et snapshot_only. Lecture directe du registre en mémoire, sans snapshot complet, écriture ou accès privé. Le moniteur remplace /runs par cette route et conserve le plafond 2 Mio, les anciens résultats périmés et des erreurs publiques précises bornées (taille, format, HTTP, timeout). Aucun repli vers le registre complet.

Les helpers natifs sont explicites et ne modifient pas prompt() historique. nativeCodingMandate ajoute un préambule fixe et conserve le texte du mandat exact. diagnoseCodingTurn exige SID et message utilisateur ancre, examine seulement les assistants corrélés, ne restitue ni corps ni message d’erreur libre, et ne retourne aucune décision/permission. Empreinte attendue write/edit optionnelle stricte ; résultat divergent, erreur fournisseur et découverte seule restent diagnostics. Aucun retry ou PLLM automatique dans le client.

La procédure distingue échec fournisseur et garde CAB réussie. Une nouvelle tentative n’est préparée qu’après preuve des effets et réconciliation, jamais par complément du fragment. Le conducteur de tests complet est revu et syntaxé ; READY ou compilation n’attestent pas les tests. Les tests privés ne sont pas des preuves de correction du service fournisseur externe.
