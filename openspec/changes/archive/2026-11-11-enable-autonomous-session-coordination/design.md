# Conception

Réutiliser SQLite et les avis existants. Une liaison explicite identifie le codeur
opérateur et l’identité de stockage historique ; celle-ci reste une provenance,
sans droit de publication concurrent pour l’ancien propriétaire.
Le broker transmet les demandes par la passerelle Unix existante, dont le pair
est contrôlé par le noyau et corrélé au broker actif ; le magasin reste privé au
contrôleur. Les identités métier sont recoupées avec le RUN et l’appel natif exact.
Les avis portent leur stade, leur source et une empreinte de preuve vérifiable.
Les envois ont une intention durable, un accusé distinct et une réconciliation
sans rejeu après réponse perdue. Les pauses explicites restent prioritaires.
Les commandes autonomes acquièrent l’ensemble de leurs chemins à la frontière
d’exécution : aucun verrou partiel pendant une attente de dépendance.
Les anciens mandats sans adoption conservent leur profil. Pas d’élargissement
interprojets ou interhôtes ; l’IPC inter-UID n’expose pas la base SQLite.

## Exécution externe incluse par validation du développeur

Un profil SSH générique est attaché une fois au mandat initial ou à une exception
approuvée. Il désigne un banc conteneur déjà HELD ; les credentials restent locaux
et la clé hôte est vérifiée strictement. Le broker copie les seuls artefacts
autorisés puis transmet une commande argv au runner conteneur, par IPC contrôlé.
Le journal local et le journal distant enregistrent l’intention avant effet. Une
réponse perdue se réconcilie par status, sans réexécuter la commande ; un effet
incertain conserve le bail et interdit la soumission finale. Les travaux locaux
indépendants restent possibles. Nettoyage puis vérification réussie sont requis
pour restituer un banc utilisé. Les reçus complets sont liés à la révision source
et à la revue finale ; aucun test unavailable n’est accepté comme passed.

La fermeture de déploiement comprend désormais plus de 128 fichiers : le journal
CABU accepte jusqu’à 256 entrées, chacune conservant les mêmes contrôles de chemin,
empreinte, groupe et mode. Les scénarios de reprise vérifient ce paquet complet.
