# Architecture adoptée

Un superviseurcab.service root porte DjangoASGI et les workers locaux,
collecteurs etElectric. PostgreSQL17 reste indépendant. Le service ouvre
l’interface8790 en modebootstrap sans création de baseCAB ni activité de RUN
avant validation authentifiée du parcours Web. Une installation configurée
reprend automatiquement ; une base inaccessible ne devient jamais neuve.

Les projets, sessions, mandats, opérations, baux, événements, avis, statistiques
et incidents sont persistés dans PostgreSQL sous transactions Django. Les
connecteurs sont des clients du contratOpenAPI, avec identité locale et
autorisation bornée au mandat. Les exécutions ne bénéficient pas de root par
déduction : UID du compte autorisé et isolation conservés. L’INTENT précède
l’effet ; réponse perdue ou réconciliation non prouvée conserve la protection.

Electric est un processus de lecture supervisé par le service unique ; Django
autorise les shapes et ne transmet que les projections de sessions du périmètre
autorisé. Aucune mutation métier ni secret viaElectric. TanStackRouter/Query
pilotent le client Web ; assets préparés enCI, aucune compilation à l’installation.

L’import conserve les sources historiques en lecture seule et leurs empreintes.
La bascule ne réarme aucune ancienne session ; les états incertains importés
restent protégés. Les anciennes intégrations ne sont retirées qu’après réception
vérifiée du nouveau service et sauvegarde du périmètre exact.

Les validations sont bornées : règles critiques Django/PostgreSQL, première
initialisation Web puis reprise, chaîneMCP et synchroElectric réelle, paquet
Debian et cycle de maintenance en environnement isolé, puis vérification de
l’activation finale. Les objectifs de coupure sont mesurés séparément des builds.

Amendement développeur : les ateliers de tests des sessions pilotées sont
créés àchaud sous/tmp, avec identité et ownership du compte effectif. Les
sessions directes conservent leur atelier propre. Les preuves et reçus
restent persistants dansCAB ; la disparition d’un atelier n’est pas une
preuve d’absence d’effet et ne déclenche aucun rejeu.

Précision : conserver l’arborescence .cab-tests/<change>/<RUN> ; seule sa racine
pilotée est déplacée àchaud sous/tmp/cab/<identité-projet>/.cab-tests. Aucun
redémarrage global ; les essais en cours et le profil direct restent protégés.

Les sorties du service sont dirigées vers journald, avec priorité système
correspondant à `logging.level` dans `/etc/cab/cab.json` (INFO par défaut).
`systemctl reload cab.service` transmet SIGHUP au superviseur puis à l’API,
sans redémarrage des RUN, workers ou Electric. Les niveaux invalides sont
refusés en conservant le réglage précédent. Les identités de diagnostic sont
bornées ; les secrets sont expurgés et les corps HTTP, prompts et traces SQL
restent exclus, y compris en DEBUG.
