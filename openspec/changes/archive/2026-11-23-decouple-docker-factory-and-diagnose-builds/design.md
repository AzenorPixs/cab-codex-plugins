# Conception

La Fabrique lit les clés nécessaires au build Docker. La version canonique et l’activation Docker sont recontrôlées avant le lancement. L’inventaire utilise le même périmètre de lecture. Lors d’une publication versionnée, le plan sélectionne le tag local demandé et utilise son identifiant d’image. La préparation de la publication tient compte du registre de la seule forge concernée.

Le reçu de génération existant conserve les étapes et erreurs structurées. Un refus en amont transmet le diagnostic dans la réponse de la demande. L’Overview associe le résultat à la tentative déclenchée et permet de retrouver le diagnostic. Les clés publiques refusées sont accompagnées du numéro de ligne et du motif, sans valeur. Les sorties du processus et l’identité interne du worker restent privées.

Les protections contre les traitements concurrents et le remplacement d’une version existante restent applicables. Les anciens reçus sont lisibles sans migration.
