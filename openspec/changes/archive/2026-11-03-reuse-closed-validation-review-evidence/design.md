# Réemploi causal, sans réduction silencieuse de l’historique

Le registre et le reçu privé font autorité pour sélectionner un ancien change
de communication clos : DONE/HTTP200, owner/contexte/version actuels, ancienne
opération CANCELLED et non consommée, digest de completion concordant.
Le serveur retrouve le request_validation natif exact de cette ancienne
identité. Les shells ignorés sont uniquement les callIds déjà revus, au même
commandSHA, format V2/error/aborted/executed=false et antérieurs au terminal
actuel. Les wrappers revus doivent conserver codeSHA et leur provenance MCP ;
la source de demande close ne peut contenir de nouvel appel exécuteur.

L’observation durable du nouveau reçu conserve les références et empreintes
des preuves réutilisées. Les deux snapshots complets restent comparés ; le
diagnostic public continue d’exposer les anciens calls et lacunes du journal.
La revue propriétaire actuelle doit toujours épingler commande, call, part,
sources et périmètre de lecture. Une seule commande terminale actuelle est
admise. Les parties inconnues, divergentes ou relevant d’un effet réel restent
refusées. Ni une once ni NO_EFFECT ne sont déduits des anciens refus.
