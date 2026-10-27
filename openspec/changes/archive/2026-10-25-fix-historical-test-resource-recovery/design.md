# Conception

La validation des clés de test appartient au cycle test-resources-v1. canonicalResource conserve les ressources logiques historiques sans réinterprétation. testResources reste strict ; testsForOperation exige une réservation détenue, donc un ancien identifiant ne peut donner une nouvelle permission sans cycle canonique. Les fichiers et alias physiques conservent leurs gardes.

La réparation est limitée à READONLY_RECOVERY_REQUIRED, broker déconnecté, contrôleur inactif, HELD SHARED_MAINTENANCE exact, PAUSE de tous les RUN, identités et fichiers broker inchangés. Le seul changement de code admis dans le candidat remplace runs.mjs par la version identique sauf retrait du contrôle global des identités de test. Tous les autres artefacts doivent être identiques au stage initial.

Un plan privé récupérable conserve reçu original, stages originaux, empreintes, identité OpenCode et empreinte du registre. Aucun champ métier ni génération n'est modifié. Les services sont arrêtés, les seuls pointeurs/artefacts techniques sont replacés à leur référence de sauvegarde sans exécuter l'ancien code, puis le stage candidat et le plan de nouvelle release sont inscrits dans le même reçu. L'updater ordinaire réinstalle la release qualifiée et effectue reconnexion, versions, identités et libération. Les anciennes releases ne sont jamais réécrites. Le plan de réparation est idempotent et refuse toute dérive.

La portée de la réparation est le layout managed-release à liens de fichiers observé dans l'installation concernée. Les autres layouts et corrections arbitraires sont refusés. Le broker et son ancien processus ne sont jamais restaurés. La copie de validation du registre sert uniquement au contrôle hors runtime et n'est jamais restaurée dans le workspace.
