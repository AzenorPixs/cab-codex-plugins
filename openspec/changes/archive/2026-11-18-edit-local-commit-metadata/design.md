# Édition locale protégée

Réutiliser les helpers Git de CAB, le verrou PostgreSQL commun et les contrôles
d'accès administrateur/CSRF. Prévisualiser HEAD, branche et empreinte des tags.
Reconstruire les objets de commit en conservant leurs arbres et l'identité du committer ;
modifier uniquement les champs demandés et les parents devenus nécessaires.
Conserver les fusions ; les commits ou tags signés à réécrire sont refusés.

Déplacer branche et tags dans une transaction Git unique avec anciens OID
attendus. Un reçu durable dans Configuration, identifié par project/request_id,
empêche une seconde exécution après réponse perdue. UNKNOWN interdit le rejeu.
Le message et la description du tag sont deux champs distincts. En cas de
plusieurs tags, choisir celui à éditer ; les autres conservent leur nom et texte.
Un nom vide supprime le tag choisi ; une description seule requiert un nom.

Le détail reste dans son overview. À sa fermeture, actualiser l'historique parent
sans le fermer. Garder les lignes d'historique fraîches après la réécriture.

La date éditée est celle du commit affichée dans l'historique (committer).
Conserver la date initiale de l'auteur. Les dialogues de détail sont montés
séparément dans le document pour préserver la fenêtre parente et le retour à
la ligne du formulaire. Attendre la fin de l'actualisation avant de le fermer.

L'accès Tag ouvre directement ce composant avec le tag cliqué présélectionné.
Depuis Dernier commit, l'éditeur est un second dialogue ; le détail reste ouvert.
Le sélecteur des tags est toujours présent, même si seul Créer un nouveau tag
est disponible. Les champs sont partagés avec le formulaire de création.

La création conserve ses étapes existantes et sa console. Préremplir l'identité
du projet et la date locale au moment de l'ouverture. Les nouveaux paramètres
API sont facultatifs pour les anciens clients ; une description de tag explicite
reste distincte du message de commit. Un auteur saisi s'applique à ce commit
sans remplacer l'identité configurée du projet. La date choisie sert aux dates
d'auteur et de committer du nouveau commit ; les edits conservent leur parcours.
