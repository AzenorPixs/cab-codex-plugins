# Design

Le client V2 vérifie la session native et lie chaque opération à son
répertoire. Il appelle `GET /api/fs/read/*`, `GET /api/fs/list` ou
`GET /api/fs/find` en passant la location `deepObject` exacte. Lecture binaire
bornée à 1 Mio par défaut (maximum 2 Mio), décodage UTF-8 strict et digest
SHA-256 sont fournis pour la lecture de fichier. Liste et recherche retournent
seulement des chemins relatifs et leurs types.

Le contrôleur expose `GET /runs/<run_id>/source/read`, `/source/list` et
`/source/find`. Il dérive session et répertoire du job enregistré, exige un
job armé à une frontière sans mandat, récupération, opération en cours ou
permission native, puis revalide l’identité après l’appel. Aucun identifiant
de session/location fourni par le client ne peut détourner le périmètre.

Un helper CLI local présente ces routes au pilote. Les refus de traversée,
chemin absolu, source exclue, session divergente, réponse excessive ou serveur
V2 non compatible restent explicites. Aucun contenu n’est écrit, exécuté ou
envoyé à un autre service.
