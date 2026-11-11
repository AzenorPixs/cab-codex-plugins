## Frontière

La réconciliation est propre au RUN et au seul appel externe concerné. Elle exige l’identité complète de l’appel, son empreinte d’entrée, son unique partie native terminale et son erreur de prévol reconnue, ainsi que le bail et la génération inchangés. Pour le profil historique 2.7.1, les readiness natifs encadrent l’appel avec le même PID, démarrage et instance ; le reçu CABU antérieur fournit les empreintes des artefacts déployés et la continuité du serveur OpenCode est vérifiée. Cette chaîne n’est pas une empreinte continue des octets en mémoire. Deux observations fraîches et concordantes sont requises. Une trace incomplète, un second appel, une identité divergente ou une émission possible refuse la mutation.

La clôture est une décision de coordination auditée distincte d’un résultat de test et conserve l’historique de l’INTENT, l’identité, l’empreinte et le bail. Elle ne crée aucun reçu d’exécution, ne remet pas executionIssued à faux et n’autorise pas le rejeu de la même identité. Seul un nouvel appel explicitement autorisé par le mandat peut suivre.

Pour les futurs appels, le broker authentifié atteste immédiatement un échec de prévol survenu après le premier grant et avant tout transport. Le contrôleur vérifie le grant initial et l’identité native, puis conserve une fin de coordination distincte de tout reçu de test. En cas de réponse perdue ou de grant déjà émis, l’état reste incertain. Cette attestation ne s’applique pas rétroactivement aux anciennes erreurs non attestées.

La recette quantitative utilise un service SGS privé et son collecteur réel,
liés à l’instance OpenCode isolée et au même état de fixture que le contrôleur.
Elle compare les mesures collectées aux messages natifs contrôlés, avant et
après handoff et après relecture, sans supposer disponible une mesure absente.
