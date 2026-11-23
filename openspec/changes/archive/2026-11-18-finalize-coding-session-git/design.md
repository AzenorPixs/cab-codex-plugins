# Conception

## Ordre terminal

CAB vérifie les critères applicables, termine la période de mesure sur son snapshot réel, crée ou amende le rapport du change puis le global. Il indexe chaque document immédiatement après écriture et publie un dernier commit de métadonnées avant de rendre CLOSED ou BLOCKED. Le résultat bloqué conserve le change ouvert et exige BLOCKERS.md ; aucun code inachevé ou fichier d'une autre session n'est absorbé.

Une étape durable distincte conserve le RUN/SID, les empreintes des documents, le parent Git, le commit et chaque destination. Les contrôles d'intégrité, réservations et index ordinaires préexistants restent respectés. Une erreur ou un résultat incertain conserve la protection ; une lecture peut reconnaître un envoi déjà réalisé, sans le rejouer.

Les rapports terminaux utilisent les snapshots de fin des périodes déjà closes. Les opérations de publication des métadonnées ne déclenchent pas une régénération récursive du même bilan. Une modification ultérieure du global par une autre session ne modifie pas le snapshot déjà publié.

## Portée

Le code validé et sa livraison restent distincts du commit terminal. Celui-ci contient seulement les documents autorisés de la clôture et le global produit par CAB. Les parents distants sont vérifiés pour ne pas publier implicitement du code local non livré. L'absence de forge admissible ou une divergence reste explicite.

Les nouveaux RUN adoptent cette barrière. Un RUN déjà en cours est activé explicitement ; aucune migration implicite de son mandat ni fabrication de preuve. Les sessions historiques importées conservent leur parcours protégé.

## Versions

Une version fournie par la session prime sur la version courante du projet pour déterminer le tag de version ; à défaut, CAB reprend PROJECT_VERSION. Aucune écriture CAB n'ajoute ou n'accepte un préfixe v dans les versions du projet et de release, ni dans les nouveaux tags de version Git et de release. Les lecteurs restent compatibles avec les anciens tags, sans réécriture automatique de l'historique. Les champs manuels intentionnellement laissés vides restent distingués d'une valeur par défaut non fournie.

Le développeur exige que CAB déplace automatiquement le tag de version sur le commit terminal. La branche et le tag sont modifiés dans la même transaction locale puis envoyés atomiquement par forge avec leurs valeurs attendues. Le nom de tag reste la version transmise ou, à défaut, la version du projet, sans préfixe. Le comportement est exécuté par le moteur et attesté dans le reçu terminal.
