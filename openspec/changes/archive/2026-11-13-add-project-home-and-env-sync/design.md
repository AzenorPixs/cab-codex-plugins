# Conception

La table projects reçoit public_metadata (JSON), contenant uniquement un
instantané validé et un état de lecture. Le champ configuration reste privé.
Electric exige REPLICA IDENTITY FULL : une table project_metadata_projection
réplique uniquement id et public_metadata, atomiquement avec projects. Les
droits SQL Electric ne portent pas sur projects ni sa configuration privée.

La lecture ouvre project.env sans suivre de lien, vérifie type/taille/liens,
accepte les seules affectations littérales sur une ligne et ignore les clés
inconnues. Les doublons et interpolations ne sont jamais évalués. Une liste
fermée couvre PROJECT_NAME, PROJECT_VERSION, PROJECT_TYPE et les suffixes
BASE_URL, OWNER, REPOSITORY, NAME, BRANCH, SSL_VERIFY des familles
REMOTE_FORGEJO_, REMOTE_GITHUB_, REMOTE_GITLAB_. Les URL doivent être HTTP(S),
sans userinfo, requête ni fragment. Les secrets et valeurs incertaines sont
écartés avant toute persistance. PROJECT_ID conserve son traitement existant.

L'accueil utilise d'abord le catalogue en base, puis demande une relecture
authentifiée et s'abonne à la seule ligne publique du projet via Electric.
La surveillance inotify existante est étendue aux événements project.env,
y compris remplacement atomique et suppression, avec rattrapage périodique.
Les écritures SQL sont transactionnelles et uniquement en cas de différence.
Une erreur de lecture vide les valeurs devenues non vérifiables, indique
l'état et conserve le nom enregistré comme repli de création.

Migration additive réversible : aucun RUN, session ou lien n'est réécrit.
Le retour arrière retire d’abord la table publique de la publication sous
administration PostgreSQL, puis revient à la migration précédente, perdant seulement
l'instantané régénérable. La production reste activée par le paquet DIU.
