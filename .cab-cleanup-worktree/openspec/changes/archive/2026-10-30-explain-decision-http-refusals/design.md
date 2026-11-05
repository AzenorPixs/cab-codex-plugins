# Conception

Une garde d’admission commune par contexte effectue les mêmes contrôles. Le callback booléen historique l’encapsule et garde false sur refus ; un callback interne inspectOperationAdmission laisse remonter la cause typée pour les seules décisions. Le mode legacy utilise le même principe. Les contrôles contextuels sont factorisés en cause stable ou absence de cause, sans modifier leurs conditions.

Les erreurs400 prennent la forme {error,message,decision_recorded}. Les statuts400 sont préservés ; les refus natifs et extérieurs déjà409 conservent leur comportement. Les codes et messages viennent d’une table fermée ; aucune commande, ressource, révision brute, chemin, jeton ou message d’exception n’est recopié. Une erreur inconnue donne decision-processing-failed et demande de vérifier l’état enregistré. decision_recorded est lu dans la table effective après le refus : une réponse d’échec ne doit pas prétendre qu’aucune décision n’existe lorsqu’un doublon ou une erreur après enregistrement survient.

Deux vérifications encadrent le contrôle natif asynchrone. Une concurrence tardive expose son motif, mais n’est ni réessayée ni autorisée. Le succès et le rejet explicitement décidés suivent les mêmes traitements. GETdecision404 reste normal tant qu’aucune décision n’est enregistrée ; undecided compte les demandes et active les traitements, métriques distinctes.

Unités : spécification avant code ; diagnostics et gardes indissociables avec tests ; documentation/version puis global ; archive/statistiques/publications ; CABU puis information des sessions. Les tests couvrent révision périmée, plusieurs ressources, doublon, payload invalide, garde native inchangée, concurrence pendant contrôle et exceptions sensibles filtrées.
