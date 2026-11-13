# Contrat CAB 3.0.4

Le service système est l’autorité transactionnelle. Vérifier cab_status puis
cab_contract. Direct : aucun orchestrateur fictif. Piloté : cadrage initial et
choix résolus, autonomie du codeur sur réalisation, tests et coordination,
sollicitation du parent limitée aux quatre exceptions et à la revue finale.

Toutes les écritures API passent par Django ; Electric est un chemin de lecture
filtré au projet. Les reçus lient request_id, SID/RUN, génération et sources.
Après une réponse perdue, consulter ; ne jamais rejouer un effet UNKNOWN.
La revue finale accepte les preuves de tests sur la source inchangée avant
publication. Un autre projet ou une décision imprévue exige l’exception cadrée.

Le codeur déclare l’étape1–11 et la phase via run_progress à l’entrée et aux
changements d’étape, à la frontière d’un lot utile. Ce pointage ne sollicite
pas le parent et n’est pas une validation. Les tâches sont des observations de
tasks.md mémorisées par change ; aucune réussite du RUN ne s’en déduit.
