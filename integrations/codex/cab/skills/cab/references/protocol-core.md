# Contrat CAB 3.0.1

Le service système est l’autorité transactionnelle. Vérifier cab_status puis
cab_contract. Direct : aucun orchestrateur fictif. Piloté : cadrage initial et
choix résolus, autonomie du codeur sur réalisation, tests et coordination,
sollicitation du parent limitée aux quatre exceptions et à la revue finale.

Toutes les écritures API passent par Django ; Electric est un chemin de lecture
filtré au projet. Les reçus lient request_id, SID/RUN, génération et sources.
Après une réponse perdue, consulter ; ne jamais rejouer un effet UNKNOWN.
La revue finale accepte les preuves de tests sur la source inchangée avant
publication. Un autre projet ou une décision imprévue exige l’exception cadrée.
