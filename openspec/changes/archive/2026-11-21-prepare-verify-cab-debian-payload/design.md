# Conception

Le constructeur reconnaît le contenu CAB à la destination du manifeste dans
la recette. La préparation s’exécute avec l’identité POSIX du projet et
construit les ressources dans un répertoire temporaire. Les dépendances
verrouillées déjà préparées sont les seules entrées générées réutilisées.

La version demandée est vérifiée avant compilation. Le manifeste contient les
empreintes des arborescences Python et Web ainsi que les empreintes des
archives de dépendances. Le contrôle Debian est comparé à la version embarquée
et les empreintes sont recalculées à la lecture du paquet. La publication
contrôle le même descripteur que celui utilisé pour transmettre l’artefact.
