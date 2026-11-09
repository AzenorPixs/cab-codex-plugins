# Conception

L'action `capabilities` décrit un contrat d'adaptation stable et les opérations disponibles sans ouvrir un magasin. Elle ne sonde ni n'active les services et ne promet pas de livraison native. Les modes décrivent le propriétaire de boîte, direct ou orchestrateur piloté, pas le codeur ACSP.

Le protocole technique relie les événements métier aux commandes existantes : entrée/reprise, déclaration, publication, consultation, acquittement et clôture. L'état actif est explicite ; `register` seul ne prouve pas une activité native. SCMP utilise la politique SCM. Le codeur ACSP transmet ses preuves par son protocole parent et ne publie pas une deuxième fois.

La qualification CLI couvre les quatre couples de modes sous un même UID dans un projet temporaire. Les tests de transport existants restent distincts ; aucune session de travail utilisateur n'est notifiée pour le test.
