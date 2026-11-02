# Conception

## Programme 2.2.0

Le protocole distribué constitue l’entrée opérationnelle commune ; OpenSpec
reste l’autorité des exigences. Les procédures conditionnelles sont chargées
par branche et les échanges de RUN portent les seules nouveautés avec leurs
références de preuves. La migration conserve une correspondance entre chaque
section de l’ancien protocole et sa destination avant son retrait.

Le registre métier conserve son schéma historique. La continuité, les
observations rejouables et le suivi des shells utilisent des fichiers privés
distincts, écrits atomiquement et durablement, sous contrôle des chemins,
propriétaires et identités. Les décisions durables restent liées à leurs
validations et opérations exactes. Une réponse native incertaine ne devient
jamais exécutable par restauration d’un cache local.

Un transfert contrôlé fige seulement l’émission des permissions pendant la
courte frontière de bascule, pas les commandes natives déjà lancées. Un reçu
scelle l’état durable et les accès déjà en réconciliation. Le nouveau lecteur
ne conserve comme sains que les accès couverts par ce reçu exact et encore
concordants ; un crash, une preuve absente ou une divergence conserve le
parcours historique protégé. La première transition depuis 2.1.81 reste
distincte d’un transfert entre lecteurs 2.2.0 compatibles.

CABU prépare et vérifie les artefacts avant interruption, reconnaît le vrai
cas déjà conforme et mesure séparément préparation, coupure et rattrapage.
Les mutations de protocole sont idempotentes et acquittées ; elles ne donnent
aucun droit de rejouer une permission native. Un rollback restaure le code
compatible, jamais le registre métier d’avant coupure.

La récupération propose des actions typées avec leur portée, leurs preuves
et leur autorité ; elle réutilise les gardes qualifiées existantes. Un cas
inconnu a une issue explicite de diagnostic, quarantaine ou arbitrage. Les
ressources disjointes et les consultations prouvées compatibles continuent.
Les politiques d’autonomie ne créent aucune approbation implicite et ne
transfèrent pas la propriété d’un RUN.

## Conception initiale des shells durables conservée

Le start background n’est accepté que pour une opération native `shell` exacte
liée à une ressource `port:*` en écriture, avec `tool_input_sha256` attestant
`background=true` et un délai explicite borné. Le contrôleur extrait le
`shellID` du résultat natif, puis valide le `GET /api/shell/:id` : id, location,
commande, répertoire, statut et dates doivent concorder. La session vient de
la partie native qui a fourni ce shellID, liée au callID et à la permission.
Cette précision du 2 novembre 2026 remplace l’hypothèse initiale d’un champ
session obligatoire dans Shell.Info, absent du schéma officiel observé.
Le nouveau champ de mandat shell_background est explicite, immutable et lié
à la décision et à l’empreinte des arguments natifs.

Le statut de processus est conservé dans un journal privé distinct du registre
des RUN pour rester lisible par l’ancienne version en cas de rollback. L’accès
port reste détenu tandis que le shell tourne ; les ressources disjointes
peuvent progresser. `shell.exited` ou un GET terminal exact permet de fermer
l’opération. L’absence de shell, un timeout sans corrélation, une erreur HTTP
ou un shellID divergent gardent l’accès protégé.

Une opération foreground `background=false` conserve ses gardes actuelles. Une
opération qui n’a jamais produit de shellID ne peut pas être adoptée par ce
cycle ; le cas historique -03 reste EXECUTING et exige une preuve native
terminale corrélée.
